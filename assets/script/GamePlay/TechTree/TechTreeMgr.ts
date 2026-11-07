import { BaseMgr } from '../../Common/BaseMgr';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { lang } from '../../Common/LangMgr';
import { TimerMgr } from '../../Common/TimerMgr';
import { Tools } from '../../Common/Tools';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { ITechBattleData } from '../../Config/Typings/TechBattleData';
import { ITechLevelData } from '../../Config/Typings/TechLevelData';
import { ITechOutputData } from '../../Config/Typings/TechOutputData';
import { BagCost, BagMgr } from '../Bag/BagMgr';
import { HallLang, HallMgr } from '../Hall/HallMgr';

export type TechNodeStatus = 'locked' | 'ready' | 'short' | 'busy' | 'research' | 'max';

/** 建筑类型表里的魔法塔 */
const MAGIC_TOWER_BUILD_ID = 2;

export interface TechTypeTab {
    id: number;
    name: string;
}

export interface TechTreeNodeData {
    id: number;
    type_id: number;
    name: string;
    icon?: number;
    row: number;
    sort: number;
    level: number;
    status: TechNodeStatus;
    countdown: string;
    /** 前置和材料都满足、当前没有研究时，节点上显示可升级 */
    show_up: boolean;
    selected: boolean;
}

export interface TechEffectView {
    label: string;
    current: string;
    next: string;
}

export interface TechReqView {
    name: string;
    met: boolean;
    value: string;
}

export interface TechCostView {
    name: string;
    icon?: number;
    need: number;
    owned_text: string;
    short: boolean;
}

export interface TechDetail {
    name: string;
    type_name: string;
    desc: string;
    icon?: number;
    level: number;
    show_next: boolean;
    status: TechNodeStatus;
    status_text: string;
    effects: TechEffectView[];
    reqs: TechReqView[];
    costs: TechCostView[];
    show_reqs: boolean;
    show_costs: boolean;
    time_caption: string;
    time_text: string;
    note: string;
    button_text: string;
    button_enabled: boolean;
    show_button: boolean;
    show_meter: boolean;
    progress: number;
    show_queue: boolean;
}

export interface TechResearchClock {
    time_text: string;
    progress: number;
}

interface Bonus {
    key: string;
    label: string;
    rate: number;
}

interface TechJob {
    tech_id: number;
    duration: number;
    end: number;
}

/** 程序多语言 CommonLangData。科技树界面新加的句子从 44 起 */
export const TechLang = {
    title: 44,
    scene: 45,
    scrollCue: 46,
    back: 47,
    help: 48,
    researchEffect: 49,
    currentEffect: 50,
    current: 51,
    next: 52,
    reqHead: 53,
    costHead: 54,
    maxReached: 55,
    research: 56,
    locked: 57,
    short: 58,
    busy: 59,
    ready: 60,
    researching: 61,
    maxLevel: 62,
    noteReady: 63,
    noteLocked: 64,
    noteShort: 65,
    noteBusy: 66,
    timeLeft: 67,
    timeCost: 68,
    met: 69,
    currentLevel: 70,
    level: 71,
    badgeMax: 72,
    badgeResearch: 73,
    lock: 74,
    view: 75,
    atk: 76,
    def: 77,
    hp: 78,
    intelligence: 79,
    command: 80,
    speed: 81,
    output: 82,
    finished: 83,
} as const;

const ATTR_LANG: Record<string, number> = {
    base_atk: TechLang.atk,
    base_def: TechLang.def,
    base_hp: TechLang.hp,
    base_intelligence: TechLang.intelligence,
    base_command: TechLang.command,
    base_speed: TechLang.speed,
};

/** 科技树。等级和研究队列记在本地。研究开始时扣材料，到点结算不依赖界面是否打开。 */
export class TechTreeMgr extends BaseMgr {
    private levels = new Map<number, number>();
    private job: TechJob | null = null;
    private research_timer = 0;
    private pending_notice = '';
    private indexed = false;
    private bonus_ready = false;
    private level_rows = new Map<number, ITechLevelData[]>();
    private output_by_level = new Map<number, ITechOutputData[]>();
    private battle_by_level = new Map<number, ITechBattleData[]>();
    private max_level = new Map<number, number>();
    private output_rate = new Map<number, number>();
    /** 单位类型 -> 属性 id -> 加成比例 */
    private battle_rate = new Map<number, Map<string, number>>();
    /** 没有列出单位类型的范围，对全部单位生效 */
    private battle_rate_all = new Map<string, number>();

