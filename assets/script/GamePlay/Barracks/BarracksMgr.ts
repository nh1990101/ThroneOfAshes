import { lang } from '../../Common/LangMgr';
import { BaseMgr } from '../../Common/BaseMgr';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { TimerMgr } from '../../Common/TimerMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { IBarracksRecruitData } from '../../Config/Typings/BarracksRecruitData';
import { UIMananger } from '../../Component/UIMananger';
import { BagCost, BagMgr } from '../Bag/BagMgr';
import { HallMgr } from '../Hall/HallMgr';
import { SoldierMgr } from '../Soldier/SoldierMgr';

/** 程序多语言。兵营新句子从 226 起，和表里已有句子重复的沿用原 id */
export const BarracksLang = {
    unlockedCount: 226,
    recruitingCount: 227,
    locked: 57,
    needBarracksLevel: 228,
    command: 229,
    atk: 23,
    def: 24,
    hp: 22,
    speed: 230,
    timePerUnit: 231,
    timeTotal: 232,
    lackResource: 112,
    lackDiamond: 233,
    missingUnit: 234,
    alreadyRecruiting: 235,
    badQuantity: 236,
    noTask: 237,
    invalidSpeedupItem: 238,
    lackSpeedupItem: 239,
    recruitTitle: 240,
    speedupTitle: 241,
    finished: 242,
    speedupEffect: 243,
    batchNote: 244,
} as const;

// ==================== 数据视图 ====================

/** 招募任务。每个兵种同时最多一个 */
export interface BarracksTask {
    quantity: number;
    startAt: number;
    finishAt: number;
}

/** 兵种列表/弹窗共用的一行数据 */
export interface BarracksUnitView {
    /** BarracksRecruitData.id */
    recruitId: number;
    /** UnitData.id */
    unitId: number;
    name: string;
    /** 士兵养成等级，读士兵卡片 */
    level: number;
    /** 当前拥有数量，本地数据 */
    owned: number;
    /** 统御 */
    command: number;
    atk: number;
    def: number;
    hp: number;
    speed: number;
    /** 单兵消耗。同一物品已合并，数量为 0 的不在里面 */
    costs: BagCost[];
    /** 单兵耗时秒数 */
    timePerUnit: number;
    unlocked: boolean;
    /** 解锁需要的兵营等级。配置对不上时是 0，界面只显示未解锁 */
    unlockLevel: number;
    /** 进行中任务的剩余秒数，没有在招为 0 */
    leftSeconds: number;
    taskQuantity: number;
}

/** 当前背包内可用于招募加速的道具。时间单位为分钟。 */
export interface RecruitSpeedupItemView {
    item_id: number;
    name: string;
    count: number;
    time_minutes: number;
}

const BARRACKS_BUILD_ID = 3;
const DIAMOND_ITEM_ID = 1001;
const RECRUIT_SPEEDUP_ITEM_TYPE = 1500;
const MILLISECONDS_PER_MINUTE = 60000;
const MAX_QUANTITY = 999;
/** 玩家阵营，先固定 1。服务端给玩家阵营后放开过滤 */
const PLAYER_FACTION = 1;
/** 本地演示初始拥有数量，按单位 id。接协议后删掉 */
const DEMO_OWNED: Record<number, number> = {
    110010: 20,
    110020: 12,
    110030: 6,
    110040: 3,
    110050: 1,
};

/**
 * 兵营招募。消耗、耗时、解锁读 BarracksRecruitData；
 * 兵营等级读议事厅建筑数据；拥有数和任务记在本地，接协议后换远端同步。
 * 当前扣费和加速仅供本地模拟，正式由服务器校验结算，客户端按回包更新任务状态。
 * 每个兵种各自独立计时。到点由这里入库，不依赖兵营窗口开着。
 */
