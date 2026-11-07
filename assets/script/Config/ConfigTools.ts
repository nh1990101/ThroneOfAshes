import { _decorator, Component, Node } from 'cc';
import { IAutoTriggerData } from './Typings/AutoTriggerData';
import { ConfigMgr } from './ConfigMgr';
import { ISelectEventsData } from './Typings/SelectEventsData';
import { ISpecialEventsData } from './Typings/SpecialEventsData';
import { ITransactionEventsData } from './Typings/TransactionEventsData';
import { GlobalData } from '../Common/GlobalData';
import { IDropData } from './Typings/DropData';
import { UIMananger } from '../Component/UIMananger';
import { IItemData } from './Typings/ItemData';
import { Tools } from '../Common/Tools';
import { IUnitAttrData } from './Typings/UnitAttrData';
import { IBASE_PROPERTY, IUNIT_PROPERTY } from '../GamePlay/Battle/BattleMgr';
import { ParamDefined, ParamValueType } from '../Common/GameEnum';
import { ISKILL_TRACK } from '../GamePlay/Battle/SkillMgr';
const { ccclass, property } = _decorator;

/** 掉落类型：随机，按组内权重算概率 */
const DROP_TYPE_RANDOM = 1;
/** 掉落类型：固定，普通礼包必得，不带概率 */
const DROP_TYPE_FIXED = 2;
/** 掉落类型：自选，只用品和数量 */
const DROP_TYPE_SELECT = 3;

/**
 * 展开后的一条奖励，可以直接拿去画物品图标。
 * item_id 是物品表 id，count 是数量。
 * odds 只有随机掉落才有，表示这一条在自己那个掉落组里占的比例，0 到 1。固定奖励没有这个字段。
 */
export interface RewardItem {
    item_id: number;
    count: number;
    odds?: number;
}

/**
 * 一次奖励拆成两份，调用方按自己的界面决定用哪份，或者两份都展示。
 * fixed：一定给的物品，没有概率。
 * drops：可能掉的物品。随机行带 odds，是这一组里的权重占比。
 */
export interface RewardList {
    fixed: RewardItem[];
    drops: RewardItem[];
}

/**获取业务配置工具类 */
export class ConfigTools {
    private _configMgr: ConfigMgr;
    private static _instance: ConfigTools;
    public static get instance() {
        if (!ConfigTools._instance) {
            ConfigTools._instance = new ConfigTools;
        }
        return ConfigTools._instance;
    }
    public get configMgr() {
        if (!this._configMgr) {
            this._configMgr = ConfigMgr.instance;
        }
        return this._configMgr;
    }
    private _AutoTriggerData: Map<string, IAutoTriggerData>;
    private _SelectEventsData: Map<string, ISelectEventsData>;
    private _TransactionEventsData: Map<string, ITransactionEventsData>;
    private _SpecialEventsData: Map<string, ISpecialEventsData>;
    /**
     * 按产出表 id 取出这次会给什么。
     * 返回的 fixed 是必得列表，drops 是随机列表。两边都可能是空的，看这行产出有没有配对应的列。
     * 产出表没有这个 id 会直接报错。
     */
    public getRewardList(outputId: number): RewardList {
        const output = this.configMgr.OutputData.get(outputId);
        if (!output) {
            throw new Error(`产出表没有这个 id：${outputId}`);
        }
        return {
            fixed: this.fixedRewards(output.rewards_name, output.rewards_value),
            drops: this.dropRewards(output.random_rewards),
        };
    }

    private fixedRewards(names: number[] | undefined, values: number[] | undefined): RewardItem[] {
        if (!names || !values) {
            return [];
        }
        const list: RewardItem[] = [];
        const count = names.length < values.length ? names.length : values.length;
        for (let i = 0; i < count; i++) {
            list.push({ item_id: names[i], count: values[i] });
        }
        return list;
    }

