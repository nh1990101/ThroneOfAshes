import { BaseMgr } from '../../Common/BaseMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { ItemIconData } from '../../Component/ItemIconComp';
import { EventManager } from '../../Common/EventManager';
import { createEquipment, strengthenEquipmentState } from '../Equip/EquipLogic';
import { getEquipmentConfig } from '../Equip/EquipConfig';
import { EQUIPMENT_CHANGED, EquipConsume, EquipInstance } from '../Equip/EquipTypes';
import { GameEvent, ItemType } from '../../Common/GameEnum';

/** 背包里的一条物品，字段和服务器一致，可以直接交给物品图标 */
export interface BagItem extends ItemIconData {
    guid: number;
    item_id: number;
    count: number;
    equip?: EquipInstance;
}

/** 一次检查里的一组消耗。item_id 是物品表 id */
export interface BagCost {
    item_id: number;
    count: number;
}

/**
 * 背包数据。按 guid 存实例，再按物品 id 和背包页做索引。
 * 协议还没有，同步方法先空着。
 */
export class BagMgr extends BaseMgr {
    /** guid -> 物品 */
    private itemDict = new Map<number, BagItem>();
    /** item_id -> 各 guid 数量之和 */
    private itemCountDict = new Map<number, number>();
    /** bag_page -> guid 列表 */
    private pageItemDict = new Map<number, number[]>();
    /** item_id -> guid 列表 */
    private itemIdToGuids = new Map<number, number[]>();

    private nextGuid = 1;
    /** 本地调试数据只填一次。服务端全量同步接上后不再走这里 */
    private localReady = false;

    /** 该配置 id 的总数量，没有则 0 */
    public getCount(item_id: number): number {
        this.ensureLocalItems();
        return this.itemCountDict.get(item_id) ?? 0;
    }

    /** 总数量是否不少于 count */
    public isEnough(item_id: number, count: number): boolean {
        return this.getCount(item_id) >= count;
    }

    /** 多组消耗按物品 id 合并检查。有一组不够就返回 false */
    public isEnoughList(costs: readonly BagCost[]): boolean {
        const total_costs = new Map<number, number>();
        for (const cost of costs) {
            if (!Number.isSafeInteger(cost.count) || cost.count < 0) {
                return false;
            }
            total_costs.set(cost.item_id, (total_costs.get(cost.item_id) ?? 0) + cost.count);
        }
        for (const [item_id, count] of total_costs) {
            if (!this.isEnough(item_id, count)) {
                return false;
            }
        }
        return true;
    }

    public getItem(guid: number): BagItem | undefined {
        this.ensureLocalItems();
        return this.itemDict.get(guid);
    }

    /** 某一页的物品。品质从高到低，同品质按物品 id */
    public getPageItems(pageId: number): BagItem[] {
        this.ensureLocalItems();
        const guids = this.pageItemDict.get(pageId) ?? [];
        const items: BagItem[] = [];
        for (const guid of guids) {
            const item = this.itemDict.get(guid);
            if (item) {
                items.push(item);
            }
        }
        items.sort((a, b) => {
            const qualityA = ConfigMgr.instance.ItemData.get(a.item_id)?.quality ?? 0;
            const qualityB = ConfigMgr.instance.ItemData.get(b.item_id)?.quality ?? 0;
            if (qualityA !== qualityB) {
                return qualityB - qualityA;
            }
            if (a.item_id !== b.item_id) {
                return a.item_id - b.item_id;
            }
            return a.guid - b.guid;
        });
        return items;
    }

    /** TODO 服务端背包全量同步还没有 */
    public syncAll(items: readonly BagItem[]): void {
        const equipment_changed = items.some(item => !!item.equip)
            || Array.from(this.itemDict.values()).some(item => !!item.equip);
        this.localReady = true;
        this.itemDict.clear();
        this.itemCountDict.clear();
        this.pageItemDict.clear();
        this.itemIdToGuids.clear();
        for (const item of items) {
            this.putItem(item);
            this.nextGuid = Math.max(this.nextGuid, item.guid + 1);
        }
        this.dispatchBagChanged(equipment_changed);
    }

    /** TODO 服务端背包单条更新还没有 */
    public syncItem(item: BagItem): void {
        this.ensureLocalItems();
        const previous_item = this.itemDict.get(item.guid);
        this.itemDict.set(item.guid, item);
        this.nextGuid = Math.max(this.nextGuid, item.guid + 1);
        this.rebuildBagIndexes();
        this.dispatchBagChanged(!!item.equip || !!previous_item?.equip);
    }

