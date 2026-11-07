import { BaseMgr } from '../../Common/BaseMgr';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { lang } from '../../Common/LangMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { IMarketGoodsData } from '../../Config/Typings/MarketGoodsData';
import { IMarketSlotData } from '../../Config/Typings/MarketSlotData';
import { BagMgr } from '../Bag/BagMgr';
import { HallMgr } from '../Hall/HallMgr';

/**
 * 集市建筑类型 id。
 * 0 表示还没指定：若等级表里只有一栋建筑写了 day_shop_cost，就用那栋。
 * 对不上时不显示建筑折扣。
 */
/** 集市建筑。等级表里带 day_shop_cost 的是建筑 5 */
export const MARKET_BUILD_ID = 5;

/** 程序多语言。集市句子从 188 起 */
export const ShopLang = {
    shortMoney: 188,
    soldOut: 189,
    locked: 190,
    noRefresh: 191,
    refreshed: 192,
    discount: 193,
    owned: 194,
    unlock: 195,
    limit: 196,
    refreshIn: 197,
    free: 198,
    dayTime: 199,
} as const;

/** 每天 0 点、每周一 0 点、每月 1 日 0 点 */
const REFRESH_DAILY = 1;
const REFRESH_WEEKLY = 2;
const REFRESH_MONTHLY = 3;

export interface ShopSlotView {
    market_id: string;
    slot_id: string;
    locked: boolean;
    unlock_level: number;
    goods_id: string | null;
    buy_count: number;
}

export interface ShopRefreshInfo {
    show_time: boolean;
    left_ms: number;
    can_refresh: boolean;
    cost_item: number;
    cost_count: number;
}

interface SlotRoll {
    goods_id: string | null;
    buy_count: number;
    /** 解锁后抽过一次。空池子不再每帧重抽 */
    rolled: boolean;
}

interface MarketRuntime {
    period_key: string;
    refresh_count: number;
    slots: Map<string, SlotRoll>;
}

/**
 * 集市。商品、购买次数和刷新次数先记在本地。
 * 协议来了之后只换购买、刷新和全量同步。
 * 当前为本地模拟；正式扣费、发奖和次数由服务器统一结算，客户端按回包同步。
 */
export class ShopMgr extends BaseMgr {
    private states = new Map<string, MarketRuntime>();
    private build_warned = false;

    /** 当前商店格子。到了自动刷新点会重抽 */
    public getSlots(market_id: string): ShopSlotView[] {
        const state = this.ensure(market_id);
        const level = this.marketLevel();
        const views: ShopSlotView[] = [];
        for (const slot of this.slotsOf(market_id)) {
            const locked = this.isLocked(slot, level);
            let roll = state.slots.get(slot.id);
            if (!roll || (!locked && roll.goods_id == null)) {
                roll = {
                    goods_id: locked ? null : this.pick(slot, market_id, level),
                    buy_count: roll?.buy_count ?? 0,
                    rolled: !locked,
                };
                state.slots.set(slot.id, roll);
            }
            const goods_id = locked ? null : roll.goods_id;
            const goods = goods_id ? ConfigMgr.instance.MarketGoodsData.get(goods_id) : undefined;
            // 没商品又不锁，格子上图标、名字、价格全是关的，不占一格
            if (!locked && !goods) {
                continue;
            }
            views.push({
                market_id,
                slot_id: slot.id,
                locked,
                unlock_level: slot.unlock_level ?? 0,
                goods_id,
                buy_count: roll.buy_count,
            });
        }
        return views;
    }

    /** 这一格还能买几次。没有限购时按 1 次处理，直接买，不弹数量窗 */
    public remain(market_id: string, slot_id: string): number {
        const view = this.slotView(market_id, slot_id);
        if (!view || view.locked || !view.goods_id) {
            return 0;
        }
        const goods = ConfigMgr.instance.MarketGoodsData.get(view.goods_id);
        if (!goods || goods.limit_times == null) {
            return 1;
        }
        return Math.max(0, goods.limit_times - view.buy_count);
    }

