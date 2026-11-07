import { EventTouch, Node, UITransform, Vec3, Widget, _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseWin } from '../../Component/BaseWin';
import { UIMananger } from '../../Component/UIMananger';
import { GMWin } from './GMWin';
const { ccclass } = _decorator;

@ccclass('GMEntryWin')
export class GMEntryWin extends BaseWin {
    @comp(BaseBtn, "btn_gm")
    private btn_gm: BaseBtn = null!;

    private is_dragging = false;
    private touch_start = new Vec3();
    private button_start = new Vec3();

    public initEvent(): void {
        this.addNodeEvent(this.btn_gm.node, Node.EventType.TOUCH_START, this.onTouchStart);
        this.addNodeEvent(this.btn_gm.node, Node.EventType.TOUCH_MOVE, this.onTouchMove);
        this.addNodeEvent(this.node, Node.EventType.SIZE_CHANGED, this.clampButton);
        this.addNodeEvent(this.btn_gm.node, Node.EventType.TOUCH_END, this.onClickGm);
        super.initEvent();
    }

    private onTouchStart(event: EventTouch): void {
        this.is_dragging = false;
        this.btn_gm.node.getComponent(Widget).enabled = false;
        this.touch_start.set(this.getTouchPosition(event));
        this.button_start.set(this.btn_gm.node.position);
    }

    private onTouchMove(event: EventTouch): void {
        const touch_position = this.getTouchPosition(event);
        const delta_x = touch_position.x - this.touch_start.x;
        const delta_y = touch_position.y - this.touch_start.y;
        if (!this.is_dragging && delta_x * delta_x + delta_y * delta_y < 100) {
            return;
        }
        this.is_dragging = true;
        this.btn_gm.node.setPosition(this.button_start.x + delta_x, this.button_start.y + delta_y, 0);
        this.clampButton();
    }

    private getTouchPosition(event: EventTouch): Vec3 {
        const touch_position = event.getUILocation();
        return this.node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(touch_position.x, touch_position.y, 0));
    }

    private clampButton(): void {
        const area_transform = this.node.getComponent(UITransform);
        const button_transform = this.btn_gm.node.getComponent(UITransform);
        const min_x = -area_transform.width * area_transform.anchorX + button_transform.width * button_transform.anchorX;
        const max_x = area_transform.width * (1 - area_transform.anchorX) - button_transform.width * (1 - button_transform.anchorX);
        const min_y = -area_transform.height * area_transform.anchorY + button_transform.height * button_transform.anchorY;
        const max_y = area_transform.height * (1 - area_transform.anchorY) - button_transform.height * (1 - button_transform.anchorY);
        const button_position = this.btn_gm.node.position;
        this.btn_gm.node.setPosition(
            Math.max(min_x, Math.min(max_x, button_position.x)),
            Math.max(min_y, Math.min(max_y, button_position.y)),
            button_position.z,
        );
    }

    private onClickGm(): void {
        if (this.is_dragging) {
            return;
        }
        const ui_manager = UIMananger.instance;
        if (ui_manager.checkWinIsOpenByClass(GMWin)) {
            ui_manager.closeWin(GMWin);
        } else {
            ui_manager.showWin(GMWin);
        }
    }
}