    /** 魔法塔等级达到分类表要求的页签 */
    public getTechTypes(): TechTypeTab[] {
        this.ensureIndex();
        const tower_level = this.getMagicTowerLevel();
        const list = Array.from(ConfigMgr.instance.TechTypeData.values());
        list.sort((a, b) => a.id - b.id);
        const open_list: TechTypeTab[] = [];
        for (const row of list) {
            if ((row.need_build_level ?? 0) > tower_level) {
                continue;
            }
            open_list.push({ id: row.id, name: row.name != null ? lang(row.name) : '' });
        }
        return open_list;
    }

    /** 配置还没到时允许打开。表到了但魔法塔等级不够时，主城按钮不要进界面 */
    public hasOpenTechType(): boolean {
        if (ConfigMgr.instance.TechTypeData.size === 0) {
            return true;
        }
        return this.getTechTypes().length > 0;
    }

    public getTechLockedNotice(): string {
        const build = ConfigMgr.instance.BuildTypeData.get(MAGIC_TOWER_BUILD_ID);
        const name = build?.name != null ? lang(build.name) : '';
        let need_level = 0;
        for (const row of ConfigMgr.instance.TechTypeData.values()) {
            const level = row.need_build_level ?? 0;
            if (need_level === 0 || (level > 0 && level < need_level)) {
                need_level = level;
            }
        }
        return lang(HallLang.needBuilding, { name, lv: need_level });
    }

    public getTechNodes(type_id: number): TechTreeNodeData[] {
        this.settleTechResearch();
        this.ensureIndex();
        const nodes: TechTreeNodeData[] = [];
        for (const row of ConfigMgr.instance.MagicTechData.values()) {
            if (row.type_id !== type_id) {
                continue;
            }
            nodes.push(this.toNodeData(row.id, false));
        }
        nodes.sort((a, b) => a.row - b.row || a.sort - b.sort || a.id - b.id);
        return nodes;
    }

    public getTechNode(tech_id: number, selected: boolean): TechTreeNodeData {
        this.settleTechResearch();
        this.ensureIndex();
        return this.toNodeData(tech_id, selected);
    }

    public getAllTechIds(): number[] {
        this.ensureIndex();
        return Array.from(ConfigMgr.instance.MagicTechData.keys());
    }

    /** 顶栏要显示的消耗道具，按科技等级表里第一次出现的顺序 */
    public getTechCostItemIds(): number[] {
        this.ensureIndex();
        const ids: number[] = [];
        const rows = Array.from(ConfigMgr.instance.TechLevelData.values());
        rows.sort((a, b) => a.id - b.id);
        for (const row of rows) {
            const items = row.need_item ?? [];
            for (const item_id of items) {
                if (ids.indexOf(item_id) < 0) {
                    ids.push(item_id);
                }
            }
        }
        return ids;
    }

    public getTechDetail(tech_id: number): TechDetail {
        this.settleTechResearch();
        this.ensureIndex();
        const tech = ConfigMgr.instance.MagicTechData.get(tech_id);
        const type_name = this.typeName(tech.type_id);
        const level = this.getTechLevel(tech_id);
        const max = this.max_level.get(tech_id) ?? 0;
        const status = this.statusOf(tech_id);
        const show_next = status !== 'max';
        const next_level = Math.min(max, level + 1);
        const effects = this.effectsOf(tech_id, level, show_next ? next_level : level);
        const reqs = this.reqsOf(tech_id);
        const costs = show_next && status !== 'research' && status !== 'locked' ? this.costsOf(tech_id, next_level) : [];
        const researching = status === 'research';
        const time_seconds = researching ? this.getResearchLeftSeconds() : this.researchTime(tech_id, next_level);
        let button_text = lang(TechLang.research);
        let note = lang(TechLang.noteReady);
        if (status === 'locked') {
            button_text = lang(TechLang.locked);
            note = lang(TechLang.noteLocked);
        } else if (status === 'short') {
            button_text = lang(TechLang.short);
            note = lang(TechLang.noteShort);
        } else if (status === 'busy') {
            button_text = lang(TechLang.busy);
            note = lang(TechLang.noteBusy, { name: this.techName(this.job.tech_id) });
        }
        return {
            name: this.techName(tech_id),
            type_name,
            desc: tech.desc != null ? lang(tech.desc) : '',
            icon: tech.icon,
            level,
            show_next,
            status,
            status_text: this.statusText(status),
            effects,
            reqs,
            costs,
            show_reqs: status === 'locked',
            show_costs: costs.length > 0,
            time_caption: lang(researching ? TechLang.timeLeft : TechLang.timeCost),
            time_text: formatTime(time_seconds),
            note,
            button_text,
            button_enabled: status === 'ready',
            show_button: status !== 'research' && status !== 'max',
            show_meter: researching,
            progress: this.researchProgress(),
            show_queue: status === 'busy',
        };
    }

