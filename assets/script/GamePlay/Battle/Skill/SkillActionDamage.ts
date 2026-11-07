import { _decorator, Component, Node } from 'cc';
import { SkillActionNode } from './SkillActionNode';
import { ISKILL_DAMAGE_PARAMS, ISKILL_DAMAGE_TRACK, ISKILL_FRAME_BINDING, ISKILL_TRACK, SkillMgr } from '../SkillMgr';
import { DamageTextMgr } from '../DamageTextMgr';
import { BattleMgr } from '../BattleMgr';
import { SKILL_ACTION_NODE_STATE } from '../../../Common/GameEnum';
const { ccclass, property } = _decorator;

@ccclass('SkillActionDamage')
export class SkillActionDamage extends SkillActionNode<ISKILL_DAMAGE_TRACK> {
    checkStartCondiction() {
        console.log("SkillActionDamage")
        return super.checkStartCondiction();
    }
    startAction(): void {
        super.startAction();
        let params = this.m_data.params as ISKILL_DAMAGE_PARAMS;
        let battleMgr = BattleMgr.getInstance();
        let targetUnit = battleMgr.GetUnitByUID(this.m_data.targetUID);
        if (params && targetUnit) {
            let showDamage = params.share ? params.damage * params.share : params.damage;
            DamageTextMgr.getInstance().showDamageText(showDamage.toFixed(0), targetUnit.node.position.toVec2(), battleMgr.numberContainer)
            targetUnit.HpHandler(this.m_data.params.damage).then(() => {
                if (targetUnit.CheckIsDead() && this.m_data) {
                    var arr = SkillMgr.getInstance().getActionById(this.m_data.parentID)?.actions;
                    if (arr) {
                        arr.forEach(action => {
                            action.endState();
                        })
                    }
                }
                this.endState();
            })
        }
    }

    public clear(): void {
        this.m_data.params.damage = 0;
        this.matchStartAction = null;
        super.clear();

    }

}