    /** TODO 服务端背包删除还没有 */
    public syncDelete(guid: number): void {
        this.ensureLocalItems();
        const item = this.itemDict.get(guid);
        if (!item) {
            return;
        }
        this.itemDict.delete(guid);
        this.rebuildBagIndexes();
        this.dispatchBagChanged(!!item.equip);
    }

    public getBagItems(): BagItem[] {
        this.ensureLocalItems();
        return Array.from(this.itemDict.values());
    }

    /** 所有检查通过后一次写入背包；一组消耗失败时不改变任何物品。 */
    public applyBagTransaction(
        consumes: readonly EquipConsume[], costs: readonly BagCost[] = [], rewards: readonly BagCost[] = [],
        equipment_updates: readonly { guid: number; equip: EquipInstance }[] = [],
    ): boolean {
        this.ensureLocalItems();
        const consume_counts = new Map<number, number>();
        for (const consume of consumes) {
            if (!Number.isSafeInteger(consume.count) || consume.count <= 0) {
                return false;
            }
            consume_counts.set(consume.guid, (consume_counts.get(consume.guid) ?? 0) + consume.count);
        }
        for (const cost of costs) {
            if (!Number.isSafeInteger(cost.count) || cost.count < 0) {
                return false;
            }
            let remaining = cost.count;
            for (const guid of this.itemIdToGuids.get(cost.item_id) ?? []) {
                const item = this.itemDict.get(guid);
                const take = Math.min(remaining, item.count - (consume_counts.get(guid) ?? 0));
                if (take > 0) {
                    consume_counts.set(guid, (consume_counts.get(guid) ?? 0) + take);
                    remaining -= take;
                }
                if (remaining === 0) {
                    break;
                }
            }
            if (remaining > 0) {
                return false;
            }
        }
        for (const [guid, count] of consume_counts) {
            const item = this.itemDict.get(guid);
            if (!item || item.count < count) {
                return false;
            }
        }
        for (const update of equipment_updates) {
            const item = this.itemDict.get(update.guid);
            if (!item || !item.equip || (consume_counts.get(update.guid) ?? 0) >= item.count) {
                return false;
            }
        }
        for (const reward of rewards) {
            if (!Number.isSafeInteger(reward.count) || reward.count < 0
                || !ConfigMgr.instance.ItemData.has(reward.item_id)) {
                return false;
            }
        }
        if (consume_counts.size === 0 && equipment_updates.length === 0 && rewards.every(reward => reward.count === 0)) {
            return true;
        }
        const reward_items: BagItem[] = [];
        let next_guid = this.nextGuid;
        for (const reward of rewards) {
            if (reward.count === 0) continue;
            if (ConfigMgr.instance.ItemData.get(reward.item_id).equip_id != null) {
                for (let item_index = 0; item_index < reward.count; item_index++) {
                    reward_items.push({ guid: next_guid++, item_id: reward.item_id, count: 1,
                        equip: createEquipment(reward.item_id, getEquipmentConfig()) });
                }
            } else reward_items.push({ guid: next_guid++, item_id: reward.item_id, count: reward.count });
        }
        let equipment_changed = equipment_updates.length > 0;
        for (const [guid, count] of consume_counts) {
            const item = this.itemDict.get(guid);
            if (item.equip) equipment_changed = true;
            item.count -= count;
            if (item.count === 0) {
                this.itemDict.delete(guid);
            }
        }
        for (const update of equipment_updates) {
            this.itemDict.get(update.guid).equip = update.equip;
        }
        this.nextGuid = next_guid;
        for (const reward of reward_items) {
            this.putItem(reward);
            if (reward.equip) equipment_changed = true;
        }
        this.rebuildBagIndexes();
        this.dispatchBagChanged(equipment_changed);
        return true;
    }

    private dispatchBagChanged(equipment_changed: boolean): void {
        EventManager.Instance.dispatch(GameEvent.BAG_ITEMS_UPDATE);
        if (equipment_changed) {
            EventManager.Instance.dispatch(EQUIPMENT_CHANGED);
        }
    }

    private rebuildBagIndexes(): void {
        const items = Array.from(this.itemDict.values());
        this.itemCountDict.clear();
        this.pageItemDict.clear();
        this.itemIdToGuids.clear();
        for (const item of items) {
            this.putItem(item);
        }
    }

    /**
     * 加一件物品。本地调试期给宝箱发奖用，协议接上后由同步替代。
     * 页签按物品表的 bag_page 或类型归属，和本地填背包同一套规则。
     */
    public addItem(item_id: number, count: number): void {
        if (count <= 0) {
            return;
        }
        this.ensureLocalItems();
        if (!this.applyBagTransaction([], [], [{ item_id, count }])) {
            throw new Error(`背包添加物品失败：${item_id}，数量 ${count}`);
        }
    }

