import { _decorator, v2, v3, Vec2, Vec3 } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { GameEvent, type SKILL_MOVE_TYPE, type UNIT_ACTION } from '../../Common/GameEnum';
import { BattleUnit } from './BattleUnit';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { AnimationCom } from '../../Component/AnimationCom';
import { SkillActionEffect } from './Skill/SkillActionEffect';
import { BattleMgr } from './BattleMgr';
import { SkillActionNode } from './Skill/SkillActionNode';
import { PoolMgr } from '../../Common/Pool';
import { SkillActionAttacker } from './Skill/SkillActionCaster';
import { SkillActionTarget } from './Skill/SkillActionTarget';
import { SkillActionDamage } from './Skill/SkillActionDamage';
import { SkillActionFly } from './Skill/SkillActionFly';
import { SkillActionRepel } from './Skill/SkillActionRepel';
import { EventManager } from '../../Common/EventManager';
import { ISkillData } from '../../Config/Typings/SkillData';
const { ccclass } = _decorator;

/** 技能编辑器导出的六种轨道类型。 */
export type SKILL_TRACK_TYPE = 'caster' | 'target' | 'effect' | 'flight' | 'damage' | 'move';

/** 角色序列帧动作。 */
export type SKILL_ACTION = UNIT_ACTION.IDLE | UNIT_ACTION.MOVE | UNIT_ACTION.BE_HIT | UNIT_ACTION.DEAD | UNIT_ACTION.ATTACK;

/** 六边形方向：右、右上、左上、左、左下、右下。 */
export type SKILL_MOVE_DIRECTION = 0 | 1 | 2 | 3 | 4 | 5;

/** 轨道与角色动作帧的时间关联。 */
export interface ISKILL_FRAME_BINDING {
    /** 旧配置不包含此字段；end 专用于飞行结束关联。 */
    anchor?: never;
    /** 关联的施法者或受击者动作轨道 ID。 */
    trackId: string;
    /** 当前动作内的帧号，从 1 开始。 */
    frame: number;
    /** 在关联帧上的附加偏移，单位毫秒，可为负数。 */
    offsetMs: number;
}

/** 在指定飞行轨道结束时触发，速度或距离变化后需重新计算触发时间。 */
export interface ISKILL_FLIGHT_END_BINDING {
    /** 关联的飞行轨道 ID。 */
    trackId: string;
    anchor: 'end';
    /** 相对飞行结束的偏移，单位毫秒，默认 0。 */
    offsetMs: number;
}

/** 轨道时间关联；为 null 时使用 startMs，anchor 为 end 时关联飞行结束。 */
export type ISKILL_TRACK_BINDING = ISKILL_FRAME_BINDING | ISKILL_FLIGHT_END_BINDING;

/** 特效或飞行端点的位置配置；自定义像素坐标 X 向右、Y 向上。 */
export interface ISKILL_POSITION {
    mode: 'caster' | 'target' | 'custom';
    /** mode 为 custom 时生效；global 表示以地图中心为原点。 */
    relativeTo: 'caster' | 'target' | 'global';
    x: number;
    y: number;
}

/** 施法者与受击者共用的动作参数。 */
export interface ISKILL_ACTION_PARAMS {
    /** 场景单位实例 ID；空字符串时按轨道角色自动选择。 */
    unitInstanceId: string;
    /** 使用的单位动画配置 ID；null 时使用场景单位的动画。 */
    unitId: number | null;
    action: SKILL_ACTION;
    /** 序列帧播放帧率。 */
    fps: number;
    loop: boolean;
}

/** 播放技能特效的参数。 */
export interface ISKILL_EFFECT_PARAMS {
    /** 相对于 Res/Battle/Skill 目录的特效资源 ID。 */
    effectId: string;
    fps: number;
    /** 动画播放速度倍率。 */
    speed: number;
    position: ISKILL_POSITION;
    /** auto 按位置排序，top/bottom 强制置于最上层/最下层。 */
    layer: 'top' | 'auto' | 'bottom';
    /** 世界方向的像素偏移，X 向右、Y 向上。 */
    offset: { x: number; y: number };
    scale: number;
    loop: boolean;
    /** 非循环特效的持续时间，单位毫秒；null 或缺失时按一轮动画计算，循环时忽略。 */
    durationMs?: number | null;
    /** 是否为每个敌人分别创建一个特效；旧配置缺失时按 false 处理。 */
    multiTarget?: boolean;

}