    public getPrice(market_id: string, goods_id: string): number {
        const goods = ConfigMgr.instance.MarketGoodsData.get(goods_id);
        if (!goods || goods.is_free) {
            return 0;
        }
        let price = Math.ceil((goods.base_price ?? 0) * (goods.price_rate ?? 1));
        const market = ConfigMgr.instance.MarketTypeData.get(market_id);
        if (market?.use_building_discount) {
            price = Math.ceil(price * (1 - this.buildingReduce()));
        }
        return price;
    }

    /** 顶栏货币：刷新道具在前，再按格子顺序补上商品货币 */
    public currencyIds(market_id: string): number[] {
        const ids: number[] = [];
        const seen = new Set<number>();
        const add = (item_id: number | undefined) => {
            if (item_id == null || item_id <= 0 || seen.has(item_id)) {
                return;
            }
            seen.add(item_id);
            ids.push(item_id);
        };
        add(ConfigMgr.instance.MarketTypeData.get(market_id)?.refresh_item);
        for (const slot of this.getSlots(market_id)) {
            if (!slot.goods_id) {
                continue;
            }
            add(ConfigMgr.instance.MarketGoodsData.get(slot.goods_id)?.cost_item);
        }
        return ids;
    }

    /** 有建筑折扣时返回文案，没有就空串 */
    public discountText(market_id: string): string {
        const market = ConfigMgr.instance.MarketTypeData.get(market_id);
        if (!market?.use_building_discount) {
            return '';
        }
        const reduce = this.buildingReduce();
        if (reduce <= 0) {
            return '';
        }
        const percent = Math.round(reduce * 100);
        return lang(ShopLang.discount, { level: this.marketLevel() ?? 0, percent });
    }

    public getRefreshInfo(market_id: string): ShopRefreshInfo {
        const state = this.ensure(market_id);
        const market = ConfigMgr.instance.MarketTypeData.get(market_id);
        const next_at = this.nextRefreshAt(market?.auto_refresh, Date.now());
        const costs = market?.refresh_cost;
        const can_refresh = !!costs && state.refresh_count < costs.length;
        return {
            show_time: next_at != null,
            left_ms: next_at == null ? 0 : Math.max(0, next_at - Date.now()),
            can_refresh,
            cost_item: market?.refresh_item ?? 0,
            cost_count: can_refresh && costs ? costs[state.refresh_count] : 0,
        };
    }

    /** 有字就是没买成 */
    public tryBuy(market_id: string, slot_id: string, count: number): string {
        if (count < 1) {
            return '';
        }
        if (this.rollIfNewPeriod(market_id)) {
            EventManager.Instance.dispatch(GameEvent.Update_Shop);
            return lang(ShopLang.refreshed);
        }
        const view = this.slotView(market_id, slot_id);
        const roll = this.states.get(market_id)?.slots.get(slot_id);
        if (!view || !roll) {
            return '';
        }
        if (view.locked) {
            return lang(ShopLang.locked);
        }
        if (!view.goods_id) {
            return lang(ShopLang.soldOut);
        }
        const goods = ConfigMgr.instance.MarketGoodsData.get(view.goods_id);
        if (!goods?.sell_item?.length) {
            return lang(ShopLang.soldOut);
        }
        if (goods.limit_times != null && roll.buy_count + count > goods.limit_times) {
            return lang(ShopLang.soldOut);
        }
        const price = this.getPrice(market_id, goods.id);
        const total = price * count;
        const sell_count = goods.sell_item[1] ?? 1;
        const costs = total > 0 ? [{ item_id: goods.cost_item ?? 0, count: total }] : [];
        if (!BagMgr.getInstance().applyBagTransaction([], costs,
            [{ item_id: goods.sell_item[0], count: sell_count * count }])) {
            return lang(ShopLang.shortMoney);
        }
        roll.buy_count += count;
        EventManager.Instance.dispatch(GameEvent.Update_Shop);
        return '';
    }