export class BarracksMgr extends BaseMgr {
    /** unitId -> 拥有数量 */
    private owned_map = new Map<number, number>();
    /** unitId -> 招募任务 */
    private tasks = new Map<number, BarracksTask>();
    private demo_seeded = false;
    /** 最近一个到点任务的倒计时 */
    private settle_timer_id = 0;
    private settle_timer_token = 0;

    /** 兵种列表，按表里的 sort_order 排。只出玩家阵营 */
    public getUnits(): BarracksUnitView[] {
        this.seedDemoOwned();
        return this.factionRows().map(row => this.toView(row));
    }

    public getUnit(unit_id: number): BarracksUnitView | undefined {
        this.seedDemoOwned();
        const row = this.rowOf(unit_id);
        return row ? this.toView(row) : undefined;
    }

    /** 当前兵营等级，读议事厅记录 */
    public getBarracksLevel(): number {
        return HallMgr.getInstance().getBuildingLevel(BARRACKS_BUILD_ID);
    }

    /** 物品名，读物品表 */
    public getItemName(item_id: number): string {
        const name = ConfigMgr.instance.ItemData.get(item_id)?.name;
        return name != null ? lang(name) : '';
    }

    /** 玩家资源够买几组单兵消耗，封顶 MAX_QUANTITY。同一物品按合计算 */
    public getMaxAffordable(unit_id: number): number {
        const view = this.getUnit(unit_id);
        if (!view) {
            return 0;
        }
        let max_count = MAX_QUANTITY;
        for (const cost of view.costs) {
            if (cost.count <= 0) {
                continue;
            }
            const count = Math.floor(BagMgr.getInstance().getCount(cost.item_id) / cost.count);
            max_count = Math.min(max_count, count);
        }
        return Math.max(0, max_count);
    }

    /** 当前数量下，合并后的消耗是否都够 */
    public canAfford(unit_id: number, quantity: number): boolean {
        const view = this.getUnit(unit_id);
        const count = Math.floor(quantity);
        if (!view || !Number.isSafeInteger(count) || count <= 0) {
            return false;
        }
        return this.enoughFor(view.costs, count);
    }

    /**
     * 开始招募。校验未解锁/已在招/数量/资源，全过才扣资源建任务。
     * 成功返回空字符串，失败返回提示文案。
     */
    public beginRecruit(unit_id: number, quantity: number): string {
        const view = this.getUnit(unit_id);
        if (!view) {
            return lang(BarracksLang.missingUnit);
        }
        if (!view.unlocked) {
            return lang(BarracksLang.locked);
        }
        if (this.tasks.has(unit_id)) {
            return lang(BarracksLang.alreadyRecruiting);
        }
        const count = Math.floor(quantity);
        if (!Number.isSafeInteger(count) || count <= 0 || count > MAX_QUANTITY) {
            return lang(BarracksLang.badQuantity);
        }
        if (!this.enoughFor(view.costs, count)) {
            return lang(BarracksLang.lackResource);
        }
        const costs = view.costs.map(cost => ({ item_id: cost.item_id, count: cost.count * count }));
        if (!BagMgr.getInstance().applyBagTransaction([], costs)) {
            return lang(BarracksLang.lackResource);
        }
        const now = Date.now();
        const duration_ms = view.timePerUnit * count * 1000;
        this.tasks.set(unit_id, { quantity: count, startAt: now, finishAt: now + duration_ms });
        this.syncSettleTimer();
        return '';
    }

    /** 到点的任务结算入库，并通知界面刷新。没到点返回空数组 */
    public settle(): string[] {
        const now = Date.now();
        const done: string[] = [];
        let changed = false;
        for (const [unit_id, task] of this.tasks) {
            if (now < task.finishAt) {
                continue;
            }
            this.tasks.delete(unit_id);
            changed = true;
            const next = (this.owned_map.get(unit_id) ?? 0) + task.quantity;
            this.owned_map.set(unit_id, next);
            const view = this.getUnit(unit_id);
            if (view) {
                done.push(lang(BarracksLang.finished, { name: view.name, count: task.quantity }));
            }
        }
        if (!changed) {
            return done;
        }
        for (const text of done) {
            UIMananger.instance.showFlyNotice(text);
        }
        EventManager.Instance.dispatch(GameEvent.Update_Barracks);
        return done;
    }