    /** 界面每秒只读剩余时间和进度 */
    public getResearchClock(): TechResearchClock {
        return {
            time_text: this.getResearchCountdownText(),
            progress: this.researchProgress(),
        };
    }

    /** 校验通过后扣材料并开始研究。失败返回 false */
    public beginTechResearch(tech_id: number): boolean {
        this.settleTechResearch();
        if (this.statusOf(tech_id) !== 'ready') {
            return false;
        }
        const level = this.getTechLevel(tech_id);
        const row = this.levelRow(tech_id, level + 1);
        if (!row) {
            return false;
        }
        const costs = this.costList(row);
        if (!BagMgr.getInstance().applyBagTransaction([], costs)) {
            return false;
        }
        const duration = row.research_time ?? 0;
        this.job = { tech_id, duration, end: Date.now() + duration * 1000 };
        if (duration <= 0) {
            this.settleTechResearch();
            return true;
        }
        this.armResearchTimer();
        EventManager.Instance.dispatch(GameEvent.Update_Tech_Tree);
        return true;
    }

    public getResearchTechId(): number {
        return this.job ? this.job.tech_id : 0;
    }

    public getTechTypeId(tech_id: number): number {
        const tech = ConfigMgr.instance.MagicTechData.get(tech_id);
        if (!tech) {
            throw new Error(`科技不存在：${tech_id}`);
        }
        return tech.type_id ?? 0;
    }

    /** 到点就升级。返回飘字文案，没完成则空字符串。界面关着也会结算 */
    public settleTechResearch(): string {
        if (!this.job || Date.now() < this.job.end) {
            return '';
        }
        this.clearResearchTimer();
        const tech_id = this.job.tech_id;
        const level = this.getTechLevel(tech_id) + 1;
        this.levels.set(tech_id, level);
        this.job = null;
        this.bonus_ready = false;
        const text = lang(TechLang.finished, { name: this.techName(tech_id), level });
        this.pending_notice = text;
        EventManager.Instance.dispatch(GameEvent.Update_Tech_Tree);
        return text;
    }

    public takeTechNotice(): string {
        const text = this.pending_notice;
        this.pending_notice = '';
        return text;
    }

    public getResearchCountdownText(): string {
        if (!this.job) {
            return '';
        }
        return formatTime(this.getResearchLeftSeconds());
    }

    public getResearchLeftSeconds(): number {
        return Math.ceil(this.getResearchLeftRealSeconds());
    }

    /** 距研究结束的秒数，不取整。真实倒计时用这个对齐结束时间 */
    public getResearchLeftRealSeconds(): number {
        if (!this.job) {
            return 0;
        }
        return Math.max(0, (this.job.end - Date.now()) / 1000);
    }

    /** 当前等级对该产物的加成比例，0.1 表示 +10% */
    public getTechOutputRate(item_id: number): number {
        this.settleTechResearch();
        this.ensureBonus();
        return this.output_rate.get(item_id) ?? 0;
    }

    public applyTechOutputCount(item_id: number | undefined, count: number): number {
        const base = count ?? 0;
        if (item_id == null) {
            return base;
        }
        const rate = this.getTechOutputRate(item_id);
        if (rate === 0) {
            return base;
        }
        return Math.floor(base * (1 + rate));
    }

