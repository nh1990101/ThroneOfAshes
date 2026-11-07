import { _decorator, Component, Node } from 'cc';
// import { ISKILL_TRACK } from './SkillMgr';
import { SKILL_ACTION_NODE_STATE } from '../../../Common/GameEnum';
import { ISKILL_ACTION_PARAMS, ISKILL_FRAME_BINDING, ISKILL_TRACK, SkillMgr } from '../SkillMgr';
import { BattleMgr } from '../BattleMgr';
const { ccclass, property } = _decorator;

/**技能功能节点行为接口 */
export interface ISKILL_ACTION {
    /**更新节点 */
    updateTick(dt: number);
    /**开始状态 */
    beginState();
    /**结束状态 */
    endState();
    /**赋值数据 */
    setData(data: ISKILL_TRACK)
}

@ccclass('SkillActionNode')
export class SkillActionNode<T extends ISKILL_TRACK> implements ISKILL_ACTION {
    protected m_data: T = null;
    protected m_state: SKILL_ACTION_NODE_STATE = null;
    /** 本次技能播放累计时间，单位毫秒。 */
    protected m_tick: number = 0;
    protected matchStartAction: SkillActionNode<ISKILL_TRACK>;
    setData(data: T) {
        this.m_data = data;
        this.m_state = SKILL_ACTION_NODE_STATE.NONE;;
    }
    getData(): T {
        return this.m_data;
    }
    updateTick(dt: number) {
        this.m_tick += dt * 1000;
        if (this.checkStartCondiction()) {
            this.startAction();
        }
        if (this.isCanUpdate()) {
            this.updateAction();
        }
    }
    updateAction() {

    }
    checkStartCondiction() {
        if (this.m_data.binding) {
            if (!this.matchStartAction) {
                var skillActions = SkillMgr.getInstance().getActionById(this.m_data.parentID);
                if (skillActions) {
                    let actions = skillActions.actions;
                    for (let i = 0; i < actions.length; i++) {
                        if (actions[i].getData().id == this.m_data.binding.trackId) {
                            this.matchStartAction = actions[i];
                            break;
                        }
                    }
                }
            }
            if (this.matchStartAction) {
                let isNoneState = this.m_state == SKILL_ACTION_NODE_STATE.NONE;
                let matchStartIsEnd = this.matchStartAction.CheckIsEnd();
                let frame = (this.m_data.binding as ISKILL_FRAME_BINDING).frame;
                let targetActionType = (this.matchStartAction.getData().params as ISKILL_ACTION_PARAMS).action;

                switch (this.matchStartAction.getData().type) {
                    case "caster":
                        let casterUnit = BattleMgr.getInstance().GetUnitByUID(this.m_data.uId);
                        // 高倍速可能跨过动作末帧后切回待机；动作结束也表示已到达绑定帧。
                        return isNoneState && casterUnit && (matchStartIsEnd || (casterUnit.GetCurPlayData().actionType == targetActionType && casterUnit.animation.getCurrentFrame() >= frame));
                    case "target":
                        let targetUnit = BattleMgr.getInstance().GetUnitByUID(this.m_data.targetUID);
                        return isNoneState && targetUnit && (matchStartIsEnd || (targetUnit.GetCurPlayData().actionType == targetActionType && targetUnit.animation.getCurrentFrame() >= frame));
                    case "flight":
                        return isNoneState && matchStartIsEnd;
                }
            }
        }
        return this.m_tick >= this.m_data.startMs && this.m_state == SKILL_ACTION_NODE_STATE.NONE;
    }
    startAction() {
        this.m_state = SKILL_ACTION_NODE_STATE.PLAYING;
    }
    protected isCanUpdate() {
        return this.m_state != null && this.m_state == SKILL_ACTION_NODE_STATE.PLAYING
    }
    beginState() {
        this.m_tick = 0;
        this.m_state = SKILL_ACTION_NODE_STATE.BEGIN;
    }
    endState() {
        this.m_state = SKILL_ACTION_NODE_STATE.END;
    }
    public CheckIsEnd() {
        return this.m_state == SKILL_ACTION_NODE_STATE.END;
    }
    public clear() {
        if (this.m_data) {
            this.m_data.uId = null;
            this.m_data.targetUID = null;
        }
        this.matchStartAction = null;
        this.m_data = null;
        this.m_tick = 0;
    }
}


