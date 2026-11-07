import { _decorator, Component, Node, Pool } from 'cc';
import { HexagonPos } from './HexagonData';
import { IUnitAttrData } from '../../Config/Typings/UnitAttrData';
import { PoolMgr } from '../../Common/Pool';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { BattleMgr, IBASE_PROPERTY } from './BattleMgr';
import { IUnitData } from '../../Config/Typings/UnitData';
import { ConfigTools } from '../../Config/ConfigTools';
import { ParamDefined, ParamValueType } from '../../Common/GameEnum';
const { ccclass, property } = _decorator;

/**
 * 服务器数据（暂定数据结构）
 */
export class BattleUnitData {
    /**单位属性配置 */
    public unitAttrcfg: IUnitAttrData;
    public unitCfg: IUnitData;
    /**唯一ID */
    public uId: string;
    /**
     * 第一个当前血量
     */
    public hp: number;
    /**
     * 等级
     */
    public lv: number;
    /**
     * 单位配置ID
     */
    public Id: number;
    /**
     * 阵营（1.己方、2.敌方）
     */
    public camp: number;
    /**
     * 初始位置
     */
    public pos: HexagonPos;
    /**士兵数量 */
    public soidierNum = 0;
    /**出手顺序（如果有值，优先拿这个值做出手排序） */
    public sort: number = 0;
    /**当前轮次 */
    public round: number = 0;
    /**已反击次数 */
    public counterAttackNum = 0;
    /**
     * 是否敌方阵营
     */
    public IsEnemy(): boolean {
        return this.camp == 2;
    }
    /**检测是否是敌人 */
    public checkIsEnemy(camp: number) {
        return this.camp != camp;
    }
    public SetData(cfg: IUnitAttrData, lv: number, camp: number, count: number, pos: HexagonPos) {
        this.lv = lv;
        if (cfg) {
            this.unitAttrcfg = cfg;
            this.Id = ConfigMgr.instance.UnitDataIndex.unit_attr_dict[cfg.id];
            this.hp = this.GetSingleProperty().hp;
            this.uId = `${cfg.id}_${pos.q}_${pos.r}`;
            this.unitCfg = ConfigTools.instance.getUnitCfgByUnitAttrId(cfg.id);
        }

        this.soidierNum = count;
        this.camp = camp;
        this.pos = pos;
    }
    /**获取出手顺序 */
    public GetSort() {
        if (this.sort) {
            return this.sort;
        }

        return this.GetRealSort();
    }
    public GetRealSort() {
        var sort = 0;
        if (!this.IsEnemy()) {//己方单位速度加成
            sort += BattleMgr.getInstance().GetPropertyByCurBattlArr().speed * ConfigMgr.instance.getParam(ParamDefined.BATTLE_ARRAY_HERO_PROPERTY_ADD_RATE, ParamValueType.FLOAT)[0];
        }
        sort += this.unitAttrcfg.speed;
        return sort;
    }
    public GetProperty(): IBASE_PROPERTY {
        var singlePro = this.GetSingleProperty()
        return ConfigTools.instance.MutiplyProperty(singlePro, this.soidierNum);
    }
    /**根据等级获取单个士兵属性 */
    public GetSingleProperty(): IBASE_PROPERTY {
        return ConfigTools.instance.getUnitPropertyByLv(this.unitAttrcfg, this.lv);
    }
    /**血条变化处理（传具体伤害或者奶量） */
    public HpHandler(value: number) {
        const singleHp = this.GetSingleProperty().hp;
        if (singleHp <= 0 || this.soidierNum <= 0) {
            return;
        }

        // 将整队血量合并计算，可同时处理跨多个士兵的伤害或治疗。
        const totalHp = this.hp + (this.soidierNum - 1) * singleHp + value;
        if (totalHp <= 0) {
            this.hp = 0;
            this.soidierNum = 0;
            return;
        }

        this.soidierNum = Math.ceil(totalHp / singleHp);
        this.hp = totalHp - (this.soidierNum - 1) * singleHp;

    }
    public CheckIsDead() {
        return this.soidierNum <= 0;
    }
    /**是否已经等待 */
    public CheckHasWait() {
        return this.sort != 0;
    }
    /**是否可以反击 */
    public CheckIsCanCounterAttack() {
        return this.counterAttackNum < 1 && this.unitCfg.is_counter_Attack
    }
    Clear() {
        this.uId = null;
        this.hp = 0;
        this.lv = 0;
        this.Id = 0;
        this.camp = 0;
        this.pos = null;
        this.soidierNum = 0;
        this.round = 0;
        this.sort = 0;
        this.counterAttackNum = 0;
        // if (this.unitAttrcfg) {
        //     PoolMgr.put(this.unitAttrcfg);
        // }
        this.unitAttrcfg = null;
    }
    /**深拷贝 */
    Clone() {
        var unitData = PoolMgr.get(BattleUnitData);
        unitData.Clear();
        unitData.SetData(ConfigMgr.instance.UnitAttrData.get(this.unitAttrcfg.id), this.lv, this.camp, this.soidierNum, { q: this.pos.q, r: this.pos.r });
        unitData.hp = this.hp;
        unitData.round = this.round;
        unitData.sort = this.sort;
        unitData.counterAttackNum = this.counterAttackNum;
        return unitData;
    }

}


