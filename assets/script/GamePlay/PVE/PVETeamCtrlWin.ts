import { _decorator, Component, Node, NodeEventType, ScrollView } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { ScrollList } from '../../Component/BaseComp/ScrollList';
import { child, comp } from '../../Common/Decorator';
import { GameEvent, ParamDefined, ParamValueType } from '../../Common/GameEnum';
import { PVEMgr } from './PVEMgr';
import { IBattleTeamData, PVETeamCell } from './component/PVETeamCell';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
const { ccclass, property } = _decorator;

@ccclass('PVETeamCtrlWin')
export class PVETeamCtrlWin extends BaseWin {
    @comp(ScrollList)
    listTeam: ScrollList = null!;
    @child()
    bg_mask: Node = null!;
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    public initEvent(): void {
        super.initEvent();
        this.addEvent(GameEvent.SAVE_BATTLE_ARRAY, this.OnRefreshUI, this);
        this.addNodeEvent(this.bg_mask, NodeEventType.TOUCH_END, this.closeWin, this);
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();

        var mgr = PVEMgr.getInstance();
        var arr: IBattleTeamData[] = [];

        var max = ConfigMgr.instance.getParam(ParamDefined.BATTLE_ARRAY_TEAM_NUM_MAX, ParamValueType.INT)[0];
        for (let i = 0; i < max; i++) {
            var teamData = mgr.getBattleArr(i + 1);
            arr.push({ teamId: i + 1, teamData: teamData });
        }

        this.listTeam.updateList(arr, PVETeamCell)
    }

}


