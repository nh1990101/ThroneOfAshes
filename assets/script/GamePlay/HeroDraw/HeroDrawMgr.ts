import { BaseMgr } from '../../Common/BaseMgr';
import { EventManager } from '../../Common/EventManager';
import { GameEvent, ParamDefined, ParamValueType } from '../../Common/GameEnum';
import { GlobalData } from '../../Common/GlobalData';
import { lang } from '../../Common/LangMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { IDrawPoolData } from '../../Config/Typings/DrawPoolData';
import { IDrawRewardData } from '../../Config/Typings/DrawRewardData';
import { BagMgr } from '../Bag/BagMgr';
import { HeroMgr } from '../Hero/HeroMgr';

/** 一次抽卡的结果。tip 有字就是没抽成 */
export interface HeroDrawOutcome {
    hero_ids: number[];
    /** 和 hero_ids 对齐。图鉴里之前没有的为 true */
    is_new: boolean[];
    tip: string;
}

interface DrawCost {
    item_id: number;
    count: number;
}

/** 程序多语言。全选用已有的 18，抽卡新句子从 165 起 */
export const DrawLang = {
    all: 18,
    pityLeft: 165,
    chooseWish: 166,
    poolClosed: 167,
    poolEmpty: 168,
    freeShort: 169,
    itemShort: 170,
} as const;

/** 单位稀有度表里 SP 的 id */
const SP_RARE_ID = 5;
/** SSR 及以上才能许愿 */
const SSR_RARE_ID = 4;

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const BEIJING_TIME_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1000;

/** 许愿列表里的一条英雄 */
export interface WishHeroItem {
    hero_id: number;
    rare_id: number;
    faction_id: number;
}

/** 每个卡池的本地进度。协议来了由服务器覆盖 */
interface PoolState {
    free_used: number;
    /** 当前这轮免费次数对应的重置点，毫秒 */
    reset_at: number;
    /** 距离上次出保底稀有度已经抽了几次 */
    miss_count: number;
    /** 当前许愿英雄。协议回包走 updateWishData */
    wish_hero_id: number | null;
}

/** 服务器下发的许愿。现在一个卡池一个英雄 */
export interface WishUpdateData {
    pool_id: number;
    hero_id: number | null;
}

/**
 * 酒馆抽卡。免费次数、保底和抽卡结果先存在本地。
 * 抽卡协议还没有，tryDraw 先扣背包再按权重出英雄。协议来了只换 tryDraw。
 */
export class HeroDrawMgr extends BaseMgr {
    private pool_state = new Map<number, PoolState>();
    private reward_by_pool: Map<number, IDrawRewardData[]> | null = null;

    /** 许愿 SP 英雄需要的酒馆等级，参数表 id 5 */
    public wishSpTavernLevel(): number {
        const parm = ConfigMgr.instance.getParam(ParamDefined.WISH_SP_TAVERN_LV, ParamValueType.INT);
        return parm[0];
    }

    /** 酒馆等级低于参数表时，SP 英雄不能许愿 */
    public isSpWishLocked(rare_id: number, tavern_level: number): boolean {
        if (rare_id !== SP_RARE_ID) {
            return false;
        }
        return tavern_level < this.wishSpTavernLevel();
    }

    public getWishHero(pool_id: number): number | null {
        const pool = ConfigMgr.instance.DrawPoolData.get(pool_id);
        if (!pool) {
            return null;
        }
        return this.ensureState(pool).wish_hero_id;
    }

    /**
     * 服务器更新某个卡池的许愿英雄。
     * 选择协议还没有，确认时先调这里，回包来了也走这里。
     */
    public updateWishData(data: WishUpdateData): void {
        const pool = ConfigMgr.instance.DrawPoolData.get(data.pool_id);
        if (!pool) {
            return;
        }
        this.ensureState(pool).wish_hero_id = data.hero_id;
        EventManager.Instance.dispatch(GameEvent.Update_Hero_Draw_Wish, data.pool_id);
    }

