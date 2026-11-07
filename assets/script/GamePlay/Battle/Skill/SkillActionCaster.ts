import { _decorator, Component, Node } from 'cc';
import { SkillActionNode } from './SkillActionNode';
import { SKILL_ACTION_NODE_STATE, UNIT_ACTION } from '../../../Common/GameEnum';
import { ISKILL_ACTION_PARAMS, ISKILL_CASTER_TRACK, ISKILL_TRACK } from '../SkillMgr';
import { BattleUnitData } from '../BattleUnitData';
import { BattleMgr } from '../BattleMgr';
import { BattleUnit } from '../BattleUnit';
const { ccclass, property } = _decorator;
/**施法者行为 */
@ccclass('SkillActionAttacker')
export class SkillActionAttacker extends SkillActionNode<ISKILL_CASTER_TRACK> {

    setData(data: ISKILL_CASTER_TRACK): void {
        super.setData(data);


    }

    beginState() {
        super.beginState();
    }
    endState() {
        super.endState();
    }
    startAction(): void {
        super.startAction();
        let params = this.m_data.params as ISKILL_ACTION_PARAMS;
        let battleMgr = BattleMgr.getInstance();
        let attackerUnit = battleMgr.GetUnitByUID(this.m_data.uId);
        let beAttacUnit = battleMgr.GetUnitByUID(this.m_data.targetUID)
        if (params.action && attackerUnit) {
            attackerUnit.CheckDir(beAttacUnit.node.position);
            attackerUnit.PlayActions([params.action], UNIT_ACTION.IDLE, this.endState, this);
        }
    }

}