    private dropRewards(groups: number[] | undefined): RewardItem[] {
        if (!groups || groups.length === 0) {
            return [];
        }
        const list: RewardItem[] = [];
        for (const groupId of groups) {
            const rows = this.groupDrops(groupId);
            let total = 0;
            for (const row of rows) {
                total += row.weight ?? 0;
            }
            for (const row of rows) {
                if (row.item == null) {
                    continue;
                }
                list.push({
                    item_id: row.item,
                    count: row.num ?? 0,
                    odds: total > 0 ? (row.weight ?? 0) / total : undefined,
                });
            }
        }
        return list;
    }

    /**
     * 按掉落组 id 展开这一组会给什么。
     * drop_type 2 进 fixed，不带概率。
     * drop_type 1 进 drops，概率是这一组里随机行的权重占比。
     * drop_type 3 进 drops，不带概率。
     * 组不存在，或出现不认识的掉落类型，直接报错。
     */
    public getDropRewardList(groupId: number): RewardList {
        const rows = this.groupDrops(groupId);
        const fixed: RewardItem[] = [];
        const drops: RewardItem[] = [];
        let total = 0;
        for (const row of rows) {
            if (row.drop_type === DROP_TYPE_RANDOM) {
                total += row.weight ?? 0;
            }
        }
        for (const row of rows) {
            if (row.item == null) {
                continue;
            }
            if (row.drop_type === DROP_TYPE_FIXED) {
                fixed.push({ item_id: row.item, count: row.num ?? 0 });
            } else if (row.drop_type === DROP_TYPE_RANDOM) {
                drops.push({
                    item_id: row.item,
                    count: row.num ?? 0,
                    odds: total > 0 ? (row.weight ?? 0) / total : undefined,
                });
            } else if (row.drop_type === DROP_TYPE_SELECT) {
                drops.push({ item_id: row.item, count: row.num ?? 0 });
            } else {
                throw new Error(`掉落表组 ${groupId} 有不认识的掉落类型：${row.drop_type}`);
            }
        }
        return { fixed, drops };
    }

    /**通过道具数组获取RewardItem */
    public getRewardListByItemDatas(arrItemdatas: IItemData[]): RewardItem[] {
        if (arrItemdatas && arrItemdatas.length > 0) {
            var arrResult: RewardItem[] = [];
            for (let i = 0; i < arrItemdatas.length; i++) {
                let itemData = arrItemdatas[i];
                if (itemData) {
                    Tools.insertArr(arrResult, { item_id: itemData.id, count: 1 });
                }
            }
            return arrResult;
        }
        return [];
    }
    /**通过道具数组ID获取RewardItem */
    public getRewardListByItemIds(itemIds: number[]): RewardItem[] {
        if (itemIds && itemIds.length > 0) {
            let arrItemDatas = [];
            for (let i = 0; i < itemIds.length; i++) {
                var itemCfg = ConfigMgr.instance.ItemData.get(itemIds[i]);
                if (itemCfg) {
                    Tools.insertArr(arrItemDatas, itemCfg);
                }
            }
            return this.getRewardListByItemDatas(arrItemDatas);

        }
        return [];
    }

    private groupDrops(groupId: number): IDropData[] {
        const index = this.configMgr.DropDataIndex;
        const group = index.group_dict[groupId];
        if (!group) {
            throw new Error(`掉落表没有这个组：${groupId}`);
        }
        const ids = Object.keys(group).map(Number).sort((a, b) => a - b);
        const rows: IDropData[] = [];
        for (const id of ids) {
            const row = this.configMgr.DropData.get(id);
            if (row) {
                rows.push(row);
            }
        }
        return rows;
    }

