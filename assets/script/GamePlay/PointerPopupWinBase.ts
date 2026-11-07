import { _decorator, Layout, Node, UITransform, Vec3, Widget } from 'cc';
import { BaseWin } from '../Component/BaseWin';
const { ccclass } = _decorator;

/** 弹窗相对目标的方向。不传时在目标上方 */
export const PointerDirect = {
    Top: 1,
    Bottom: 2,
} as const;

const POINTER_OFFSET = 0;

export interface PointerPopupParam {
    /** 弹窗跟着的节点 */
    go: Node;
    /** 是否显示黑色遮罩。不传则显示 */
    show_mask?: boolean;
    force_direct?: typeof PointerDirect.Top | typeof PointerDirect.Bottom;
}

/** 跟着目标弹出的窗口。子类只负责刷自己的内容，框的位置由这里摆 */
@ccclass('PointerPopupWinBase')
export class PointerPopupWinBase extends BaseWin {

    protected popup: PointerPopupParam = null;

    public showWin(popup: PointerPopupParam): void {
        this.popup = popup;
        super.showWin(popup);
    }

    public OnRefreshUI(): void {
        if (!this.popup) {
            return;
        }
        this.node.getChildByPath('bg_mask/mask').active = this.popup.show_mask !== false;
        this.refreshPopup();
        this.placeFollow(this.popup.go, this.popup.force_direct);
    }

    /** 子类在这里刷文字和框的大小，摆放会读摆好之后的窗口尺寸 */
    protected refreshPopup(): void {
    }

    /** 气泡底边在目标顶边上方。Bottom 时改到目标下方。左右留白把框留在跟随区域内 */
    private placeFollow(go: Node, force_direct?: PointerPopupParam['force_direct']): void {
        if (!go.isValid || !go.activeInHierarchy) {
            return;
        }
        const follow_area = this.node.getChildByName('FollowArea');
        follow_area.getComponent(Widget).updateAlignment();
        const follow = follow_area.getChildByName('Follow');
        const height_area = follow.getChildByName('HeightArea');
        const window = height_area.getChildByName('Window');
        const empty_left = height_area.getChildByName('EmptyLeft');
        const empty_right = height_area.getChildByName('EmptyRight');

        const target_box = go.getComponent(UITransform).getBoundingBoxToWorld();
        const follow_trans = follow.getComponent(UITransform);
        follow_trans.setAnchorPoint(0.5, 0.5);
        follow_trans.setContentSize(target_box.width, target_box.height);
        follow.setWorldPosition(
            target_box.x + target_box.width / 2,
            target_box.y + target_box.height / 2,
            0,
        );

        const area_trans = follow_area.getComponent(UITransform);
        const follow_pos = area_trans.convertToNodeSpaceAR(follow.worldPosition);
        const area_width = area_trans.contentSize.width;
        const direct = force_direct ?? PointerDirect.Top;
        const window_trans = window.getComponent(UITransform);
        const window_height = window_trans.contentSize.height;
        const height_trans = height_area.getComponent(UITransform);
        height_trans.setAnchorPoint(0.5, 0.5);
        height_trans.setContentSize(area_width, window_height);

        const half_target_h = target_box.height / 2;
        const center_y = direct === PointerDirect.Bottom
            ? follow_pos.y - half_target_h - POINTER_OFFSET - window_height / 2
            : follow_pos.y + half_target_h + POINTER_OFFSET + window_height / 2;
        const center_world = area_trans.convertToWorldSpaceAR(new Vec3(0, center_y, 0));
        height_area.setWorldPosition(center_world);

        const is_left = follow_pos.x < 0;
        const follow_offset = follow_pos.x * (is_left ? 1 : -1);
        const preferred = Math.max(area_width / 2 + follow_offset, 0);
        const spacer = Math.max(area_width - window_trans.contentSize.width, 0);
        const left_share = is_left ? preferred : area_width - preferred;
        const left_width = area_width > 0 ? left_share / area_width * spacer : 0;
        empty_left.getComponent(UITransform).setContentSize(left_width, window_height);
        empty_right.getComponent(UITransform).setContentSize(spacer - left_width, window_height);
        height_area.getComponent(Layout).updateLayout();
    }
}