    /** 当前卡池里可以许愿的英雄。同一英雄只留一条，稀有度低于 SSR 的不要 */
    public wishHeroes(pool_id: number): WishHeroItem[] {
        const seen = new Set<number>();
        const list: WishHeroItem[] = [];
        for (const row of this.rewardsOf(pool_id)) {
            const hero_id = row.hero_id;
            if (hero_id == null || seen.has(hero_id)) {
                continue;
            }
            const rare_id = this.heroRare(hero_id);
            if (rare_id == null || rare_id < SSR_RARE_ID) {
                continue;
            }
            seen.add(hero_id);
            list.push({
                hero_id,
                rare_id,
                faction_id: this.heroFaction(hero_id) ?? 0,
            });
        }
        list.sort((a, b) => {
            if (a.rare_id !== b.rare_id) {
                return b.rare_id - a.rare_id;
            }
            if (a.faction_id !== b.faction_id) {
                return a.faction_id - b.faction_id;
            }
            return a.hero_id - b.hero_id;
        });
        return list;
    }

    /** 今天还剩几次免费单抽 */
    public getFreeLeft(pool_id: number): number {
        const pool = ConfigMgr.instance.DrawPoolData.get(pool_id);
        if (!pool) {
            return 0;
        }
        const state = this.ensureState(pool);
        const total = pool.daily_free ?? 0;
        const left = total - state.free_used;
        return left > 0 ? left : 0;
    }

    /** 再抽几次保底。没配保底返回 0 */
    public getPityLeft(pool_id: number): number {
        const pool = ConfigMgr.instance.DrawPoolData.get(pool_id);
        if (!pool || !pool.pity_count) {
            return 0;
        }
        const state = this.ensureState(pool);
        const left = pool.pity_count - state.miss_count;
        return left > 0 ? left : 1;
    }

    /**
     * 这次要显示和扣除的消耗。券够用券，不够改用货币。
     * 建筑等级减消耗还没有，先按表里的原价。
     */
    public resolveCost(pool: IDrawPoolData, is_ten: boolean): DrawCost | null {
        const ticket = this.readCost(pool.ticket_cost, is_ten);
        const currency = this.readCost(pool.currency_cost, is_ten);
        const bag = BagMgr.getInstance();
        if (ticket && bag.isEnough(ticket.item_id, ticket.count)) {
            return ticket;
        }
        if (currency) {
            return currency;
        }
        return ticket;
    }

    /**
     * 抽一次或十次。免费只允许单抽。
     * 抽到的英雄先不写入英雄列表。图鉴里没有的记进内存，退出就清空。
     * 抽卡协议还没有，这里先本地扣道具、按权重出英雄。协议来了只换这个方法。
     */
    public tryDraw(pool_id: number, count: number, is_free: boolean): HeroDrawOutcome {
        const pool = ConfigMgr.instance.DrawPoolData.get(pool_id);
        if (!pool || !pool.is_open) {
            return { hero_ids: [], is_new: [], tip: lang(DrawLang.poolClosed) };
        }
        const rows = this.rewardsOf(pool_id);
        if (rows.length === 0) {
            return { hero_ids: [], is_new: [], tip: lang(DrawLang.poolEmpty) };
        }
        const state = this.ensureState(pool);
        if (is_free) {
            if (count !== 1 || this.getFreeLeft(pool_id) < 1) {
                return { hero_ids: [], is_new: [], tip: lang(DrawLang.freeShort) };
            }
        } else {
            const cost = this.resolveCost(pool, count > 1);
            if (!cost || !BagMgr.getInstance().isEnough(cost.item_id, cost.count)) {
                return { hero_ids: [], is_new: [], tip: lang(DrawLang.itemShort) };
            }
        }
        if (is_free) {
            if (count !== 1 || this.getFreeLeft(pool_id) < 1) {
                return { hero_ids: [], is_new: [], tip: lang(DrawLang.freeShort) };
            }
        } else {
            const cost = this.resolveCost(pool, count > 1);
            if (!cost || !BagMgr.getInstance().isEnough(cost.item_id, cost.count)) {
                return { hero_ids: [], is_new: [], tip: lang(DrawLang.itemShort) };
            }
        }

        const hero_ids: number[] = [];
        let miss_count = state.miss_count;
        const use_pity = !!pool.pity_count && pool.pity_quality != null;
        for (let i = 0; i < count; i++) {
            const force = use_pity && miss_count + 1 >= pool.pity_count;
            const hero_id = this.pickHero(rows, force ? pool.pity_quality : undefined);
            hero_ids.push(hero_id);
            if (!use_pity) {
                continue;
            }
            if (this.heroRare(hero_id) === pool.pity_quality) {
                miss_count = 0;
            } else {
                miss_count++;
            }
        }

        if (!is_free) {
            const cost = this.resolveCost(pool, count > 1);
            if (!cost || !BagMgr.getInstance().consumeItem(cost.item_id, cost.count)) {
                return { hero_ids: [], is_new: [], tip: lang(DrawLang.itemShort) };
            }
        } else {
            state.free_used += 1;
        }
        state.miss_count = miss_count;
        const is_new = HeroMgr.getInstance().recordCodexHeroes(hero_ids);
        return { hero_ids, is_new, tip: '' };
    }