    /** 按物品 id 扣总数量。不够就一组都不扣，返回 false */
    public consumeItem(item_id: number, count: number): boolean {
        if (count <= 0) {
            return true;
        }
        return this.applyBagTransaction([], [{ item_id, count }]);
    }

    /**
     * 协议没有时，用物品表填本地背包。
     * 已填 bag_page 的按表进对应页。没填的按类型归到现有页签，方便把各页和数量都点一遍。
     * 货币、英雄、士兵不进格子。表还没加载完就先不填，下次查询再试。
     */
    private ensureLocalItems(): void {
        if (this.localReady) {
            return;
        }
        if (ConfigMgr.instance.ItemData.size === 0) {
            return;
        }
        this.localReady = true;
        const counts = [1, 3, 18, 99, 256, 999, 10000];
        for (const row of ConfigMgr.instance.ItemData.values()) {
            if (row.type === 100) {
                continue;
            }
            const page = row.bag_page ?? BagMgr.localPageOf(row.type);
            if (page == null) {
                continue;
            }
            if (row.equip_id != null) {
                const config = getEquipmentConfig();
                for (let item_index = 0; item_index < 3; item_index++) {
                    const equip = createEquipment(row.id, config, Math.random,
                        row.quality > 1 ? [2, 3, 5][item_index] : 1);
                    const item: BagItem = { guid: this.nextGuid++, item_id: row.id, count: 1, equip };
                    if (row.quality > 1 && item_index === 0) {
                        const level = equip.pos_id === 3 ? 5 : 2;
                        item.equip = strengthenEquipmentState(item, level, config).equip;
                        item.equip.strength_exp = config.strengths.get(row.quality).need_exp[level - 1];
                        if (equip.pos_id !== 4) {
                            item.equip.hero_uuid = 'local_hero_1';
                        }
                    }
                    if (row.quality > 1 && item_index === 1 && equip.pos_id === 1) {
                        item.equip.hero_uuid = 'local_hero_2';
                    }
                    item.equip.is_locked = row.quality > 1 && item_index === 2 && equip.pos_id === 1;
                    this.putItem(item, page);
                }
                continue;
            }
            for (const count of counts) {
                this.putItem({
                    guid: this.nextGuid++,
                    item_id: row.id,
                    count,
                }, page);
            }
        }
        // 货币在上面的循环里被跳过。1002 金币、1003 木材、1001 钻石、1004 矿石给升级、招募和立即完成用。
        // 1009 英雄经验、1011 突破符石、1010 士兵升级材料不进背包格子，数量够 isEnough 用来测升级。
        const level_up_items: BagCost[] = [
            { item_id: 1009, count: 100000 },
            { item_id: 1002, count: 100000 },
            { item_id: 1003, count: 100000 },
            { item_id: 1001, count: 100000 },
            { item_id: 1004, count: 100000 },
            { item_id: 1011, count: 100000 },
            { item_id: 1010, count: 100000 },
        ];
        for (const cost of level_up_items) {
            this.putItem({
                guid: this.nextGuid++,
                item_id: cost.item_id,
                count: cost.count,
            });
        }
    }

    /**
     * 表里没填背包页时，本地调试按类型放进现有页签。
     * 1 道具，2 装备，3 碎片，4 神器。英雄和士兵不归页。
     */
    private static localPageOf(type: number | undefined): number | undefined {
        switch (type) {
            case ItemType.STUFF:
            case ItemType.EQUIP_STUFF:
            case ItemType.ARTIFACT_STUFF:
            case ItemType.GIFT:
            case ItemType.RAND_GIFT:
            case ItemType.SELECT_GIFT:
                return 1;
            case ItemType.EQUIP:
                return 2;
            case ItemType.HERO_FRAG:
            case ItemType.SOLDIER_FRAG:
            case ItemType.STUFF_FRAG:
                return 3;
            case ItemType.ARTIFACT:
                return 4;
            default:
                return undefined;
        }
    }

    private putItem(item: BagItem, pageOverride?: number): void {
        this.itemDict.set(item.guid, item);
        const prev = this.itemCountDict.get(item.item_id) ?? 0;
        this.itemCountDict.set(item.item_id, prev + item.count);
        const guids = this.itemIdToGuids.get(item.item_id);
        if (guids) {
            guids.push(item.guid);
        } else {
            this.itemIdToGuids.set(item.item_id, [item.guid]);
        }
        const page = pageOverride ?? ConfigMgr.instance.ItemData.get(item.item_id)?.bag_page;
        if (page == null) {
            return;
        }
        const pageGuids = this.pageItemDict.get(page);
        if (pageGuids) {
            pageGuids.push(item.guid);
        } else {
            this.pageItemDict.set(page, [item.guid]);
        }
    }
}
