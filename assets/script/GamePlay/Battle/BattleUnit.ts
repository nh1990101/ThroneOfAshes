import { _decorator, Component, Node, ProgressBar } from 'cc';
import { UnitBase } from './UnitBase';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
const { ccclass, property } = _decorator;
/**
 * 战斗场景单位基础类
 */
@ccclass('BattleUnit')
export class BattleUnit extends UnitBase {
    @property(ProgressBar)
    HpBar: ProgressBar;
    @property(BaseLabel)
    lb_Hp: BaseLabel;


    /**
     * 服务器数据
     */
    protected m_data: any;
    
    initEvent(): void {
        super.initEvent();

    }
    public SetHp(curHp: number, maxHp?: number) {

    }

}


