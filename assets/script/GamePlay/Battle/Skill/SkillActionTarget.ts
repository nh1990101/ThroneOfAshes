import { _decorator, Component, Node } from 'cc';
import { SkillActionNode } from './SkillActionNode';
import { BattleUnit } from '../BattleUnit';
import { BattleMgr } from '../BattleMgr';
import { ISKILL_ACTION_PARAMS, ISKILL_FRAME_BINDING, ISKILL_TARGET_TRACK, ISKILL_TRACK_BINDING } from '../SkillMgr';
import { SKILL_ACTION_NODE_STATE, UNIT_ACTION } from '../../../Common/GameEnum';
const { ccclass, property } = _decorator;

@ccclass('SkillActionTarget')
export class SkillActionTarget extends SkillActionNode<ISKILL_TARGET_TRACK> {

    setData(data: ISKILL_TARGET_TRACK): void {
        super.setData(data);


    }

    startAction() {
        super.startAction();
        let data = this.getData();

        let params = data.params as ISKILL_ACTION_PARAMS;
        let targetUnit = BattleMgr.getInstance().GetUnitByUID(data.targetUID);
        if (params.action && targetUnit) {
            targetUnit.PlayActions([params.action], UNIT_ACTION.IDLE, this.endState, this);
        }else{

            this.endState();
        }


    }
    beginState() {
        super.beginState();
    }
    endState() {
        super.endState();
    }
    updateAction(): void {
        super.updateAction()
    }

}


