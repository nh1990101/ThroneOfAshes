import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 服务器数据（暂定数据结构）
 */
export class BattleUnitData {
    /**唯一ID */
    public uId: number;
    /**
     * 当前血量
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
     * 是否敌方阵营
     */
    public IsEnemy(): boolean {
        return this.camp == 2;
    }
}


