import { _decorator, Component, director, EventTouch, game, Node } from 'cc';
import { BaseRenderCell } from '../../../Component/BaseRenderCell';
import { BaseIcon, BaseIconData } from './BaseIcon';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { comp } from '../../../Common/Decorator';
import { EventManager } from '../../../Common/EventManager';
import { GameEvent } from '../../../Common/GameEnum';
import { PVEMgr } from '../PVEMgr';
const { ccclass, property } = _decorator;

/**士兵格子本次手势的判定结果 */
enum SoldierGesture {
    /**位移还没超过判定距离，方向未定 */
    None,
    /**判定为列表滚动，本次手势不再响应 */
    Scroll,
    /**判定为拖拽上阵 */
    Drag,
}

export interface SoldierIconData extends BaseIconData {
    /**是否上阵中 */
    isInTeam?: boolean;
    /**当前拥有士兵数量 */
    num: number;
    uId: number;
}
@ccclass('SoldierIcon')
export class SoldierIcon extends BaseRenderCell<SoldierIconData> {
    @comp(BaseBtn)
    base_icon: BaseBtn = null!;

    @comp(BaseLabel)
    count: BaseLabel = null!;

    @comp(BaseSprite)
    InTeamState: BaseSprite = null!;

    private _baseIcon: BaseIcon;
    /** 战斗里才点选和拖拽上阵。不传按战斗处理 */
    private is_battle = true;
    // 判定方向的位移门槛(像素)，没超过之前不区分滚动和拖拽
    private avalibleDistance = 0;
    // 斜率判定系数：|dy| > |dx| * dragSlope 判为拖拽上阵，否则判为列表滚动。1 即 45 度
    private dragSlope = 0.2;
    // 手势起点，存数值而不是 Vec2：getLocation 返回的是引擎复用的对象，直接存引用会被后续移动改写
    private _beginTouchX = 0;
    private _beginTouchY = 0;
    // 本次手势已判定的结果
    private _gesture: SoldierGesture = SoldierGesture.None;
    // 是否有有效的起点
    private _hasBeginTouch = false;

    /** 士兵数据，以及这次是不是战斗界面。战斗里才能点选、拖拽上阵 */
    public setData(data: SoldierIconData, is_battle = true): void {
        this.is_battle = is_battle;
        super.setData(data);
    }

    public initEvent(): void {
        super.initEvent();

        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onMapClick);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_START, this.onTouchBegin);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_MOVE, this.onDragMove);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_CANCEL, this.onDragCancle);
    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        // 非战斗图标把点击和滚动交给外层列表。
        this.base_icon.interactable = this.is_battle;
        const data = this.getData();
        if (!data) {
            return;
        }
        this.GetBaseIcon().setData(data);
        this.count.string = data.num.toString();
        this.InTeamState.node.active = data.isInTeam;
    }
    public GetBaseIcon() {
        if (!this._baseIcon) {
            this._baseIcon = this.base_icon.node.addComponent(BaseIcon);
        }
        return this._baseIcon;
    }
    setSelected(selected: boolean): void {
        this.GetBaseIcon().is_select_bg.node.active = selected;
    }

    /**
     * 点击事件处理
     */
    protected onMapClick(event: EventTouch): void {
        if (!this.is_battle) {
            return;
        }
        // 先取走本次手势的判定结果再复位，避免影响下一次手势
        var gesture = this._gesture;
        this.resetGesture();
        // 拖拽上阵、列表滚动都不算点击；isDragingUnit 兜底窗口根节点捕获阶段的异步复位
        if (gesture != SoldierGesture.None || PVEMgr.getInstance().isDragingUnit) {
            return;
        }
        if (this.GetBaseIcon().is_select_bg.node.active) {
            this.setSelected(false);
            EventManager.Instance.dispatch(GameEvent.CANCLE_SELECT_SOLDIER, this);
        } else {

            this.setSelected(true);
            EventManager.Instance.dispatch(GameEvent.FIGHT_SELECT_SOLDIER, this);
        }
    }

    /**记录手势起点，并复位上一次的判定 */
    protected onTouchBegin(event: EventTouch) {
        if (!this.is_battle) {
            return;
        }
        var pos = event.getUILocation();
        this._beginTouchX = pos.x;
        this._beginTouchY = pos.y;
        this._hasBeginTouch = true;
        this._gesture = SoldierGesture.None;
    }
    /**按位移斜率判定：竖向拖拽上阵，横向交给列表滚动 */
    protected onDragMove(event: EventTouch) {
        if (!this.is_battle) {
            return;
        }
        if (this._gesture == SoldierGesture.Drag) {
            // 已经进入拖拽，这一次移动同样不能漏给外层的滚动列表
            event.propagationStopped = true;
            return;
        }
        if (this._gesture == SoldierGesture.Scroll || !this._hasBeginTouch) {
            return;
        }
        var pos = event.getUILocation();
        var dx = pos.x - this._beginTouchX;
        var dy = pos.y - this._beginTouchY;
        // 位移没过门槛之前方向不可靠，先不判定，列表照常跟手
        var limit = this.avalibleDistance;
        if (dx * dx + dy * dy <= limit * limit) {
            return;
        }
        if (Math.abs(dy) > Math.abs(dx) * this.dragSlope) {
            this._gesture = SoldierGesture.Drag;
            // 本节点是滚动列表的子节点，触摸事件先在子节点派发再冒泡到 ScrollView，
            // 这里截停后列表不会再吃到这一帧的移动
            event.propagationStopped = true;
            this.beginDrag();
        } else {
            // 横向位移为主，本次手势归属滚动列表，后面移到竖向也不再抢回来
            this._gesture = SoldierGesture.Scroll;
        }
    }
    /**拖出触碰范围外 */
    protected onDragCancle(event: EventTouch) {
        this.resetGesture();
    }
    private beginDrag() {
        PVEMgr.getInstance().isDragingUnit = true;
        // 抛出拖拽事件
        EventManager.Instance.dispatch(GameEvent.BEGIN_DRAG_SOLDIER, this.getData(), this.node.worldPosition);
        // 外部收到事件后会同步禁用滚动列表，后续移动不会再滚动
    }
    // 复位手势状态
    private resetGesture() {
        this._gesture = SoldierGesture.None;
        this._hasBeginTouch = false;
    }
}


