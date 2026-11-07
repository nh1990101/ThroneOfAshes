import { _decorator, Color, EventMouse, EventTouch, Graphics, input, Input, isValid, Node, UITransform, Vec2, Vec3 } from 'cc';
import { BaseComp } from '../../../Component/BaseComp';
import { ISkillData } from '../../../Config/Typings/SkillData';
import { BattleMapCom } from '../BattleMapCom';
import { HexagonData } from '../HexagonData';
import type { SkillCardCell } from './SkillCardCell';
const { ccclass } = _decorator;

export interface SkillCardDragCallbacks {
    /**由战斗窗口判断当前手牌和本回合的释放额度是否有效。 */
    canUse?: (skill: ISkillData) => boolean;
    /**单击卡牌已进入持续瞄准后的业务回调。 */
    onClick?: (skill: ISkillData) => void;
    onRelease?: (skill: ISkillData, target: HexagonData) => void;
    onCancel?: (skill: ISkillData) => void;
}

/**战斗卡牌的触摸会话、虚线曲线及地图范围预览。挂在战斗窗口根节点。 */
@ccclass('SkillCardDragCom')
export class SkillCardDragCom extends BaseComp {
    public dragDistance = 8;
    public lineWidth = 4;
    public dashLength = 12;
    public dashGap = 8;
    public curveHeight = 180;
    public curveBendRatio = 0.5;

    private _mapCom: BattleMapCom = null;
    private _callbacks: SkillCardDragCallbacks = null;
    private _card: SkillCardCell = null;
    private _skill: ISkillData = null;
    private _touchId: number = null;
    private _touchSessionVersion = 0;
    private _ignoredTouchIds: Set<number> = new Set();
    private _beginX = 0;
    private _beginY = 0;
    private _isDragging = false;
    private _isAiming = false;
    private _isTargetTouch = false;
    private _line: Graphics = null;
    private _lineTransform: UITransform = null;
    private _startWorld = new Vec3();
    private _startPoint = new Vec3();
    private _endPoint = new Vec3();

    public setup(mapCom: BattleMapCom, callbacks: SkillCardDragCallbacks): void {
        this.resetTouch();
        this._mapCom = mapCom;
        this._callbacks = callbacks;
    }

