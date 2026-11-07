import { _decorator, Component, Node, v2, Vec2, Vec3 } from 'cc';
import { SkillActionNode } from './SkillActionNode';
import { ISKILL_FLIGHT_PARAMS, ISKILL_FLIGHT_TRACK, ISKILL_FRAME_BINDING, SkillMgr } from '../SkillMgr';
import { AnimationCom } from '../../../Component/AnimationCom';
import { AssetMgr } from '../../../Common/AssetMgr';
import { SKILL_ACTION_NODE_STATE } from '../../../Common/GameEnum';
import { BattleMgr } from '../BattleMgr';
const { ccclass, property } = _decorator;

@ccclass('SkillActionFly')
export class SkillActionFly extends SkillActionNode<ISKILL_FLIGHT_TRACK> {
    animation: AnimationCom = null!;
    targetPos: Vec3;
    fromPos: Vec3;
    private m_startTick: number = 0;
    setData(data: ISKILL_FLIGHT_TRACK): void {
        super.setData(data);
    }

    /**检测是否到达目标点 */
    checkIsArrive() {
        if (this.animation && this.targetPos && Vec3.equals(this.animation.node.position, this.targetPos)) {
            let data = this.getData();
            let params = data.params as ISKILL_FLIGHT_PARAMS;
            if (params.hideOnArrival) {
                // AssetMgr.removeNode(this.animation.node);
                this.getData().bindEff?.endState();
            }
            return true;

        }
        return false;
    }
    startAction(): void {
        super.startAction();
        this.m_startTick = this.m_tick;
        let data = this.getData();
        let params = data.params as ISKILL_FLIGHT_PARAMS;
        this.fromPos = SkillMgr.getInstance().getPosByPosStruct(params.start, data.uId, data.targetUID,
            params.startOffset ? v2(params.startOffset.x, params.startOffset.y) : undefined);
        this.targetPos = SkillMgr.getInstance().getPosByPosStruct(params.end, data.uId, data.targetUID,
            params.endOffset ? v2(params.endOffset.x, params.endOffset.y) : undefined);
        this.animation = data.bindEff?.animation;
    }

    endState() {
        super.endState();
    }
    updateAction(): void {
        super.updateAction();
        if (this.animation) {
            this.updatePos();
            if (this.checkIsArrive()) {
                this.endState();
            }
        } else {
            this.animation = this.getData().bindEff?.animation;
        }
    }
    /**更新位置 */
    updatePos() {
        let data = this.getData();
        let paras = data?.params as ISKILL_FLIGHT_PARAMS;
        if (!paras || !this.animation || !this.fromPos || !this.targetPos) {
            return;
        }

        let distance = Vec3.distance(this.fromPos, this.targetPos);
        // 从实际触发时刻计算飞行秒数，兼容动作帧或飞行结束绑定。
        let elapsed = Math.max(0, this.m_tick - this.m_startTick) / 1000;
        let progress = distance > 0 ? Math.min(1, paras.speed * elapsed / distance) : 1;
        let dx = this.targetPos.x - this.fromPos.x;
        let dy = this.targetPos.y - this.fromPos.y;
        let dz = this.targetPos.z - this.fromPos.z;
        this.animation.node.setPosition(
            this.fromPos.x + dx * progress,
            this.fromPos.y + dy * progress,
            this.fromPos.z + dz * progress
        );

        // 与 BattleUnit.CheckDir 一致，垂直飞行保留当前水平朝向。
        let isFlipX = this.animation.aniImg?.node.scale.x < 0;
        if (dx < 0) {
            isFlipX = true;
            this.animation.SetFlipX(true);
        } else if (dx > 0) {
            isFlipX = false;
            this.animation.SetFlipX(false);
        }

        if (paras.alignToTarget) {
            // 水平镜像后素材已朝左，旋转需扣除 180°，避免重复反向。
            let angle = Math.atan2(dy, dx) * 180 / Math.PI;
            this.animation.node.angle = angle - (isFlipX ? 180 : 0);
        }
    }
    public clear(): void {
        if (this.m_data.bindEff) {
            this.m_data.bindEff.clear();
        }
        super.clear();
        this.m_startTick = 0;
        this.fromPos = null;
        this.targetPos = null;
        this.animation = null;

    }
}