    public hasTask(unit_id: number): boolean {
        return this.tasks.has(unit_id);
    }

    /** 剩余秒数取整。真实倒计时用 leftRealSeconds 对齐结束时间 */
    public leftSeconds(unit_id: number): number {
        return Math.ceil(this.leftRealSeconds(unit_id));
    }

    public leftRealSeconds(unit_id: number): number {
        const task = this.tasks.get(unit_id);
        if (!task) {
            return 0;
        }
        return Math.max(0, (task.finishAt - Date.now()) / 1000);
    }

    /** 任务总时长秒数，算进度用 */
    public taskDuration(unit_id: number): number {
        const view = this.getUnit(unit_id);
        const task = this.tasks.get(unit_id);
        if (!view || !task) {
            return 0;
        }
        return view.timePerUnit * task.quantity;
    }

    /** 立即完成的钻石价：每剩余分钟 1 钻，不足 1 分钟按 1 钻。已经到点不收费 */
    public finishPrice(unit_id: number): number {
        const left = this.leftSeconds(unit_id);
        if (left <= 0) {
            return 0;
        }
        return Math.ceil(left / 60);
    }

    /** 钻石立即完成。到点不扣钻。失败返回提示文案 */
    public finishNow(unit_id: number): string {
        const task = this.tasks.get(unit_id);
        if (!task) {
            return lang(BarracksLang.noTask);
        }
        const price = this.finishPrice(unit_id);
        if (price > 0 && !BagMgr.getInstance().applyBagTransaction([], [{ item_id: DIAMOND_ITEM_ID, count: price }])) {
            return lang(BarracksLang.lackDiamond);
        }
        task.finishAt = Date.now();
        this.syncSettleTimer();
        return '';
    }

    public getRecruitSpeedupItems(): RecruitSpeedupItemView[] {
        const items: RecruitSpeedupItemView[] = [];
        const bag = BagMgr.getInstance();
        for (const cfg of ConfigMgr.instance.ItemData.values()) {
            if (cfg.type !== RECRUIT_SPEEDUP_ITEM_TYPE) {
                continue;
            }
            const count = bag.getCount(cfg.id);
            if (count <= 0) {
                continue;
            }
            if (!Number.isFinite(cfg.time) || cfg.time <= 0) {
                throw new Error(`招募加速道具 ${cfg.id} 的 time 必须是正数分钟`);
            }
            items.push({
                item_id: cfg.id,
                name: this.getItemName(cfg.id),
                count,
                time_minutes: cfg.time,
            });
        }
        return items;
    }

    /** 每次消耗一个道具；达到完成时间后沿用任务结算入库。 */
    public useRecruitSpeedupItem(unit_id: number, item_id: number): string {
        const task = this.tasks.get(unit_id);
        if (!task) {
            return lang(BarracksLang.noTask);
        }
        const now = Date.now();
        if (task.finishAt <= now) {
            this.syncSettleTimer();
            return lang(BarracksLang.noTask);
        }
        const cfg = ConfigMgr.instance.ItemData.get(item_id);
        if (!cfg || cfg.type !== RECRUIT_SPEEDUP_ITEM_TYPE || !Number.isFinite(cfg.time) || cfg.time <= 0) {
            return lang(BarracksLang.invalidSpeedupItem);
        }
        const finish_at = Math.max(now, task.finishAt - cfg.time * MILLISECONDS_PER_MINUTE);
        if (!BagMgr.getInstance().consumeItem(item_id, 1)) {
            return lang(BarracksLang.lackSpeedupItem);
        }
        task.finishAt = finish_at;
        this.syncSettleTimer();
        if (this.tasks.has(unit_id)) {
            EventManager.Instance.dispatch(GameEvent.Update_Barracks);
        }
        return '';
    }