    /** 己方单位的某条战斗属性乘上科技加成。没有加成时原样返回 */
    public scaleTechAttr(value: number, unit_type: number, attr_id: string): number {
        const rate = this.getTechBattleRate(unit_type, attr_id);
        if (rate === 0) {
            return value;
        }
        return Math.floor(value * (1 + rate));
    }

    private getTechBattleRate(unit_type: number, attr_id: string): number {
        this.settleTechResearch();
        this.ensureBonus();
        const scoped = this.battle_rate.get(unit_type)?.get(attr_id) ?? 0;
        const all = this.battle_rate_all.get(attr_id) ?? 0;
        return scoped + all;
    }

    private getMagicTowerLevel(): number {
        return HallMgr.getInstance().getBuildingLevel(MAGIC_TOWER_BUILD_ID);
    }

    private armResearchTimer(): void {
        this.clearResearchTimer();
        if (!this.job) {
            return;
        }
        const left = this.getResearchLeftRealSeconds();
        if (left <= 0) {
            this.settleTechResearch();
            return;
        }
        this.research_timer = TimerMgr.getInstance().addRealCountdown(left, this.onResearchTimerDone, this);
    }

    private onResearchTimerDone(): void {
        this.research_timer = 0;
        this.settleTechResearch();
    }

    private clearResearchTimer(): void {
        if (!this.research_timer) {
            return;
        }
        TimerMgr.getInstance().removeRealCountdown(this.research_timer);
        this.research_timer = 0;
    }

    private researchProgress(): number {
        if (!this.job || this.job.duration <= 0) {
            return 0;
        }
        const passed = this.job.duration - this.getResearchLeftRealSeconds();
        const ratio = passed / this.job.duration;
        if (ratio < 0) {
            return 0;
        }
        if (ratio > 1) {
            return 1;
        }
        return ratio;
    }

    private toNodeData(tech_id: number, selected: boolean): TechTreeNodeData {
        const tech = ConfigMgr.instance.MagicTechData.get(tech_id);
        const status = this.statusOf(tech_id);
        return {
            id: tech_id,
            type_id: tech.type_id ?? 0,
            name: this.techName(tech_id),
            icon: tech.icon,
            row: tech.level ?? 1,
            sort: tech.sort ?? tech_id,
            level: this.getTechLevel(tech_id),
            status,
            countdown: status === 'research' ? formatTime(this.getResearchLeftSeconds()) : '',
            show_up: status === 'ready',
            selected,
        };
    }

    private statusOf(tech_id: number): TechNodeStatus {
        if (this.job && this.job.tech_id === tech_id) {
            return 'research';
        }
        const level = this.getTechLevel(tech_id);
        const max = this.max_level.get(tech_id) ?? 0;
        if (level >= max) {
            return 'max';
        }
        if (!this.reqsMet(tech_id)) {
            return 'locked';
        }
        if (!this.enough(tech_id, level + 1)) {
            return 'short';
        }
        if (this.job) {
            return 'busy';
        }
        return 'ready';
    }

    private statusText(status: TechNodeStatus): string {
        switch (status) {
            case 'research':
                return lang(TechLang.researching);
            case 'max':
                return lang(TechLang.maxLevel);
            case 'locked':
                return lang(TechLang.locked);
            case 'short':
                return lang(TechLang.short);
            case 'busy':
                return lang(TechLang.busy);
            default:
                return lang(TechLang.ready);
        }
    }

    private getTechLevel(tech_id: number): number {
        return this.levels.get(tech_id) ?? 0;
    }

    private reqsMet(tech_id: number): boolean {
        const tech = ConfigMgr.instance.MagicTechData.get(tech_id);
        const ids = tech.need_tech_id ?? [];
        const levels = tech.need_tech_level ?? [];
        for (let i = 0; i < ids.length; i++) {
            if (this.getTechLevel(ids[i]) < (levels[i] ?? 1)) {
                return false;
            }
        }
        return true;
    }

    private reqsOf(tech_id: number): TechReqView[] {
        const tech = ConfigMgr.instance.MagicTechData.get(tech_id);
        const ids = tech.need_tech_id ?? [];
        const levels = tech.need_tech_level ?? [];
        const list: TechReqView[] = [];
        for (let i = 0; i < ids.length; i++) {
            const need = levels[i] ?? 1;
            const current = this.getTechLevel(ids[i]);
            const met = current >= need;
            list.push({
                name: `${this.techName(ids[i])} ${lang(TechLang.level, { level: need })}`,
                met,
                value: met ? lang(TechLang.met) : lang(TechLang.currentLevel, { level: current }),
            });
        }
        return list;
    }