    /** 有字就是没刷新成 */
    public tryRefresh(market_id: string): string {
        if (this.rollIfNewPeriod(market_id)) {
            EventManager.Instance.dispatch(GameEvent.Update_Shop);
            return lang(ShopLang.refreshed);
        }
        const info = this.getRefreshInfo(market_id);
        if (!info.can_refresh) {
            return lang(ShopLang.noRefresh);
        }
        if (info.cost_count > 0 && !BagMgr.getInstance().applyBagTransaction([], [{ item_id: info.cost_item, count: info.cost_count }])) {
            return lang(ShopLang.shortMoney);
        }
        const state = this.ensure(market_id);
        state.refresh_count += 1;
        this.reroll(market_id, state);
        EventManager.Instance.dispatch(GameEvent.Update_Shop);
        return '';
    }

    /**
     * 跨过自动刷新点就重抽。
     * 返回 true 表示这次确实换了新的一轮。
     */
    public touch(market_id: string): boolean {
        return this.rollIfNewPeriod(market_id);
    }

    private slotView(market_id: string, slot_id: string): ShopSlotView | undefined {
        return this.getSlots(market_id).find(slot => slot.slot_id === slot_id);
    }

    private ensure(market_id: string): MarketRuntime {
        this.rollIfNewPeriod(market_id);
        const state = this.states.get(market_id);
        if (!state) {
            throw new Error(`集市状态没有建出来：${market_id}`);
        }
        return state;
    }

    private rollIfNewPeriod(market_id: string): boolean {
        const key = this.periodKey(market_id, Date.now());
        const state = this.states.get(market_id);
        if (!state) {
            this.rebuild(market_id, key);
            return false;
        }
        if (state.period_key === key) {
            return false;
        }
        this.rebuild(market_id, key);
        return true;
    }

    private rebuild(market_id: string, period_key: string): void {
        const state: MarketRuntime = {
            period_key,
            refresh_count: 0,
            slots: new Map(),
        };
        this.reroll(market_id, state);
        this.states.set(market_id, state);
    }

    private reroll(market_id: string, state: MarketRuntime): void {
        const level = this.marketLevel();
        for (const slot of this.slotsOf(market_id)) {
            const locked = this.isLocked(slot, level);
            state.slots.set(slot.id, {
                goods_id: locked ? null : this.pick(slot, market_id, level),
                buy_count: 0,
                rolled: !locked,
            });
        }
    }

