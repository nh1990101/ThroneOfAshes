import { _decorator, Component, Node, v2, Vec2, Vec3 } from 'cc';
import { SkillActionNode } from './SkillActionNode';
import { AnimationCom } from '../../../Component/AnimationCom';
import { ISKILL_EFFECT_PARAMS, ISKILL_EFFECT_TRACK, ISKILL_FRAME_BINDING, SkillMgr } from '../SkillMgr';
import { GameUrl } from '../../../Common/GameUrl';
import { AssetMgr } from '../../../Common/AssetMgr';
import { BattleMgr } from '../BattleMgr';
import { BattleMapMgr } from '../BattleMapMgr';
import { SKILL_ACTION_NODE_STATE } from '../../../Common/GameEnum';
const { ccclass, property } = _decorator;

@ccclass('SkillActionEffect')
export class SkillActionEffect extends SkillActionNode<ISKILL_EFFECT_TRACK> {
    animation: AnimationCom = null!;
    setData(data: ISKILL_EFFECT_TRACK): void {
        super.setData(data);
    }

    beginState() {
        super.beginState();

    }
    endState() {
        super.endState();
        if (this.animation) {
            AssetMgr.removeNode(this.animation.node);
        }
        this.animation = null;
    }


    startAction(): void {

        let data = this.m_data;
        var battleMgr = BattleMgr.getInstance();
        let params = data.params as ISKILL_EFFECT_PARAMS;
        if (params.effectId) {
            let parentNode: Node = null;
            switch (params.layer) {
                case "top":
                    parentNode = battleMgr.EffectContainer;
                    break;
                case "auto":
                    parentNode = battleMgr.battleUnitContainer;
                    break;
                case "bottom":
                    parentNode = BattleMapMgr.getInstance().mapContainer;
                    break;
            }
            let role = params.position.mode === "custom" ? params.position.relativeTo : params.position.mode;
            let unit = battleMgr.GetUnitByUID(role === "target" ? data.targetUID : data.uId);
            let isFlipX = unit?.animation?.GetFlipX() && role != "global";
            let offPos = params.offset;
            let resultPos = SkillMgr.getInstance().getPosByPosStruct(params.position, data.uId, data.targetUID, offPos ? v2(isFlipX ? -offPos.x : offPos.x, offPos.y) : null);
            AssetMgr.createPrefabFromPool(GameUrl.Common_Prefab_Url.format("animation"), resultPos.toVec2(), parentNode, AnimationCom).then((animation) => {
                if (this.m_data !== data || this.CheckIsEnd()) {
                    AssetMgr.removeNode(animation.node);
                } else {
                    this.animation = animation;
                    this.animation.node.setScale(params.scale, params.scale);
                    this.animation.loadFramesFromAtlas(GameUrl.Skill_Atlas_Url.format(params.effectId), "").then(() => {
                        if (this.m_data !== data || this.animation !== animation || this.CheckIsEnd()) {
                            return;
                        }
                        this.updatePlaySpeed();
                        animation.play(0, -1, params.loop, false, this.endState, this);
                    });
                    // 加载帧会先清除翻转；随后恢复角色朝向，并清理对象池残留的旋转。
                    this.animation.node.angle = 0;
                    this.animation.SetFlipX(isFlipX);
                }
            })

        }
        super.startAction();
    }
    updateAction(): void {
        super.updateAction();
        this.updatePlaySpeed();
        let params = this.m_data.params as ISKILL_EFFECT_PARAMS;
        if (params.loop && params.durationMs && params.durationMs > this.m_tick) {
            this.endState();
        }
    }
    /** 帧动画由组件自行更新，需要同步配置倍率及当前战斗倍速。 */
    private updatePlaySpeed(): void {
        if (!this.animation) {
            return;
        }
        const params = this.m_data.params;
        const frameRate = params.fps * (params.speed ?? 1) * BattleMgr.getInstance().playSpeedRate;
        if (this.animation.getFrameRate() !== frameRate) {
            this.animation.setFrameRate(frameRate);
        }
    }
    public clear(): void {
        super.clear();
        if (this.animation) {
            AssetMgr.removeNode(this.animation.node);
        }
        this.animation = null;
    }
}

