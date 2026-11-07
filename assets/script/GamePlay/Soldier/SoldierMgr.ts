import { lang } from '../../Common/LangMgr';
import { BaseMgr } from '../../Common/BaseMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { ISoldierLvAttrData } from '../../Config/Typings/SoldierLvAttrData';
import { BagCost, BagMgr } from '../Bag/BagMgr';
import { TechTreeMgr } from '../TechTree/TechTreeMgr';

/** 一个士兵。等级先存在本地，协议还没有 */
export interface SoldierCardData {
    /** SoldierData.id */
    id: number;
    level: number;
}

/** 当前等级的生命、攻击、防御、先攻。战力是前三项的和 */
export interface SoldierAttrs {
    hp: number;
    atk: number;
    def: number;
    speed: number;
    score: number;
}

/**
 * 士兵数据。没有养成协议，等级记在本地，属性按表现算。
 * 对照本仓库英雄列表：先有一份可升级的本地数据，再交给界面显示。
 */
export class SoldierMgr extends BaseMgr {
    private soldiers: SoldierCardData[] = [];
    private localReady = false;
    private indexReady = false;
    /** group_id -> level_id -> 系数行 */
    private lvAttrByGroup = new Map<number, Map<number, ISoldierLvAttrData>>();

    /** 每个士兵一行，初始 1 级。表还没加载完就先空着 */
    public getSoldiers(): SoldierCardData[] {
        this.ensureSoldiers();
        return this.soldiers;
    }

    /**
     * 基础值来自 UnitAttrData，系数来自 SoldierLvAttrData。
     * 士兵表 unit_id 对到单位表，单位表 unit_attr 才是属性行。
     * 系数组用单位属性上的 soldier_level_growth，没有系数行时按 1。
     * 先攻用单位属性 speed，等级系数表没有这一列，不乘系数。
     * 没有单位属性时这四项都是 0。
     */
    public getAttrs(soldierId: number, level: number): SoldierAttrs {
        this.ensureIndex();
        const soldier = ConfigMgr.instance.SoldierData.get(soldierId);
        const unit = soldier?.unit_id != null ? ConfigMgr.instance.UnitData.get(soldier.unit_id) : undefined;
        const unitAttr = unit?.unit_attr != null ? ConfigMgr.instance.UnitAttrData.get(unit.unit_attr) : undefined;
        const groupId = unitAttr?.soldier_level_growth;
        const rate = groupId != null ? this.lvAttrByGroup.get(groupId)?.get(level) : undefined;
        const unit_type = unit?.unit_type ?? unitAttr?.unit_type ?? 0;
        const tech = TechTreeMgr.getInstance();
        const hp = tech.scaleTechAttr(Math.floor((unitAttr?.hp ?? 0) * (rate?.hp_rate ?? 1)), unit_type, 'base_hp');
        const atk = tech.scaleTechAttr(Math.floor((unitAttr?.atk ?? 0) * (rate?.atk_rate ?? 1)), unit_type, 'base_atk');
        const def = tech.scaleTechAttr(Math.floor((unitAttr?.def ?? 0) * (rate?.def_rate ?? 1)), unit_type, 'base_def');
        const speed = tech.scaleTechAttr(Math.floor(unitAttr?.speed ?? 0), unit_type, 'base_speed');
        return { hp, atk, def, speed, score: hp + atk + def };
    }

    /** 等级表最大 id。表还没到就按 1 级封顶 */
    public getMaxLevel(): number {
        let max = 1;
        for (const row of ConfigMgr.instance.SoldierLevelData.values()) {
            if (row.id > max) {
                max = row.id;
            }
        }
        return max;
    }

    /**
     * 升到下一级的消耗，读下一级那一行。
     * 已经是最高级返回 null。下一级没有材料时返回空数组。
     */
    public getUpgradeCost(level: number): BagCost[] | null {
        const next = level + 1;
        if (next > this.getMaxLevel()) {
            return null;
        }
        const row = ConfigMgr.instance.SoldierLevelData.get(next);
        const items = row?.upgrade_item ?? [];
        const counts = row?.upgrade_count ?? [];
        const costs: BagCost[] = [];
        const size = Math.min(items.length, counts.length);
        for (let i = 0; i < size; i++) {
            costs.push({ item_id: items[i], count: counts[i] });
        }
        return costs;
    }

    /**
     * 材料够就等级 +1。协议还没有，不扣背包。
     * 成功返回空字符串。满级或材料不够返回提示。
     */
    public tryLevelUp(soldier: SoldierCardData): string {
        const costs = this.getUpgradeCost(soldier.level);
        if (!costs) {
            return lang(26);
        }
        if (!BagMgr.getInstance().isEnoughList(costs)) {
            return lang(27);
        }
        soldier.level += 1;
        return '';
    }

    private ensureSoldiers(): void {
        if (this.localReady) {
            return;
        }
        if (ConfigMgr.instance.SoldierData.size === 0) {
            return;
        }
        this.localReady = true;
        const list: SoldierCardData[] = [];
        for (const row of ConfigMgr.instance.SoldierData.values()) {
            list.push({ id: row.id, level: 1 });
        }
        list.sort((a, b) => a.id - b.id);
        this.soldiers = list;
    }

    private ensureIndex(): void {
        if (this.indexReady) {
            return;
        }
        const lvAttrs = ConfigMgr.instance.SoldierLvAttrData;
        if (lvAttrs.size === 0) {
            return;
        }
        this.indexReady = true;
        this.lvAttrByGroup.clear();
        for (const row of lvAttrs.values()) {
            if (row.group_id == null || row.level_id == null) {
                continue;
            }
            let levels = this.lvAttrByGroup.get(row.group_id);
            if (!levels) {
                levels = new Map();
                this.lvAttrByGroup.set(row.group_id, levels);
            }
            levels.set(row.level_id, row);
        }
    }
}
