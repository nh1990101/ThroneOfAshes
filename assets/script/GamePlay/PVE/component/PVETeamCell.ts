import { _decorator, Component, Node, NodeEventType } from 'cc';
import { BaseRenderCell } from '../../../Component/BaseRenderCell';
import { BattleTeamData, PVEMgr } from '../PVEMgr';
import { child, comp } from '../../../Common/Decorator';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { lang } from '../../../Common/LangMgr';
import { UIMananger } from '../../../Component/UIMananger';
import { PVETeamCtrlWin } from '../PVETeamCtrlWin';
import { FightPrepareWin } from '../FightPrepareWin';
import { Tools } from '../../../Common/Tools';
import { EventManager } from '../../../Common/EventManager';
import { GameEvent } from '../../../Common/GameEnum';
const { ccclass, property } = _decorator;
export interface IBattleTeamData {
    teamId: number;
    teamData: Map<number, BattleTeamData>;
}
@ccclass('PVETeamCell')
export class PVETeamCell extends BaseRenderCell<IBattleTeamData> {
    @child()
    noSave: Node = null!;

    @comp(BaseBtn)
    btn_save: BaseBtn = null!;

    @comp(BaseBtn)
    btn_use: BaseBtn = null!;

    @child()
    hasSave: Node = null!;

    @comp(BaseLabel)
    lb_teamId: BaseLabel = null!;

    @comp(BaseLabel)
    lb_teamInfo: BaseLabel = null!;

    @comp(BaseLabel)
    lb_command: BaseLabel = null!;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_save.node, NodeEventType.TOUCH_END, this.onClickSave, this);
        this.addNodeEvent(this.btn_use.node, NodeEventType.TOUCH_END, this.onClickUse, this);
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI()
        var data = this.getData();
        var mgr = PVEMgr.getInstance();
        if (data.teamData) {
            this.noSave.active = false;
            this.hasSave.active = true;
            // this.btn_use.node.active = true;

            var numHero = 0;
            var numSoldier = 0;
            data.teamData.forEach(team => {
                if (team.uId) {
                    team.pos ? numSoldier++ : numHero++;
                }
            })
            this.lb_teamInfo.string = lang(174, { hero: numHero, soldier: numSoldier });
            this.lb_command.string = lang(175, { command: `${mgr.getNeedCommand(mgr.getBattleSoldier(data.teamId))}/${mgr.getCommand(mgr.getBattleHero(data.teamId))}` });
        } else {
            this.noSave.active = true;
            this.hasSave.active = false;
            // this.btn_use.node.active = false;

        }
        this.lb_teamId.string = lang(171, { teamId: this._data.teamId })
    }
    onClickSave() {
        var mgr = PVEMgr.getInstance();
        var curBattleArr = mgr.getCurBattleArray();
        var newBattle = new Map();
        curBattleArr.forEach(curBattle => {
            newBattle.set(curBattle.uId, Tools.cloneObj(curBattle));
        })
        mgr.saveBattleArray(this.getData().teamId, newBattle);
        EventManager.Instance.dispatch(GameEvent.SAVE_BATTLE_ARRAY);
    }
    onClickUse() {
        var mgr = PVEMgr.getInstance()
        mgr.curBattleArrId = this._data.teamId;
        if (!mgr.getBattleArr(mgr.curBattleArrId)) {
            mgr.saveCurrBattleArray(new Map());
        }
        UIMananger.instance.closeWin(PVETeamCtrlWin)
        EventManager.Instance.dispatch(GameEvent.FIGHT_SELECT_UNIT_UPDATE);
    }
}


