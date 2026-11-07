import { BaseMgr } from '../../Common/BaseMgr';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { Tools } from '../../Common/Tools';
import { ConfigMgr } from '../../Config/ConfigMgr';
import type { RewardItem } from '../../Config/ConfigTools';
import { ITreasureScoreData } from '../../Config/Typings/TreasureScoreData';
import { BagMgr } from '../Bag/BagMgr';

/** 一次开箱的结果。结算窗用这份数据画奖励和积分 */
export interface TreasureBoxOpenResult {
    boxId: number;
    openCount: number;
    rewards: RewardItem[];
}

/**
 * 宝箱玩法数据。积分和已领档位先存在本地。
 * 协议还没有，开箱（c_use_item）和领积分奖励（c_receive_treasure_box_score_reward）
 * 先本地模拟，服务器接上后替换 openBox / receiveScoreReward 的内部实现。
 * 正式的掉落抽取、扣箱发奖、积分和领奖校验由服务器统一结算，客户端按回包同步并展示。
 */
export class TreasureBoxMgr extends BaseMgr {
    private score = 0;
    /** 已领取的积分奖励 id */
    private claimedRewards = new Set<number>();
    private sortedScoreRewards: ITreasureScoreData[] | null = null;

    public getScore(): number {
        return this.score;
    }

    /** 积分奖励按 sort 排序，配置加载后第一次用时缓存 */
    public getScoreRewards(): ITreasureScoreData[] {
        if (!this.sortedScoreRewards) {
            this.sortedScoreRewards = Array.from(ConfigMgr.instance.TreasureScoreData.values())
                .sort((a, b) => (a.sort ?? a.id) - (b.sort ?? b.id));
        }
        return this.sortedScoreRewards;
    }

    /** 当前积分档位：第一个没领的。都领完返回 undefined */
    public getCurrentScoreReward(): ITreasureScoreData | undefined {
        return this.getScoreRewards().find(row => !this.claimedRewards.has(row.id));
    }

    public canPickScoreReward(): boolean {
        const cur = this.getCurrentScoreReward();
        return !!cur && this.score >= (cur.need_score ?? 0);
    }

    /** 领取当前积分奖励。没档位或分不够返回 null */
    public receiveScoreReward(): RewardItem | null {
        const cur = this.getCurrentScoreReward();
        if (!cur || cur.reward == null || this.score < (cur.need_score ?? 0)) {
            return null;
        }
        const reward: RewardItem = { item_id: cur.reward, count: 1 };
        if (!BagMgr.getInstance().applyBagTransaction([], [], [reward])) {
            return null;
        }
        this.claimedRewards.add(cur.id);
        EventManager.Instance.dispatch(GameEvent.Update_Treasure_Box);
        return reward;
    }

    /** 一次最多开多少。参数表 box_open_times 的第一项，表里没有就按 10 */
    public maxOpenOnce(): number {
        const row = ConfigMgr.instance.ParamData.get('box_open_times');
        const max = row?.parm?.[0];
        if (max == null || max <= 0) {
            return 10;
        }
        return max;
    }

    /** 这种宝箱这次能开几个：持有量和单次上限里较小的那个 */
    public getOpenCount(itemId: number): number {
        const owned = BagMgr.getInstance().getCount(itemId);
        if (owned <= 0) {
            return 0;
        }
        const max = this.maxOpenOnce();
        return owned < max ? owned : max;
    }

    /**
     * 开箱。一次开 getOpenCount 个，不是把持有的全开掉。
     * 没有宝箱可开返回 null。
     */
    public openBox(boxId: number): TreasureBoxOpenResult | null {
        const cfg = ConfigMgr.instance.TreasureData.get(boxId);
        if (!cfg || cfg.item_id == null) {
            return null;
        }
        const bag = BagMgr.getInstance();
        const count = this.getOpenCount(cfg.item_id);
        if (count <= 0) {
            return null;
        }

        const merged = new Map<number, number>();
        const grant = (itemId: number, num: number) => {
            if (num > 0) {
                merged.set(itemId, (merged.get(itemId) ?? 0) + num);
            }
        };
        for (let i = 0; i < count; i++) {
            // extra_item 是 [item_id, count] 成对的必得奖励
            const extra = cfg.extra_item ?? [];
            for (let j = 0; j + 1 < extra.length; j += 2) {
                grant(extra[j], extra[j + 1]);
            }
            for (const groupId of cfg.output ?? []) {
                for (const item of this.rollLocalDropRewards(groupId)) {
                    grant(item.item_id, item.count);
                }
            }
        }
        const rewards: RewardItem[] = Array.from(merged, ([item_id, count]) => ({ item_id, count }));
        if (!bag.applyBagTransaction([], [{ item_id: cfg.item_id, count }], rewards)) {
            return null;
        }
        this.score += (cfg.score ?? 0) * count;
        EventManager.Instance.dispatch(GameEvent.Update_Treasure_Box);
        return {
            boxId,
            openCount: count,
            rewards,
        };
    }

    /** 仅供未接协议时本地模拟开箱；接入后删除此方法，奖励直接使用服务器回包。 */
    private rollLocalDropRewards(group_id: number): RewardItem[] {
        const group = ConfigMgr.instance.DropDataIndex.group_dict[group_id];
        if (!group) {
            throw new Error(`掉落表没有这个组：${group_id}`);
        }
        const rows = Object.keys(group).map(Number).sort((a, b) => a - b)
            .map(drop_id => ConfigMgr.instance.DropData.get(drop_id))
            .filter(row => row != null);
        if (rows.some(row => row.drop_type !== 1)) {
            throw new Error(`掉落组 ${group_id} 不是权重掉落组`);
        }
        const draw_count = rows[0].draws_times;
        if (!Number.isSafeInteger(draw_count) || draw_count < 0) {
            throw new Error(`掉落组 ${group_id} 的抽取次数无效`);
        }
        let candidates = rows.filter(row => row.item != null && row.weight > 0)
            .map(row => ({ item_id: row.item, count: row.num ?? 0, weight: row.weight }));
        const rewards: RewardItem[] = [];
        for (let draw_index = 0; draw_index < draw_count && candidates.length > 0; draw_index++) {
            const picked = Tools.getRandomForWeight(candidates);
            rewards.push({ item_id: picked.item_id, count: picked.count });
            if (!rows[0].repeat) {
                candidates = candidates.filter(item => item.item_id !== picked.item_id);
            }
        }
        return rewards;
    }
}
