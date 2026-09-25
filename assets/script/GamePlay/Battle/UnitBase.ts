import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { AnimationCom } from '../../Component/AnimationCom';
import { IUnitData } from '../../Config/Typings/UnitData';
import { UNIT_ACTION } from '../../Common/GameEnum';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { GameUrl } from '../../Common/GameUrl';
const { ccclass, property } = _decorator;
export interface IActionData {
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
    @property(AnimationCom)
    animation: AnimationCom;

    protected m_ActionData: Map<UNIT_ACTION, IActionData>;

    private _data: IUnitData;
    public init(): void {
        super.init();


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
            this.m_ActionData.set(UNIT_ACTION.IDLE, { frameStart: 0, frameEnd: 5, frameRate: 10 });
            this.m_ActionData.set(UNIT_ACTION.MOVE, { frameStart: 6, frameEnd: 8, frameRate: 10 });
            this.m_ActionData.set(UNIT_ACTION.BE_HIT, { frameStart: 9, frameEnd: 10, frameRate: 10 });
            this.m_ActionData.set(UNIT_ACTION.DEAD, { frameStart: 11, frameEnd: 13, frameRate: 10 });
            this.m_ActionData.set(UNIT_ACTION.ATTACK, { frameStart: 14, frameEnd: this._data.attack, frameRate: 10 });
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
        }
    }
    /**
     * 赋值单位配置数据
     * @param data 
     * @returns 
     */
    public SetConfigData(data: IUnitData): Promise<void> {
        this._data = data;
        this.SetActionFrame();
        return this.animation.loadFramesFromAtlas(GameUrl.UnitAtlasUrl.format(data.id), "");
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
            this.animation.setFrameRate(actionData.frameRate);
            this.animation.play(actionData.frameStart, actionData.frameEnd, isLoop, onComplete, target);
        }
    }
    /**
     * 连续播放播放（如攻击后回到站立状态）
     */
    public PlayActions(actionName: UNIT_ACTION[], endAction: UNIT_ACTION = UNIT_ACTION.IDLE, onComplete?: Function, target?: any) {

        //播放完最后一个动作后回到结束动作
        if (actionName.length == 1) {
            this.PlayAction(actionName[0], false, () => { this.PlayAction(endAction, true, onComplete, target) }, this);
        }
        else if (actionName.length > 1) {
            this.PlayAction(actionName.shift(), false, () => { this.PlayActions(actionName, endAction, onComplete, target) });
        }

    }
  
}


