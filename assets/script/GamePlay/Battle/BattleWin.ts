import { _decorator, Component, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BattleUnit } from './BattleUnit';
import { UNIT_ACTION } from '../../Common/GameEnum';
import { BattleMgr } from './BattleMgr';
import { BattleMapMgr } from './BattleMapMgr';
const { ccclass, property } = _decorator;

@ccclass('BattleWin')
export class BattleWin extends BaseWin {

    @property(Node)
    mapContainer: Node;

    @property(BaseBtn)
    btn_close: BaseBtn = null!;

    @property(BattleUnit)
    testUnit: BattleUnit;



    public initEvent(): void {

        super.initEvent();
    }
    async OnRefreshUI() {
        super.OnRefreshUI();


        //战斗地图初始化
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.mapContainer = this.mapContainer;
        await mapMgr.initMap();

        //战斗主逻辑初始化
        BattleMgr.getInstance().Init();

        //战斗单位初始化
        await this.testUnit.SetUnitId(1001);
        this.testUnit.PlayAction(UNIT_ACTION.IDLE, true);
        this.testUnit.PlayActions([UNIT_ACTION.IDLE, UNIT_ACTION.MOVE, UNIT_ACTION.BE_HIT]);
    }
    closeWin(): void {
        super.closeWin();
        var mapMgr = BattleMapMgr.getInstance();
        mapMgr.clearMap();
    }
}