/** 技能特效直线飞行的参数。 */
export interface ISKILL_FLIGHT_PARAMS {
    /** 引用特效轨道实例的 ID，而非特效资源 ID。 */
    effectTrackId: string;
    /** 飞行速度，单位像素/秒。 */
    speed: number;
    /** 飞行触发时确定起终点，后续单位移动不改变本次轨迹。 */
    start: ISKILL_POSITION;
    end: ISKILL_POSITION;
    /** 起点位置的世界像素偏移，X 向右、Y 向上；旧配置缺失时为 (0,0)。 */
    startOffset?: { x: number; y: number };
    /** 终点位置的世界像素偏移，X 向右、Y 向上；旧配置缺失时为 (0,0)。 */
    endOffset?: { x: number; y: number };
    hideOnArrival: boolean;
    /** 特效朝向是否与起点指向终点的方向一致；旧配置缺失时按 false 处理。 */
    alignToTarget?: boolean;
}

/** 伤害结算节点的参数。 */
export interface ISKILL_DAMAGE_PARAMS {
    /** 占总伤害的百分比，范围 0–100；null 表示自动分摊剩余比例。 */
    share: number | null;
    /** 受伤单位实例 ID；空字符串时自动选择受击者。 */
    unitInstanceId: string;
    /**实际总伤害 */
    damage?: number;
}

/** 强制移动的参数。 */
export interface ISKILL_MOVE_PARAMS {
    /** 编辑器预览使用的单位实例 ID；游戏内通过轨道 targetUID 获取受击单位。 */
    unitInstanceId: string;
    /** 仅供编辑器预览选取格子，游戏内击退忽略此参数。 */
    cell: { q: number; r: number };
    /** 1 反向朝向，2 施法者指向移动单位，3 固定方向，4 全局移动；旧配置默认 3。 */
    moveType?: SKILL_MOVE_TYPE;
    /** 全局移动的目标地图格子；仅 moveType 为 4 时使用，与预览选取单位的 cell 无关。 */
    targetCell?: { q: number; r: number };
    /** 仅固定方向类型使用。 */
    direction: SKILL_MOVE_DIRECTION;
    /** 前三种类型的移动格数；全局移动忽略此参数。 */
    steps: number;
    /** 位移耗时，单位毫秒；0 表示瞬移。 */
    durationMs: number;
    /** 受阻时推出再返回的距离，单位像素；默认 20，最大限制在当前格内。 */
    bounceDistance?: number;
    /** 受阻时整个往返回弹的耗时，单位毫秒；默认 200，0 表示立即归位。 */
    bounceDurationMs?: number;
}

/** 所有轨道的公共字段，字段名与编辑器导出的 JSON 保持一致。 */
export interface ISKILL_TRACK_BASE<TType extends SKILL_TRACK_TYPE, TParams> {
    id: string;
    uId?: string;
    targetUID?: string;
    name: string;
    type: TType;
    enabled: boolean;
    /** 绝对开始时间，单位毫秒；binding 非 null 时按动作帧或飞行结束关联重新计算。 */
    startMs: number;
    binding: ISKILL_TRACK_BINDING | null;
    params: TParams;
    bindEff?: SkillActionEffect;
    parentID: number;
}

/** 施法者行为轨道。 */
export interface ISKILL_CASTER_TRACK extends ISKILL_TRACK_BASE<'caster', ISKILL_ACTION_PARAMS> { }

/** 受击者行为轨道。 */
export interface ISKILL_TARGET_TRACK extends ISKILL_TRACK_BASE<'target', ISKILL_ACTION_PARAMS> { }

/** 播放技能特效轨道。 */
export interface ISKILL_EFFECT_TRACK extends ISKILL_TRACK_BASE<'effect', ISKILL_EFFECT_PARAMS> { }

/** 技能移动飞行轨道。 */
export interface ISKILL_FLIGHT_TRACK extends ISKILL_TRACK_BASE<'flight', ISKILL_FLIGHT_PARAMS> { }

/** 伤害节点轨道。 */
export interface ISKILL_DAMAGE_TRACK extends ISKILL_TRACK_BASE<'damage', ISKILL_DAMAGE_PARAMS> { }

/** 强制移动轨道。 */
export interface ISKILL_MOVE_TRACK extends ISKILL_TRACK_BASE<'move', ISKILL_MOVE_PARAMS> { }

/** tracks 数组元素类型；判断 type 后，params 自动收窄为对应轨道参数。 */
export type ISKILL_TRACK =
    | ISKILL_CASTER_TRACK
    | ISKILL_TARGET_TRACK
    | ISKILL_EFFECT_TRACK
    | ISKILL_FLIGHT_TRACK
    | ISKILL_DAMAGE_TRACK
    | ISKILL_MOVE_TRACK;

/** 导出时计算出的单条轨道时间与伤害结果，通过 trackId 对应原轨道。 */
export interface ISKILL_RESOLVED_NODE {
    trackId: string;
    /** 最终触发时间，单位毫秒，已计算帧关联与附加偏移。 */
    startMs: number;
    /** 最终持续时间，单位毫秒。 */
    durationMs: number;
    /** 仅启用的伤害轨道包含此字段，表示分配后的总伤害百分比。 */
    damagePercent?: number;
}