    private enough(tech_id: number, level: number): boolean {
        const row = this.levelRow(tech_id, level);
        if (!row) {
            return false;
        }
        const items = row.need_item ?? [];
        const counts = row.item_count ?? [];
        for (let i = 0; i < items.length; i++) {
            if (!BagMgr.getInstance().isEnough(items[i], counts[i] ?? 0)) {
                return false;
            }
        }
        return true;
    }

    private costList(row: ITechLevelData): BagCost[] {
        const items = row.need_item ?? [];
        const counts = row.item_count ?? [];
        const list: BagCost[] = [];
        for (let i = 0; i < items.length; i++) {
            list.push({ item_id: items[i], count: counts[i] ?? 0 });
        }
        return list;
    }

    private costsOf(tech_id: number, level: number): TechCostView[] {
        const row = this.levelRow(tech_id, level);
        if (!row) {
            return [];
        }
        const items = row.need_item ?? [];
        const counts = row.item_count ?? [];
        const list: TechCostView[] = [];
        for (let i = 0; i < items.length; i++) {
            const item_id = items[i];
            const need = counts[i] ?? 0;
            const owned = BagMgr.getInstance().getCount(item_id);
            const item = ConfigMgr.instance.ItemData.get(item_id);
            list.push({
                name: item?.name != null ? lang(item.name) : '',
                icon: item?.icon,
                need,
                owned_text: Tools.getNumberShow(owned),
                short: owned < need,
            });
        }
        return list;
    }

    private effectsOf(tech_id: number, level: number, next_level: number): TechEffectView[] {
        const current = this.bonusAt(tech_id, level);
        const next = this.bonusAt(tech_id, next_level);
        const keys: string[] = [];
        for (const key of next.keys()) {
            keys.push(key);
        }
        for (const key of current.keys()) {
            if (keys.indexOf(key) < 0) {
                keys.push(key);
            }
        }
        const at_max = level >= (this.max_level.get(tech_id) ?? 0);
        return keys.map(key => {
            const now = current.get(key);
            const later = next.get(key);
            const label = (later ?? now).label;
            return {
                label,
                current: formatRate(now ? now.rate : 0),
                next: at_max ? '' : formatRate(later ? later.rate : 0),
            };
        });
    }

    private bonusAt(tech_id: number, level: number): Map<string, Bonus> {
        const map = new Map<string, Bonus>();
        if (level <= 0) {
            return map;
        }
        const row = this.levelRow(tech_id, level);
        if (!row) {
            return map;
        }
        const outputs = this.output_by_level.get(row.id) ?? [];
        for (const output of outputs) {
            const item = output.product_item != null ? ConfigMgr.instance.ItemData.get(output.product_item) : undefined;
            const name = item?.name != null ? lang(item.name) : '';
            const key = `out:${output.product_item}`;
            map.set(key, { key, label: lang(TechLang.output, { name }), rate: output.output_bonus_rate ?? 0 });
        }
        const battles = this.battle_by_level.get(row.id) ?? [];
        for (const battle of battles) {
            const attr_id = battle.fight_attr != null ? (ConfigMgr.instance.FightAttrData.get(battle.fight_attr)?.attr_id ?? '') : '';
            const key = `fight:${battle.unit_scope ?? 0}:${attr_id}`;
            const attr_lang = ATTR_LANG[attr_id];
            const attr_label = attr_lang != null ? lang(attr_lang) : attr_id;
            const scope_label = this.scopeLabel(battle.unit_scope);
            map.set(key, {
                key,
                label: scope_label ? `${attr_label} ${scope_label}` : attr_label,
                rate: battle.attr_bonus_rate ?? 0,
            });
        }
        return map;
    }

    /** 范围里的单位类型。没填类型时返回空，表示全部单位 */
    private scopeUnitTypes(scope_id: number | undefined): number[] {
        if (scope_id == null) {
            return [];
        }
        const scope = ConfigMgr.instance.UnitScopeData.get(scope_id);
        return scope?.unit_types ?? [];
    }