    public GetWildMapObjectDataByChapterId(resId: number, chapterId: number) {

        var mapResCfg = this.configMgr.MapResourcesData.get(resId);
        if (!mapResCfg) {
            console.log(`获取地图资源配置出错：${resId}`);
            return;
        }
        var interaction_type = mapResCfg.interaction_type;

        switch (interaction_type) {
            case "AutoTriggerData":
                var resultId = this.configMgr.AutoTriggerDataIndex.AutoTriggerSelect[chapterId]?.[resId];
                return resultId && this.configMgr.AutoTriggerData.get(resultId);
            case "SelectEventsData":
                var resultId = this.configMgr.SelectEventsDataIndex.SelectEventsIndex[chapterId]?.[resId];
                return resultId && this.configMgr.SelectEventsData.get(resultId);
            case "TransactionEventsData":
                var resultId = this.configMgr.TransactionEventsDataIndex.TransactionEventsIndex[chapterId]?.[resId];
                return resultId && this.configMgr.TransactionEventsData.get(resultId);
            // case "SpecialEventsData":
            //     return this.SpecialEventsData?.get(`res${resId}_chapter${chapterId}`);
            case "BattleEventsData":
                var mapDataCfg = this.getMapDataByChaper();
                if (mapDataCfg) {

                    var monsterGroupId = mapDataCfg.monster_infos;
                    var monsterAttrId = this.configMgr.MonsterAttrDataIndex.MonsterAttrDataIndex[monsterGroupId]?.[resId];
                    if (monsterAttrId) {
                        return this.configMgr.MonsterAttrData.get(monsterAttrId)
                    } else {
                        UIMananger.instance.showFlyNotice("怪物属性表没有配resources" + resId);
                        return null;
                    }
                }

                break;
            default:
                return null;
        }
    }
    public get AutoTriggerData() {
        if (!this._AutoTriggerData) {
            this._AutoTriggerData = this.initMapResDataConfig(this._AutoTriggerData)
        }
        return this._AutoTriggerData;
    }
    public get SelectEventsData() {
        if (!this._SelectEventsData) {
            this._SelectEventsData = this.initMapResDataConfig(this._SelectEventsData)
        }
        return this._SelectEventsData;
    }
    public get TransactionEventsData() {
        if (!this._TransactionEventsData) {
            this._TransactionEventsData = this.initMapResDataConfig(this._TransactionEventsData)
        }
        return this._TransactionEventsData;
    }
    // public get SpecialEventsData() {
    //     if (!this._SpecialEventsData) {
    //         this._SpecialEventsData = this.initMapResDataConfig(this._SpecialEventsData)
    //     }
    //     return this._TransactionEventsData;
    // }
    // public get BattleEventsData() {
    //     if (!this._BattleEventsData) {
    //         this._BattleEventsData = this.initMapResDataConfig(this._BattleEventsData)
    //     }
    //     return this._TransactionEventsData;
    // }
    private initMapResDataConfig(config: Map<string, any>) {
        const result = new Map<string, any>();
        config.forEach((value, key) => {
            if (value.resources !== undefined && value.chapter_limit !== undefined) {
                result.set(`res${value.resources}_chapter${value.chapter_limit}`, value);
            }
        });
        return result;
    }
    /**根据当前章节获取副本表 */
    public getMapDataByChaper() {
        return this.getStageMapDataByChapterAndOrder(GlobalData.wildData.chapter, GlobalData.wildData.copyIndex);
    }
    /**根据章和节获取副本表 */
    public getStageMapDataByChapterAndOrder(chapter: number, order: number) {
        var MapDataId = this.configMgr.StageDataIndex.StageDataIndex[chapter]?.[order];
        if (MapDataId) {
            var stageCfg = this.configMgr.StageData.get(MapDataId);
            if (stageCfg) {
                var mapDataCfg = this.configMgr.MapData.get(stageCfg.map_id);
                if (mapDataCfg) {
                    return mapDataCfg
                }
            }
        }
        return null;
    }
    /**通过单位ID数组获取单位配置列表 */
    public getUnitDatasByIds(ids: number[]) {
        if (!ids) {
            return [];
        }
        var arr = [];
        for (let i = 0; i < ids.length; i++) {
            var unitCfg = this.configMgr.UnitData.get(ids[i]);
            if (unitCfg) {
                Tools.insertArr(arr, unitCfg);
            }
        }
        return arr;
    }
    /**根据单位ID拿单位属性配置 */
    public getUnitAttrCfgByUnitID(unitId: number) {
        var unitCfg = this.configMgr.UnitData.get(unitId);
        return unitCfg ? this.configMgr.UnitAttrData.get(unitCfg.unit_attr) : null;
    }
    /**根据单位属性ID拿单位配置 */
    public getUnitCfgByUnitAttrId(unitAttrId: number) {
        var unitId = this.configMgr.UnitDataIndex.unit_attr_dict[unitAttrId];
        return this.configMgr.UnitData.get(unitId);
    }
    /**根据等级获取单位属性 */
    public getUnitPropertyByLv(unitAttrCfg: IUnitAttrData, lv: number): IBASE_PROPERTY {
        var lvAttrId = this.configMgr.SoldierLvAttrDataIndex.soldierLvAttrIndex[unitAttrCfg.soldier_level_growth]?.[lv];
        if (lvAttrId) {

            var lvCfg = this.configMgr.SoldierLvAttrData.get(lvAttrId);
            if (lvCfg) {
                return {
                    attack: this.getBasePropertyValue(unitAttrCfg.atk, lvCfg.atk_rate), define: this.getBasePropertyValue(unitAttrCfg.def, lvCfg.def_rate),
                    hp: this.getBasePropertyValue(unitAttrCfg.hp, lvCfg.hp_rate), speed: this.getBasePropertyValue(unitAttrCfg.speed, 1)
                };
            }
        }
    }
    /**根据英雄等级获取英雄属性 */
    public getHeroPropertyByLv(unitAttrCfg: IUnitAttrData, lv: number) {
        var lvAttrId = this.configMgr.HeroLvAttrDataIndex.HeroLvAttrIndex[unitAttrCfg.hero_level_growth]?.[lv];
        if (lvAttrId) {

            var lvCfg = this.configMgr.HeroLvAttrData.get(lvAttrId);
            if (lvCfg) {
                return {
                    attack: this.getBasePropertyValue(unitAttrCfg.atk, lvCfg.atk_rate), define: this.getBasePropertyValue(unitAttrCfg.def, lvCfg.def_rate),
                    hp: this.getBasePropertyValue(unitAttrCfg.hp, 1), speed: this.getBasePropertyValue(unitAttrCfg.speed, 1), intelligence: this.getBasePropertyValue(unitAttrCfg.intelligence, lvCfg.intelligence_rate),
                    command: this.getBasePropertyValue(unitAttrCfg.command, lvCfg.command_rate), move: this.getBasePropertyValue(unitAttrCfg.move, lvCfg.move_rate)
                };
            }
        }
    }
    // 单兵最终属性公式
    public getBasePropertyValue(value: number, rate: number) {
        return value * rate >> 0;
    }
    /**两属性相加 */
    public AddProperty(curPro: IUNIT_PROPERTY, targetPro: IUNIT_PROPERTY) {
        return {
            attack: curPro.attack + targetPro.attack, define: curPro.define + targetPro.define, hp: curPro.hp + targetPro.hp, speed: curPro.speed + targetPro.speed,
            intelligence: curPro.speed + targetPro.speed, command: curPro.speed + targetPro.speed
        }
    }
    /**属性乘法 */
    public MutiplyProperty(pro: IBASE_PROPERTY, rate: number) {
        return { attack: pro.attack * rate, define: pro.define * rate, hp: pro.hp * rate, speed: pro.speed * rate, }
        // intelligence: pro.intelligence * rate, command: pro.command * rate, move: pro.move * rate }

    }
    public getSkillTrackById(tracks: ISKILL_TRACK[], id: string) {
        for (let i = 0; i < tracks.length; i++) {
            if (tracks[i].id == id) {
                return tracks[i]
            }
        }
        return null;
    }
    /**根据等级获取技能配置 */
    public getSkillCfgByLevel(skillGroupId: number, lv: number = 1) {
        const skillDataId = ConfigMgr.instance.SkillDataIndex.level_group[skillGroupId]?.[lv];
        if (!skillDataId) {
            throw new Error(`未找到单位攻击技能：${skillGroupId}`);
        }
        const skillCfg = ConfigMgr.instance.SkillData.get(skillDataId);
        if (!skillCfg) {
            throw new Error(`未找到技能配置：${skillDataId}`);
        }
        return skillCfg;
    }
}