/** 技能编辑器保存时生成的派生结果。 */
export interface ISKILL_RESOLVED {
    /** 技能最终总时长，单位毫秒。 */
    durationMs: number;
    /** 所有启用的伤害轨道占比之和；有伤害轨道时正常值为 100，否则为 0。 */
    damagePercentTotal: number;
    /** 包含全部轨道；执行时仍需结合原轨道的 enabled 判断是否启用。 */
    nodes: ISKILL_RESOLVED_NODE[];
}

/** 技能表现的全局设置。 */
export interface ISKILL_SETTINGS {
    /** 流程时长模式；缺失时默认 auto，以最后一个启用节点播放结束为终点。 */
    durationMode?: 'auto' | 'manual';
    defaultFps: number;
    effectFps: number;
    /** 编辑器预览用总伤害，不作为游戏实际结算伤害。 */
    previewDamage: number;
    targetFlip: 'x' | 'y' | 'none';
    collision: 'stop' | 'ignore';
}

/** 编辑器场景中放置的单位实例。 */
export interface ISKILL_SCENE_UNIT {
    id: string;
    unitId: number;
    q: number;
    r: number;
    role: 'caster' | 'target';
    scale: number;

}

/** 技能表现的地图与单位配置。 */
export interface ISKILL_SCENE {
    cols: number;
    rows: number;
    hexWidth: number;
    hexHeight: number;
    /** 当前配置使用 bottom-left；旧版缺失时表示 top-left。 */
    coordinateOrigin?: 'bottom-left' | 'top-left';
    units: ISKILL_SCENE_UNIT[];
}

/** Res/Config/Skill/<技能ID>.json 的完整数据结构。 */
export interface ISKILL_CONFIG {
    format: 'RPGCore.SkillPresentation';
    schemaVersion: 1;
    skillId: string;
    name: string;
    /** 手动模式的最小时长；自动模式忽略此值，最终时长见 resolved.durationMs。 */
    durationMs: number;
    settings: ISKILL_SETTINGS;
    scene: ISKILL_SCENE;
    /** 键为单位配置 ID，值为 UnitResAtlas 图集资源 ID。 */
    resourceMappings: Record<string, string>;
    tracks: ISKILL_TRACK[];
    resolved: ISKILL_RESOLVED;
}

/** 单次技能播放的动作与完成回调。 */
interface ISKILL_PLAY_TASK {
    actions: SkillActionNode<ISKILL_TRACK>[];
    resolve: () => void;
    reject: (reason?: unknown) => void;
}

@ccclass('SkillMgr')
export class SkillMgr extends BaseMgr {