    private scopeLabel(scope_id: number | undefined): string {
        const types = this.scopeUnitTypes(scope_id);
        if (types.length === 0) {
            return '';
        }
        return types.join('/');
    }

    private researchTime(tech_id: number, level: number): number {
        return this.levelRow(tech_id, level)?.research_time ?? 0;
    }

    private levelRow(tech_id: number, level: number): ITechLevelData | undefined {
        const rows = this.level_rows.get(tech_id) ?? [];
        for (const row of rows) {
            if (row.level === level) {
                return row;
            }
        }
        return undefined;
    }

    private techName(tech_id: number): string {
        const tech = ConfigMgr.instance.MagicTechData.get(tech_id);
        return tech?.name != null ? lang(tech.name) : '';
    }

    private typeName(type_id: number | undefined): string {
        if (type_id == null) {
            return '';
        }
        const row = ConfigMgr.instance.TechTypeData.get(type_id);
        return row?.name != null ? lang(row.name) : '';
    }

    private ensureIndex(): void {
        if (this.indexed) {
            return;
        }
        if (ConfigMgr.instance.MagicTechData.size === 0 || ConfigMgr.instance.TechLevelData.size === 0) {
            return;
        }
        this.indexed = true;
        for (const row of ConfigMgr.instance.TechLevelData.values()) {
            const tech_id = row.tech_id ?? 0;
            const list = this.level_rows.get(tech_id);
            if (list) {
                list.push(row);
            } else {
                this.level_rows.set(tech_id, [row]);
            }
            const max = this.max_level.get(tech_id) ?? 0;
            if ((row.level ?? 0) > max) {
                this.max_level.set(tech_id, row.level ?? 0);
            }
        }
        for (const list of this.level_rows.values()) {
            list.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
        }
        for (const row of ConfigMgr.instance.TechOutputData.values()) {
            const key = row.tech_level_id ?? 0;
            const list = this.output_by_level.get(key);
            if (list) {
                list.push(row);
            } else {
                this.output_by_level.set(key, [row]);
            }
        }
        for (const row of ConfigMgr.instance.TechBattleData.values()) {
            const key = row.tech_level_id ?? 0;
            const list = this.battle_by_level.get(key);
            if (list) {
                list.push(row);
            } else {
                this.battle_by_level.set(key, [row]);
            }
        }
    }

    private ensureBonus(): void {
        if (this.bonus_ready) {
            return;
        }
        this.ensureIndex();
        if (!this.indexed) {
            return;
        }
        this.output_rate.clear();
        this.battle_rate.clear();
        this.battle_rate_all.clear();
        this.bonus_ready = true;
        for (const [tech_id, level] of this.levels) {
            if (level <= 0) {
                continue;
            }
            const row = this.levelRow(tech_id, level);
            if (!row) {
                continue;
            }
            for (const output of this.output_by_level.get(row.id) ?? []) {
                const item_id = output.product_item ?? 0;
                this.output_rate.set(item_id, (this.output_rate.get(item_id) ?? 0) + (output.output_bonus_rate ?? 0));
            }
            for (const battle of this.battle_by_level.get(row.id) ?? []) {
                const attr_id = battle.fight_attr != null ? (ConfigMgr.instance.FightAttrData.get(battle.fight_attr)?.attr_id ?? '') : '';
                if (!attr_id) {
                    continue;
                }
                const rate = battle.attr_bonus_rate ?? 0;
                const types = this.scopeUnitTypes(battle.unit_scope);
                if (types.length === 0) {
                    this.battle_rate_all.set(attr_id, (this.battle_rate_all.get(attr_id) ?? 0) + rate);
                    continue;
                }
                for (const unit_type of types) {
                    let attr_map = this.battle_rate.get(unit_type);
                    if (!attr_map) {
                        attr_map = new Map();
                        this.battle_rate.set(unit_type, attr_map);
                    }
                    attr_map.set(attr_id, (attr_map.get(attr_id) ?? 0) + rate);
                }
            }
        }
    }
}

function formatTime(seconds: number): string {
    const s = Math.max(0, Math.ceil(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}

function formatRate(rate: number): string {
    const pct = Math.round(rate * 1000) / 10;
    const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
    return `${pct >= 0 ? '+' : ''}${text}%`;
}