    private ensureState(pool: IDrawPoolData): PoolState {
        let state = this.pool_state.get(pool.id);
        if (!state) {
            state = { free_used: 0, reset_at: 0, miss_count: 0, wish_hero_id: null };
            this.pool_state.set(pool.id, state);
        }
        const point = this.resetPoint(GlobalData.serverData.getServerTime(), pool.reset_time ?? 0);
        if (point > state.reset_at) {
            state.free_used = 0;
            state.reset_at = point;
        }
        return state;
    }

    /** reset_time 是北京时间零点起的秒数，返回最近一次已到达的重置点。 */
    private resetPoint(now_ms: number, reset_seconds: number): number {
        const reset_offset_ms = reset_seconds * 1000 - BEIJING_TIME_OFFSET_MILLISECONDS;
        return Math.floor((now_ms - reset_offset_ms) / DAY_MILLISECONDS) * DAY_MILLISECONDS + reset_offset_ms;
    }

    /** ticket_cost、currency_cost：[道具id, 单抽数量, 十抽数量]，十抽缺了就用单抽乘 10 */
    private readCost(cost: number[] | undefined, is_ten: boolean): DrawCost | null {
        if (!cost || cost.length < 2) {
            return null;
        }
        const one_count = cost[1];
        const ten_count = cost.length >= 3 ? cost[2] : one_count * 10;
        return {
            item_id: cost[0],
            count: is_ten ? ten_count : one_count,
        };
    }

    private rewardsOf(pool_id: number): IDrawRewardData[] {
        if (!this.reward_by_pool) {
            this.reward_by_pool = new Map();
            for (const row of ConfigMgr.instance.DrawRewardData.values()) {
                if (row.pool_id == null || row.hero_id == null || !(row.weight > 0)) {
                    continue;
                }
                const list = this.reward_by_pool.get(row.pool_id) ?? [];
                list.push(row);
                this.reward_by_pool.set(row.pool_id, list);
            }
        }
        return this.reward_by_pool.get(pool_id) ?? [];
    }

    /** 指定稀有度没有英雄时，按整池权重抽 */
    private pickHero(rows: readonly IDrawRewardData[], rare: number | undefined): number {
        let list = rows;
        if (rare != null) {
            const matched = rows.filter(row => this.heroRare(row.hero_id) === rare);
            if (matched.length > 0) {
                list = matched;
            }
        }
        let total = 0;
        for (const row of list) {
            total += row.weight ?? 0;
        }
        let roll = Math.random() * total;
        for (const row of list) {
            roll -= row.weight ?? 0;
            if (roll <= 0) {
                return row.hero_id ?? 0;
            }
        }
        return list[list.length - 1].hero_id ?? 0;
    }

    private heroRare(hero_id: number): number | undefined {
        const unit_id = ConfigMgr.instance.HeroData.get(hero_id)?.unit_id;
        if (unit_id == null) {
            return undefined;
        }
        return ConfigMgr.instance.UnitData.get(unit_id)?.rarity_id;
    }

    private heroFaction(hero_id: number): number | undefined {
        const unit_id = ConfigMgr.instance.HeroData.get(hero_id)?.unit_id;
        if (unit_id == null) {
            return undefined;
        }
        return ConfigMgr.instance.UnitData.get(unit_id)?.faction_id;
    }
}