    public toView(row: IBarracksRecruitData): BarracksUnitView {
        const unit_id = row.unit_id ?? 0;
        const unit = ConfigMgr.instance.UnitData.get(unit_id);
        const attr = unit?.unit_attr != null ? ConfigMgr.instance.UnitAttrData.get(unit.unit_attr) : undefined;
        const soldier_id = this.soldierIdOf(unit_id);
        const level = this.soldierLevel(soldier_id);
        let atk = attr?.atk ?? 0;
        let def = attr?.def ?? 0;
        let hp = attr?.hp ?? 0;
        let speed = Math.floor(attr?.speed ?? 0);
        if (soldier_id != null) {
            const grown = SoldierMgr.getInstance().getAttrs(soldier_id, level);
            atk = grown.atk;
            def = grown.def;
            hp = grown.hp;
            speed = grown.speed;
        }
        const unlock_level = this.unlockLevelOf(row);
        const task = this.tasks.get(unit_id);
        return {
            recruitId: row.id,
            unitId: unit_id,
            name: unit?.name != null ? lang(unit.name) : '',
            level,
            owned: this.owned_map.get(unit_id) ?? 0,
            command: attr?.command ?? 0,
            atk,
            def,
            hp,
            speed,
            costs: mergeCosts(row.need_item, row.item_count),
            timePerUnit: row.recruit_time ?? 0,
            unlocked: unlock_level != null && this.getBarracksLevel() >= unlock_level,
            unlockLevel: unlock_level ?? 0,
            leftSeconds: task ? this.leftSeconds(unit_id) : 0,
            taskQuantity: task ? task.quantity : 0,
        };
    }

    private enoughFor(costs: BagCost[], count: number): boolean {
        for (const cost of costs) {
            const need = cost.count * count;
            if (!Number.isSafeInteger(need) || !BagMgr.getInstance().isEnough(cost.item_id, need)) {
                return false;
            }
        }
        return true;
    }

    /** 最近一个任务还要多少秒。没有任务返回空。已经到点是负数或 0 */
    private nearestLeftSeconds(): number | null {
        if (this.tasks.size === 0) {
            return null;
        }
        const now = Date.now();
        let nearest = Infinity;
        for (const task of this.tasks.values()) {
            const left = (task.finishAt - now) / 1000;
            if (left < nearest) {
                nearest = left;
            }
        }
        return nearest;
    }

    /** 到点的招募入库，并给还没结束的任务续上计时。窗口开关都不影响 */
    public syncRecruitFinish(): void {
        this.syncSettleTimer();
    }

    /** 挂到最近一个结束时间。已经到点的先入库，再给剩下的任务重挂 */
    private syncSettleTimer(): void {
        const left = this.nearestLeftSeconds();
        if (left == null || left <= 0) {
            this.stopSettleTimer();
            if (left != null && left <= 0) {
                this.settle();
                this.syncSettleTimer();
            }
            return;
        }
        const timer_mgr = TimerMgr.getInstance();
        if (this.settle_timer_id) {
            const remaining = timer_mgr.getRealCountdownRemaining(this.settle_timer_id);
            if (remaining >= 0 && Math.abs(remaining - left) < 0.05) {
                return;
            }
            this.stopSettleTimer();
        }
        const token = ++this.settle_timer_token;
        this.settle_timer_id = timer_mgr.addRealCountdown(left, () => this.onSettleTimer(token));
    }

    private onSettleTimer(token: number): void {
        if (token !== this.settle_timer_token) {
            return;
        }
        this.settle_timer_id = 0;
        this.settle();
        this.syncSettleTimer();
    }