    private _mapActions: Map<number, ISKILL_PLAY_TASK>;
    private _skillIndex = 0;
    public initEvent(): void {
        super.initEvent();
        this._mapActions = new Map();
    }
    public getActionById(id: number) {
        return this._mapActions.get(id);
    }
    /**帧更新技能 */
    public update(dt: number): void {
        // 统一推进战斗时间，轨道延迟、飞行和强制移动只在此处应用倍速。
        const skillDt = dt * BattleMgr.getInstance().playSpeedRate;
        this._mapActions.forEach((task, index) => {
            task.actions.forEach(action => {
                action.updateTick(skillDt);
            });

            const isFinish = task.actions.every(action => action.CheckIsEnd());
            if (!isFinish) {
                return;
            }

            this.clear(index);
            task.resolve();
            EventManager.Instance.dispatch(GameEvent.Battle_Skill_Finish_Play, index);
        });
    }
    /**处理技能播放 */
    public async skillPlay(attackUnit: BattleUnit, beAttackUnits: BattleUnit[], damages: Map<string, number>, cardSkill?: ISkillData): Promise<void> {
        if (!beAttackUnits.length) {
            return;
        }
        const index = ++this._skillIndex;
        let skillCfg = cardSkill;
        // 未配置卡牌表现时沿用单位攻击表现，普通攻击和反击仍走原来的配置。
        if (!skillCfg?.effect) {
            const skillDataId = ConfigMgr.instance.SkillDataIndex.level_group[attackUnit.GetData().unitCfg.attack]?.[1];
            if (!skillDataId) {
                throw new Error(`未找到单位攻击技能：${attackUnit.GetData().unitCfg.attack}`);
            }
            skillCfg = ConfigMgr.instance.SkillData.get(skillDataId);
            if (!skillCfg) {
                throw new Error(`未找到技能配置：${skillDataId}`);
            }
        }
        const skill = ConfigMgr.instance.skillConfig.get(skillCfg.effect);
        if (!skill) {
            throw new Error(`未找到技能表现配置：${skillCfg.effect}`);
        }

        const _curActions: SkillActionNode<ISKILL_TRACK>[] = [];

        /**飞行行为 */
        let arrFlyItems: ISKILL_FLIGHT_TRACK[] = [];
        skill.tracks.forEach(item => {
            item.parentID = index;
            if (!item.enabled) {
                return;
            }
            switch (item.type) {
                case "caster":
                    let caster = PoolMgr.get(SkillActionAttacker);
                    caster.setData({ ...item, uId: attackUnit.GetData().uId, targetUID: beAttackUnits[0].GetData().uId });
                    _curActions.push(caster);
                    break;
                case "target":
                    for (let i = 0; i < beAttackUnits.length; i++) {
                        let beAttack = beAttackUnits[i];
                        let target = PoolMgr.get(SkillActionTarget);
                        target.setData({ ...item, uId: attackUnit.GetData().uId, targetUID: beAttack.GetData().uId });
                        _curActions.push(target);
                    }
                    break;
                case "damage":
                    for (let i = 0; i < beAttackUnits.length; i++) {
                        let beAttack = beAttackUnits[i];
                        let damage = PoolMgr.get(SkillActionDamage);
                        damage.setData({ ...item, uId: attackUnit.GetData().uId, targetUID: beAttack.GetData().uId, params: { ...item.params, damage: damages.get(beAttack.GetData().uId) } });
                        _curActions.push(damage);
                    }
                    break;
                case "effect":
                    if (item.params.multiTarget) {
                        for (let i = 0; i < beAttackUnits.length; i++) {
                            let beAttack = beAttackUnits[i];
                            let effect = PoolMgr.get(SkillActionEffect);
                            effect.setData({ ...item, uId: attackUnit.GetData().uId, targetUID: beAttack.GetData().uId });
                            _curActions.push(effect);
                        }
                    } else {
                        let effect = PoolMgr.get(SkillActionEffect);
                        effect.setData({ ...item, uId: attackUnit.GetData().uId, targetUID: beAttackUnits[0].GetData().uId });
                        _curActions.push(effect);
                    }
                    break;
                case "flight":
                    arrFlyItems.push(item);

                    break;
                case "move":

                    beAttackUnits.forEach(beAttack => {
                        const repel = PoolMgr.get(SkillActionRepel);
                        repel.setData({
                            ...item,
                            uId: attackUnit.GetData().uId,
                            targetUID: beAttack.GetData().uId,
                        });
                        _curActions.push(repel);
                    });
                    break;
            }
        });

        if (_curActions.length === 0) {
            return;
        }
        // 飞行行为需要后处理
        if (arrFlyItems.length > 0) {
            var effectActions: SkillActionEffect[] = _curActions.filter(action => {
                return action instanceof SkillActionEffect;
            })
            let isMultiTarget = effectActions[0]?.getData().params.multiTarget;
            arrFlyItems.forEach(flyItem => {
                let paramFly = flyItem.params as ISKILL_FLIGHT_PARAMS;
                let isMultiFly = paramFly.end.mode == "target" && isMultiTarget;
                if (isMultiFly) {
                    for (let i = 0; i < beAttackUnits.length; i++) {
                        let beAttack = beAttackUnits[i];
                        let fly = PoolMgr.get(SkillActionFly);
                        fly.setData({ ...flyItem, uId: attackUnit.GetData().uId, targetUID: beAttack.GetData().uId, bindEff: effectActions[i] });
                        _curActions.push(fly);
                    }
                } else {
                    let flight = PoolMgr.get(SkillActionFly);
                    flight.setData({ ...flyItem, uId: attackUnit.GetData().uId, targetUID: beAttackUnits[0].GetData().uId, bindEff: effectActions[0] });
                    _curActions.push(flight);
                }
            })
        }
        return new Promise<void>((resolve, reject) => {
            this._mapActions.set(index, {
                actions: _curActions,
                resolve,
                reject,
            });
        });
    }

    public getPosByPosStruct(pos: ISKILL_POSITION, uId: string, targetUID: string, offPos?: Vec2) {
        var resultPos = v3(pos.x, pos.y);
        var battleMgr = BattleMgr.getInstance();
        switch (pos.mode) {
            case "caster":
                resultPos = resultPos.add(battleMgr.GetUnitByUID(uId).node.position);
                break;
            case "target":
                resultPos = resultPos.add(battleMgr.GetUnitByUID(targetUID).node.position);
                break;
            case "custom":
                break;
        }
        if (offPos) {
            Vec3.add(resultPos, resultPos, offPos.toVec3());
        }
        return resultPos;
    }
    public clear(index: number): void {
        const task = this._mapActions.get(index);
        if (!task) {
            return;
        }

        this._mapActions.delete(index);
        task.actions.forEach(action => {
            action.clear();
            PoolMgr.put(action);
        });
    }
}


