import { _decorator, EventTouch, isValid, Node } from 'cc';
import { BaseRenderCell } from '../../../Component/BaseRenderCell';
import { ISkillData } from '../../../Config/Typings/SkillData';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { comp } from '../../../Common/Decorator';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { lang } from '../../../Common/LangMgr';
import { BattleMgr } from '../BattleMgr';
import type { SkillCardDragCom } from './SkillCardDragCom';
const { ccclass } = _decorator;

@ccclass('SkillCardCell')
export class SkillCardCell extends BaseRenderCell<ISkillData> {
    @comp(BaseSprite)
    cardIcon: BaseSprite = null!;
    @comp(BaseLabel)
    lb_name: BaseLabel = null!;
    @comp(BaseSprite)
    select: BaseSprite = null!;

    private _dragCom: SkillCardDragCom = null;

    public setData(data: ISkillData): void {
        // 列表重新绑定同一份数据时也会刷新选中状态，统一结束旧瞄准。
        this._dragCom?.cancelCardTouch(this);
        if (this.isSelected()) {
            this.setSelected(false);
        }
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
        let data = this.getData();
        if (!data) {
            return;
        }
        this.cardIcon.setIconData(data.card_icon);
        this.lb_name.string = lang(data.name);
    }

    /**单击进入持续瞄准，拖动结束按地图落点处理。 */
    protected onMapClick(event: EventTouch): void {
        this._dragCom?.onCardTouchEnd(this, event);
    }

    protected onTouchBegin(event: EventTouch): void {
        this._dragCom = BattleMgr.getInstance().skillCardDragCom;
        if (!isValid(this._dragCom, true) || !this._dragCom.enabledInHierarchy) {
            this._dragCom = null;
            return;
        }
        this._dragCom?.onCardTouchBegin(this, event);
    }

    protected onSelectionChanged(): void {
        super.onSelectionChanged();
        // 预留：使用 this.isSelected() 实现卡牌选中/取消选中的视觉效果。
        this.select.node.active = this.isSelected();
    }

    protected onDragMove(event: EventTouch): void {
        this._dragCom?.onCardTouchMove(this, event);
    }

    /**拖出卡牌后松手也可能收到 CANCEL，实际结果以地图落点为准。 */
    protected onDragCancle(event: EventTouch): void {
        this._dragCom?.onCardTouchEnd(this, event);
    }

    public clear(): void {
        this._dragCom?.cancelCardTouch(this);
        this._dragCom = null;
        if (this.isSelected()) {
            this.setSelected(false);
        }
        super.clear();
    }
}