    private stopSettleTimer(): void {
        if (!this.settle_timer_id) {
            return;
        }
        TimerMgr.getInstance().removeRealCountdown(this.settle_timer_id);
        this.settle_timer_id = 0;
        this.settle_timer_token += 1;
    }

    private rowOf(unit_id: number): IBarracksRecruitData | undefined {
        for (const row of ConfigMgr.instance.BarracksRecruitData.values()) {
            if (row.unit_id === unit_id) {
                return row;
            }
        }
        return undefined;
    }

    /** unlock_build_level 必须是兵营的 BuildLevelData 行，转成行里的等级。对不上就不解锁 */
    private unlockLevelOf(row: IBarracksRecruitData): number | undefined {
        if (row.unlock_build_level == null) {
            return undefined;
        }
        const level_row = ConfigMgr.instance.BuildLevelData.get(row.unlock_build_level);
        if (level_row == null || level_row.build_id !== BARRACKS_BUILD_ID || level_row.level == null) {
            return undefined;
        }
        return level_row.level;
    }

    /** 单位 id 对到士兵表那一行。没有对应士兵时返回空 */
    private soldierIdOf(unit_id: number): number | undefined {
        for (const row of ConfigMgr.instance.SoldierData.values()) {
            if (row.unit_id === unit_id) {
                return row.id;
            }
        }
        return undefined;
    }

    /** 士兵养成等级读士兵卡片。没有士兵或没有卡片按 1 级 */
    private soldierLevel(soldier_id: number | undefined): number {
        if (soldier_id == null) {
            return 1;
        }
        const card = SoldierMgr.getInstance().getSoldiers().find(soldier => soldier.id === soldier_id);
        if (card == null) {
            return 1;
        }
        return card.level;
    }

    /** 玩家阵营的招募行，按 sort_order 排 */
    private factionRows(): IBarracksRecruitData[] {
        const rows: IBarracksRecruitData[] = [];
        for (const row of ConfigMgr.instance.BarracksRecruitData.values()) {
            if (row.faction_type === PLAYER_FACTION) {
                rows.push(row);
            }
        }
        rows.sort((a, b) => (a.sort_order ?? a.id) - (b.sort_order ?? b.id));
        return rows;
    }

    /** 本地演示初始数量，只填一次。表还没到时不记成已经填过 */
    private seedDemoOwned(): void {
        if (this.demo_seeded) {
            return;
        }
        const rows = this.factionRows();
        if (rows.length === 0) {
            return;
        }
        this.demo_seeded = true;
        for (const row of rows) {
            if (row.unit_id == null) {
                continue;
            }
            const owned = DEMO_OWNED[row.unit_id] ?? 0;
            if (owned > 0) {
                this.owned_map.set(row.unit_id, owned);
            }
        }
    }
}

/** 同一物品加总。数量不是正整数，或物品和数量对不齐的，不算进消耗 */
function mergeCosts(items: readonly number[] | undefined, counts: readonly number[] | undefined): BagCost[] {
    const totals = new Map<number, number>();
    const item_list = items ?? [];
    const count_list = counts ?? [];
    const size = Math.min(item_list.length, count_list.length);
    for (let i = 0; i < size; i++) {
        const count = count_list[i];
        if (!Number.isSafeInteger(count) || count <= 0) {
            continue;
        }
        const item_id = item_list[i];
        totals.set(item_id, (totals.get(item_id) ?? 0) + count);
    }
    const costs: BagCost[] = [];
    for (const [item_id, count] of totals) {
        costs.push({ item_id, count });
    }
    return costs;
}

/** hh:mm:ss */
export function formatTime(seconds: number): string {
    const total = Math.max(0, Math.ceil(seconds));
    const hour = Math.floor(total / 3600);
    const minute = Math.floor((total % 3600) / 60);
    const second = total % 60;
    return [hour, minute, second].map(value => value < 10 ? `0${value}` : String(value)).join(':');
}