    private slotsOf(market_id: string): IMarketSlotData[] {
        const dict = ConfigMgr.instance.MarketSlotDataIndex?.market_type_dict?.[market_id];
        const list: IMarketSlotData[] = [];
        if (!dict) {
            return list;
        }
        for (const slot_id of Object.keys(dict)) {
            const slot = ConfigMgr.instance.MarketSlotData.get(slot_id);
            if (!slot || slot.is_close) {
                continue;
            }
            list.push(slot);
        }
        list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id.localeCompare(b.id));
        return list;
    }

    private isLocked(slot: IMarketSlotData, level: number): boolean {
        if (slot.unlock_level == null) {
            return false;
        }
        return slot.unlock_level > level;
    }

    private pick(slot: IMarketSlotData, market_id: string, level: number): string | null {
        return this.pickWeighted(this.candidates(slot, market_id, level));
    }

    private candidates(slot: IMarketSlotData, market_id: string, level: number): IMarketGoodsData[] {
        const group = slot.goods_group;
        if (typeof group === 'string') {
            const goods = ConfigMgr.instance.MarketGoodsData.get(group);
            return goods && this.goodsOpen(goods, market_id, level) ? [goods] : [];
        }
        if (typeof group !== 'number') {
            return [];
        }
        const list: IMarketGoodsData[] = [];
        for (const goods_id of this.groupGoodsIds(group)) {
            const goods = ConfigMgr.instance.MarketGoodsData.get(goods_id);
            if (goods && this.goodsOpen(goods, market_id, level)) {
                list.push(goods);
            }
        }
        return list;
    }

    private groupGoodsIds(group_id: number): string[] {
        const group = ConfigMgr.instance.MarketGoodsDataIndex?.group_dict?.[group_id];
        if (!group) {
            return [];
        }
        return Object.keys(group);
    }

    private goodsOpen(goods: IMarketGoodsData, market_id: string, level: number): boolean {
        if (goods.is_close) {
            return false;
        }
        if (goods.market_type_id && goods.market_type_id !== market_id) {
            return false;
        }
        return this.goodsReachLevel(goods, level);
    }

    private pickWeighted(list: IMarketGoodsData[]): string | null {
        if (list.length === 0) {
            return null;
        }
        let total = 0;
        for (const row of list) {
            total += row.weight ?? 1;
        }
        if (total <= 0) {
            return list[0].id;
        }
        let roll = Math.random() * total;
        for (const row of list) {
            roll -= row.weight ?? 1;
            if (roll <= 0) {
                return row.id;
            }
        }
        return list[list.length - 1].id;
    }

    private periodKey(market_id: string, now: number): string {
        const kind = ConfigMgr.instance.MarketTypeData.get(market_id)?.auto_refresh;
        const date = new Date(now);
        if (kind === REFRESH_DAILY) {
            return `d-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        }
        if (kind === REFRESH_WEEKLY) {
            const monday = this.weekStart(date);
            return `w-${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
        }
        if (kind === REFRESH_MONTHLY) {
            return `m-${date.getFullYear()}-${date.getMonth()}`;
        }
        return 'none';
    }

    private nextRefreshAt(kind: number | undefined, now: number): number | null {
        const date = new Date(now);
        if (kind === REFRESH_DAILY) {
            const next = new Date(date);
            next.setHours(24, 0, 0, 0);
            return next.getTime();
        }
        if (kind === REFRESH_WEEKLY) {
            const next = this.weekStart(date);
            next.setDate(next.getDate() + 7);
            return next.getTime();
        }
        if (kind === REFRESH_MONTHLY) {
            return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
        }
        return null;
    }

    /** 本周一 0 点。周日算上一周 */
    private weekStart(date: Date): Date {
        const monday = new Date(date);
        monday.setHours(0, 0, 0, 0);
        const day = monday.getDay();
        const back = day === 0 ? 6 : day - 1;
        monday.setDate(monday.getDate() - back);
        return monday;
    }

    /**
     * market_level 是建筑等级表的行 id，不是等级数字。
     * 5001 是集市 1 级，5002 是 2 级。当前等级不够就不出这件商品。
     */
    private goodsReachLevel(goods: IMarketGoodsData, level: number): boolean {
        if (goods.market_level == null) {
            return true;
        }
        const row = ConfigMgr.instance.BuildLevelData.get(goods.market_level);
        if (!row || row.level == null) {
            return true;
        }
        return level >= row.level;
    }

    /** 集市当前等级，读议事厅记录。没有这栋建筑时是 0 */
    private marketLevel(): number {
        const build_id = this.marketBuildId();
        if (build_id == null) {
            return 0;
        }
        return HallMgr.getInstance().getBuildingLevel(build_id);
    }

    private buildingReduce(): number {
        const build_id = this.marketBuildId();
        const level = this.marketLevel();
        if (build_id == null) {
            return 0;
        }
        for (const row of ConfigMgr.instance.BuildLevelData.values()) {
            if (row.build_id === build_id && row.level === level && row.day_shop_cost != null) {
                return row.day_shop_cost;
            }
        }
        return 0;
    }

    private marketBuildId(): number | null {
        if (MARKET_BUILD_ID > 0) {
            return MARKET_BUILD_ID;
        }
        let found: number | null = null;
        for (const row of ConfigMgr.instance.BuildLevelData.values()) {
            if (row.day_shop_cost == null || row.build_id == null) {
                continue;
            }
            if (found == null) {
                found = row.build_id;
                continue;
            }
            if (found !== row.build_id) {
                this.warnBuild();
                return null;
            }
        }
        if (found == null) {
            this.warnBuild();
        }
        return found;
    }

    private warnBuild(): void {
        if (this.build_warned) {
            return;
        }
        this.build_warned = true;
        console.warn('集市建筑 id 未配置，建筑折扣不显示。确认后把 ShopMgr 的 MARKET_BUILD_ID 改成建筑类型 id');
    }
}
