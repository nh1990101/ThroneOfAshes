import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { ScrollList } from '../../Component/BaseComp/ScrollList';
import { comp } from '../../Common/Decorator';
import { BattleUnit } from './BattleUnit';
import { IUnitStartSortData, UnitStartSortCell } from './UnitStartSortCell';
import { IHISTORY_NODE } from './BattleMgr';
const { ccclass, property } = _decorator;

@ccclass('BattleStartSortCom')
export class BattleStartSortCom extends BaseComp {
    @comp(ScrollList)
    listCom: ScrollList = null!;

    private _battleSortDatas: IUnitStartSortData[];
    public setData(battleSortDatas: IUnitStartSortData[]) {
        this._battleSortDatas = battleSortDatas;
        this.OnCheckRefreshUI();
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (this._battleSortDatas) {
            this.listCom.updateList(this._battleSortDatas.slice(0, 5), UnitStartSortCell);
        }
    }
    /**获取当前出手的单位数据 */
    public GetCurUnitData() {
        return this._battleSortDatas[0];
    }
    /**获取所有单位的出手数据 */
    public GetDatas() {
        return this._battleSortDatas;
    }

    // /**获取当前战斗流程节点 */
    // public GetHistoryNode(): IHISTORY_NODE {
    //     var curData = this.GetCurUnitData();
    //     var arr = this._battleSortDatas;
    //     for (let i = 0; i < arr.length; i++) {
    //         if(arr[i].round==curData.)
    //     }
    //     return { round: curData.round, index: }
    // }

}


