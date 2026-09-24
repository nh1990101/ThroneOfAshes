import { _decorator, Component, Node } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { AnimationCom } from '../../Component/AnimationCom';
import { IUnitData } from '../../Config/Typings/UnitData';
import { ResUrl, UNIT_ACTION } from '../../Common/GameEnum';
import { ConfigMgr } from '../../Config/ConfigMgr';
const { ccclass, property } = _decorator;
export interface IActionData {
    frameStart: number;
    frameEnd: number;
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
            this.m_ActionData.set(UNIT_ACTION.IDLE, { frameStart: 0, frameEnd: 5 });
            this.m_ActionData.set(UNIT_ACTION.MOVE, { frameStart: 6, frameEnd: 8 });
            this.m_ActionData.set(UNIT_ACTION.BE_HIT, { frameStart: 9, frameEnd: 10 });
            this.m_ActionData.set(UNIT_ACTION.DEAD, { frameStart: 11, frameEnd: 13 });
            this.m_ActionData.set(UNIT_ACTION.ATTACK, { frameStart: 14, frameEnd: this._data.attack });
        }
    }
    /**
     * 
     * @param id 单位配置ID设置
     */
    public SetUnitId(id: number) {
        var cfg = ConfigMgr.instance.UnitData.get(id)
        if (cfg) {
            this.SetConfigData(cfg);
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
        return this.animation.loadFramesFromAtlas(`${ResUrl.UnitAtlasUrl}${data.id}/${data.id}`, "");
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
            this.animation.play(actionData.frameStart, actionData.frameEnd, isLoop, onComplete, target);
        }
    }
}


