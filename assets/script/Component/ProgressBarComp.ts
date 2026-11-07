import { _decorator, Component, UITransform, Widget } from 'cc';
const { ccclass } = _decorator;

/**
 * 九宫进度条。挂在进度条根节点上，子节点 progress 是填充图。
 * 填充从左边起，只改宽度。编辑器里用 Widget 跟着父节点拉伸，运行时关掉，避免把条拉满。
 */
@ccclass('ProgressBarComp')
export class ProgressBarComp extends Component {
    /** ratio 为 0 到 1 */
    public setProgress(ratio: number): void {
        const value = ratio < 0 ? 0 : (ratio > 1 ? 1 : ratio);
        const barNode = this.node.getChildByName('progress');
        const widget = barNode.getComponent(Widget);
        const parentTrans = barNode.parent.getComponent(UITransform);
        const full = parentTrans.width - widget.left - widget.right;
        widget.enabled = false;
        barNode.active = value > 0;
        barNode.getComponent(UITransform).width = full * value;
        barNode.setPosition(-parentTrans.width * parentTrans.anchorX + widget.left, barNode.position.y, 0);
    }
}
