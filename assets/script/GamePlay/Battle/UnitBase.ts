import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { AnimationCom } from '../../Component/AnimationCom';
import { IUnitData } from '../../Config/Typings/UnitData';
import { UNIT_ACTION } from '../../Common/GameEnum';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { GameUrl } from '../../Common/GameUrl';
import { comp } from '../../Common/Decorator';
const { ccclass, property } = _decorator;
export interface IActionData {
    actionType?: UNIT_ACTION;
    frameStart: number;
    frameEnd: number;
    /**
     * 帧率（播放速度）
     */
    frameRate: number;
}
/**
 * 所有帧动画单位基础类
 */
@ccclass('UnitBase')
export class UnitBase extends BaseComp {
    @comp(AnimationCom)
    animation: AnimationCom = null!;



    protected m_ActionData: Map<UNIT_ACTION, IActionData>;
    /**播放倍速 */
    protected playSpeedRate: number = 1;
    protected _data: IUnitData;
    protected m_curPlayData: IActionData;
    public init(): void {
        super.init();

        // this.animation.node.setScale(0.75, 0.75)
    }
    initEvent(): void {
        super.initEvent();
    }
    /**
     * 设置各动作帧数
     */
    protected SetActionFrame() {
        if (this._data) {
            this.m_ActionData = new Map<UNIT_ACTION, IActionData>();
            this.m_ActionData.set(UNIT_ACTION.IDLE, { actionType: UNIT_ACTION.IDLE, frameStart: 0, frameEnd: 5, frameRate: 10 });
            this.m_ActionData.set(UNIT_ACTION.MOVE, { actionType: UNIT_ACTION.MOVE, frameStart: 6, frameEnd: 8, frameRate: 10 });
            this.m_ActionData.set(UNIT_ACTION.BE_HIT, { actionType: UNIT_ACTION.BE_HIT, frameStart: 9, frameEnd: 10, frameRate: 10 });
            this.m_ActionData.set(UNIT_ACTION.DEAD, { actionType: UNIT_ACTION.DEAD, frameStart: 11, frameEnd: 13, frameRate: 10 });

            var attackFrameNum = this.animation.getTotalFrames() - 14;
            this.m_ActionData.set(UNIT_ACTION.ATTACK, { actionType: UNIT_ACTION.ATTACK, frameStart: 14, frameEnd: 13 + attackFrameNum, frameRate: 10 });
        }
    }
    /**
     * 
     * @param id 单位配置ID设置
     */
    public SetUnitId(id: number) {
        var cfg = ConfigMgr.instance.UnitData.get(id)
        if (cfg) {
            return this.SetConfigData(cfg);
        } else {
            console.log(`无效单位配置ID：${id}`)
        }
    }
    /**
     * 赋值单位配置数据
     * @param data 
     * @returns 
     */
    public SetConfigData(data: IUnitData): Promise<void> {
        this._data = data;
        return new Promise(resolve => {
            this.animation.loadFramesFromAtlas(data.animation_name, "").then(() => {
                this.SetActionFrame();
                resolve(null);
            })
        })

    }

    /**
     * 
    * @param actionName 播放的帧动作
     * @param loop 是否循环（默认true）
     * @param onComplete 播放完成回调
     * @param target 回调目标对象
     */
    public PlayAction(actionName: UNIT_ACTION, isLoop: boolean, onComplete?: Function, target?: any) {
        var actionData = this.m_ActionData.get(actionName);
        if (actionData) {
            this.m_curPlayData = actionData;
            this.animation.setFrameRate(actionData.frameRate * this.playSpeedRate);

            this.animation.play(actionData.frameStart, actionData.frameEnd, isLoop, false, onComplete, target);
        }
    }
    /**
     * 连续播放播放（如攻击后回到站立状态）
     */
    public PlayActions(actionName: UNIT_ACTION[], endAction: UNIT_ACTION = UNIT_ACTION.IDLE, onComplete?: Function, target?: any) {

        //播放完最后一个动作后回到结束动作
        if (actionName.length == 1) {
            this.PlayAction(actionName[0], false, () => {

                if (onComplete) {
                    if (target) {
                        onComplete.call(target)
                    } else {
                        onComplete();
                    }
                }
                this.PlayAction(endAction, true)
            }, this);
        }
        else if (actionName.length > 1) {
            this.PlayAction(actionName.shift(), false, () => { this.PlayActions(actionName, endAction, onComplete, target) }, this);
        }

    }
    public clear(): void {
        super.clear();
        this.playSpeedRate = 1;
    }
    public SetSpeedRate(rate: number) {
        if (this.playSpeedRate != rate) {
            this.playSpeedRate = rate;
            if (this.animation.isPlaying && this.m_curPlayData) {
                this.animation.setFrameRate(this.m_curPlayData.frameRate * this.playSpeedRate);
            }
        }
    }
    public GetCurPlayData() {
        return this.m_curPlayData;
    }
}


