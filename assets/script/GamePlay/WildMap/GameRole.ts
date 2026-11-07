import { _decorator, Component, Node, UITransform } from 'cc';
import { WildRole } from './WildRole';
import { MapGridData } from './MapGridData';
import { GameEvent, ParamDefined, ParamValueType } from '../../Common/GameEnum';
import { EventManager } from '../../Common/EventManager';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { comp } from '../../Common/Decorator';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { GlobalData } from '../../Common/GlobalData';
import { MapMgr } from './MapMgr';
const { ccclass, property } = _decorator;
/**
 * 玩家控制的野外角色
 */
@ccclass('GameRole')
export class GameRole extends WildRole {
    public static instance: GameRole;
    @comp(BaseSprite)
    watchArea: BaseSprite = null!;

    protected onLoad(): void {
        super.onLoad();
        GameRole.instance = this;
        this.showWatchArea(false);
    }
    // 自己角色需要抛出事件更新
    protected onSingleGridMoveComplete(targetGrid: MapGridData) {
        super.onSingleGridMoveComplete(targetGrid);
        EventManager.Instance.dispatch(GameEvent.Finish_Move_Step, targetGrid);
        EventManager.Instance.dispatch(GameEvent.UpdateMapBlock);
        GlobalData.wildData.myRoleGridX = targetGrid.gridX;
        GlobalData.wildData.myRoleGridY = targetGrid.gridY;
        GlobalData.wildData.myRoleDir = this.currentDir;
        //每走一步减去体力
        GlobalData.wildData.reduceEnergy();

        // 统计步数
        var worldPos = this.node.worldPosition;
        GlobalData.wildData.addMovePoint(MapMgr.getInstance().curMapId, targetGrid.gridX, targetGrid.gridY);
    }

    public showWatchArea(bol: boolean) {
        this.watchArea.node.active = bol;
        var watchArea = ConfigMgr.instance.getParam(ParamDefined.WATCH_AREA, ParamValueType.FLOAT)[0] * 2;
        this.watchArea.getComponent(UITransform).setContentSize(watchArea, watchArea);
    }

}