    public onCardTouchBegin(card: SkillCardCell, event: EventTouch): void {
        if (!this.enabledInHierarchy || !this._mapCom?.node.activeInHierarchy || !card.getData() || this._touchId != null
            || (this._callbacks?.canUse && !this._callbacks.canUse(card.getData()))) {
            return;
        }
        if (this._card && this._card != card) {
            // 换牌只清旧卡牌与技能预览，士兵范围提示保持隐藏直到新会话结束。
            const version = this.resetTouch(true, true);
            // 旧卡牌的取消选中钩子可能同步清理或开始另一会话，保留重入后的状态。
            if (version != this._touchSessionVersion) {
                return;
            }
            if (!this.enabledInHierarchy || !isValid(card, true) || !card.node.activeInHierarchy
                || !card.getData() || !isValid(this._mapCom, true) || !this._mapCom.node.activeInHierarchy) {
                this.resetTouch();
                return;
            }
        }
        const pos = event.getUILocation();
        this._touchSessionVersion++;
        this._card = card;
        this._skill = card.getData();
        this._touchId = event.getID();
        this._beginX = pos.x;
        this._beginY = pos.y;
        this._isDragging = false;
        this._isTargetTouch = false;
        // 卡牌认领触摸后，根节点捕获阶段仍能持续收到移出卡牌后的 MOVE/END/CANCEL。
        this.node.on(Node.EventType.TOUCH_START, this.onTargetTouchBegin, this, true);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this, true);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this, true);
        this.node.on(Node.EventType.MOUSE_MOVE, this.onMouseMove, this, true);
        // UI 命中会阻止全局鼠标派发；根捕获处理 UI 内移动，全局监听补充 UI 外移动。
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        event.propagationStopped = true;
    }

    public onCardTouchMove(card: SkillCardCell, event: EventTouch): void {
        if (card == this._card) {
            this.onTouchMove(event);
        }
    }

    public onCardTouchEnd(card: SkillCardCell, event: EventTouch): void {
        if (card == this._card) {
            this.onTouchEnd(event);
        }
    }

    /**卡牌回收或换数据时仅清理会话，避免将旧卡牌当成新卡牌释放。 */
    public cancelCardTouch(card: SkillCardCell): void {
        if (card == this._card) {
            this.resetTouch();
        }
    }

    /**持续瞄准后的下一次触摸由根捕获接管，防止地图同时移动或选择单位。 */
    private onTargetTouchBegin(event: EventTouch): void {
        if (this._touchId != null) {
            if (event.getID() != this._touchId) {
                this._ignoredTouchIds.add(event.getID());
                this.stopTouchPropagation(event);
            }
            return;
        }
        if (!this._isAiming || !this.hasValidCard()) {
            return;
        }
        // 点击卡牌仍交给卡牌处理，支持切换技能以及再次按住当前卡牌拖动。
        for (let target = event.target as Node; target && target != this.node; target = target.parent) {
            if (target.getComponent('SkillCardCell')) {
                return;
            }
        }
        this._touchId = event.getID();
        this._isTargetTouch = true;
        this.stopTouchPropagation(event);
        this.updateAim(event.getUILocation());
    }

    private onMouseMove(event: EventMouse): void {
        if (this._isAiming && this._touchId == null && this.hasValidCard()) {
            this.updateAim(event.getUILocation());
        }
    }

    private onTouchMove(event: EventTouch): void {
        if (this.consumeIgnoredTouch(event)) {
            return;
        }
        if (!this.isCurrentTouch(event)) {
            return;
        }
        this.stopTouchPropagation(event);
        const pos = event.getUILocation();
        if (!this._isDragging && !this._isTargetTouch) {
            const dx = pos.x - this._beginX;
            const dy = pos.y - this._beginY;
            if (dx * dx + dy * dy <= this.dragDistance * this.dragDistance) {
                return;
            }
            this._isDragging = true;
            if (!this.beginAiming()) {
                return;
            }
        }
        this.updateAim(pos);
    }

    private beginAiming(): boolean {
        const card = this._card;
        this._isAiming = true;
        this._mapCom.setUnitHintsHidden(true);
        this.createAimLine();
        if (!card.isSelected()) {
            card.setSelected(true);
        }
        // 选中钩子由卡牌自行实现，允许其中同步刷新或关闭窗口。
        return this._card == card && this._isAiming && this.hasValidCard();
    }

    private updateAim(pos: Vec2): void {
        this.drawAimLine(pos);
        const cell = this._mapCom.getGridCellByUILocation(pos);
        // 经过地图外立即取消有效瞄准和红色区域；曲线仍跟随指针，回到地图可重新瞄准。
        this._mapCom.showSkillAttackArea(cell, this._skill.attack_area);
    }

    private onTouchEnd(event: EventTouch): void {
        // ScrollView 人工派发的取消不是手指松开，不能结束技能拖动。
        if (event.simulate || this.consumeIgnoredTouch(event, true) || !this.isCurrentTouch(event)) {
            return;
        }
        this.stopTouchPropagation(event);
        const skill = this._skill;
        const callbacks = this._callbacks;
        const shouldFinish = this._isDragging || this._isTargetTouch;
        if (!shouldFinish && event.type == Node.EventType.TOUCH_END) {
            // 第一次点击只进入持续瞄准，不能把同一次抬手当成选点或取消。
            this._touchId = null;
            if (this.beginAiming()) {
                this.updateAim(event.getUILocation());
                callbacks?.onClick?.(skill);
            }
            return;
        }
        const cell = shouldFinish ? this._mapCom.getGridCellByUILocation(event.getUILocation()) : null;
        const target = cell?.GetData();
        const wasAiming = this._isAiming;
        // 先清理，再调用业务入口，允许回调刷新列表或关闭窗口。
        this.resetTouch();
        if (shouldFinish) {
            if (target) {
                callbacks?.onRelease?.(skill, target);
            } else {
                callbacks?.onCancel?.(skill);
            }
        } else if (wasAiming) {
            callbacks?.onCancel?.(skill);
        }
    }

    private isCurrentTouch(event: EventTouch): boolean {
        return this._touchId != null && event.getID() == this._touchId && this.hasValidCard();
    }

    /**额外触点整段消费，主触点先松手后也不能让剩余抬手误点地图。 */
    private consumeIgnoredTouch(event: EventTouch, ended = false): boolean {
        const id = event.getID();
        if (!this._ignoredTouchIds.has(id)) {
            return false;
        }
        this.stopTouchPropagation(event);
        if (ended) {
            this._ignoredTouchIds.delete(id);
            if (!this._card && this._ignoredTouchIds.size == 0) {
                this.removeTouchTracking();
            }
        }
        return true;
    }

    private hasValidCard(): boolean {
        if (!this._card) {
            return false;
        }
        if (!this.enabledInHierarchy || !isValid(this.node, true) || !isValid(this._card, true)
            || !isValid(this._card.node, true) || !this._card.node.activeInHierarchy
            || this._card.getData() != this._skill || !isValid(this._mapCom, true)
            || !this._mapCom.node.activeInHierarchy
            || (this._callbacks?.canUse && !this._callbacks.canUse(this._skill))) {
            this.resetTouch();
            return false;
        }
        return true;
    }

    private stopTouchPropagation(event: EventTouch): void {
        event.propagationStopped = true;
        event.propagationImmediateStopped = true;
    }

    private createAimLine(): void {
        if (!this._line?.isValid) {
            const lineNode = new Node('SkillCardAimLine');
            lineNode.layer = this.node.layer;
            this.node.addChild(lineNode);
            this._lineTransform = lineNode.addComponent(UITransform);
            this._line = lineNode.addComponent(Graphics);
            this._line.strokeColor = Color.WHITE;
        }
        this._line.node.active = true;
        this._line.node.setSiblingIndex(this.node.children.length - 1);
    }

    /**按曲线的近似弧长分段，保持不同长度曲线上的虚线长度和间距一致。 */
    private drawAimLine(pointer: Vec2): void {
        const cardTransform = this._card.node.getComponent(UITransform);
        this._startWorld.set((0.5 - cardTransform.anchorX) * cardTransform.width,
            (1 - cardTransform.anchorY) * cardTransform.height, 0);
        cardTransform.convertToWorldSpaceAR(this._startWorld, this._startWorld);
        this._lineTransform.convertToNodeSpaceAR(this._startWorld, this._startPoint);
        this._endPoint.set(pointer.x, pointer.y, 0);
        this._lineTransform.convertToNodeSpaceAR(this._endPoint, this._endPoint);

        const start = this._startPoint;
        const end = this._endPoint;
        const distance = Math.hypot(end.x - start.x, end.y - start.y);
        const bend = Math.min(this.curveHeight, distance * this.curveBendRatio);
        const controlX = (start.x + end.x) / 2;
        const controlY = Math.max(start.y, end.y) + bend;
        const samples = Math.min(512, Math.max(16, Math.ceil((distance + bend * 2) / 4)));
        const dashLength = Math.max(1, this.dashLength);
        const dashGap = Math.max(1, this.dashGap);
        const line = this._line;
        line.clear();
        line.lineWidth = this.lineWidth;
        line.moveTo(start.x, start.y);
        let previousX = start.x;
        let previousY = start.y;
        let drawing = true;
        let remaining = dashLength;
        for (let i = 1; i <= samples; i++) {
            const t = i / samples;
            const s = 1 - t;
            const x = s * s * start.x + 2 * s * t * controlX + t * t * end.x;
            const y = s * s * start.y + 2 * s * t * controlY + t * t * end.y;
            const dx = x - previousX;
            const dy = y - previousY;
            const length = Math.hypot(dx, dy);
            let travelled = 0;
            while (length - travelled > 0.0001) {
                const step = Math.min(remaining, length - travelled);
                travelled += step;
                const px = previousX + dx * travelled / length;
                const py = previousY + dy * travelled / length;
                if (drawing) {
                    line.lineTo(px, py);
                } else {
                    line.moveTo(px, py);
                }
                remaining -= step;
                if (remaining <= 0.0001) {
                    drawing = !drawing;
                    remaining = drawing ? dashLength : dashGap;
                }
            }
            previousX = x;
            previousY = y;
        }
        line.stroke();
    }

    private removeTouchTracking(): void {
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this, true);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this, true);
    }

    private resetTouch(keepIgnoredTouches = true, keepUnitHintsHidden = false): number {
        const version = ++this._touchSessionVersion;
        const card = this._card;
        this.node.off(Node.EventType.TOUCH_START, this.onTargetTouchBegin, this, true);
        if (!keepIgnoredTouches) {
            this._ignoredTouchIds.clear();
        }
        if (this._ignoredTouchIds.size == 0) {
            this.removeTouchTracking();
        }
        this.node.off(Node.EventType.MOUSE_MOVE, this.onMouseMove, this, true);
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this._card = null;
        this._skill = null;
        this._touchId = null;
        this._isDragging = false;
        this._isAiming = false;
        this._isTargetTouch = false;
        if (this._mapCom?.isValid) {
            this._mapCom.clearSkillAttackArea();
            if (!keepUnitHintsHidden) {
                this._mapCom.setUnitHintsHidden(false);
            }
        }
        if (this._line?.isValid) {
            this._line.clear();
            this._line.node.active = false;
        }
        if (isValid(card, true) && card.isSelected()) {
            card.setSelected(false);
        }
        return version;
    }

    public clear(): void {
        this.resetTouch(false);
        super.clear();
    }
}
