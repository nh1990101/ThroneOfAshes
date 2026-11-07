import { _decorator, Component, Node, tween, Vec3, UIOpacity, Tween } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { comp } from '../../Common/Decorator';
import { BaseComp } from '../../Component/BaseComp';
const { ccclass, property } = _decorator;

@ccclass('FlyNotice')
export class FlyNotice extends BaseComp {
    @comp(BaseLabel)
    lb_notice: BaseLabel = null!;

    private uiOpacity: UIOpacity = null!;
    private positionTween: Tween<Node> = null!; // 保存位置移动动画实例

    showTips(showText: string, callback?: () => void): void {
        this.lb_notice.setText(showText);

        // 获取或添加透明度组件
        this.uiOpacity = this.node.getComponent(UIOpacity);
        if (!this.uiOpacity) {
            this.uiOpacity = this.node.addComponent(UIOpacity);
        }

        // 初始状态
        this.node.setScale(0.5, 0.5, 1);
        this.uiOpacity.opacity = 255;

        // 飘字动画：放大 + 缩小
        tween(this.node)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
            .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'sineOut' })
            .delay(0.3)
            .start();

        // 开始向上飘动（由moveUp统一管理，持续整个生命周期）
        this.startFloatUp();

        // 淡出动画
        tween(this.uiOpacity)
            .delay(0.8)
            .to(0.7, { opacity: 0 }, { easing: 'sineIn' })
            .call(() => {
                if (callback) {
                    callback();
                }
            })
            .start();
    }

    // 开始持续向上飘动的动画
    private startFloatUp(): void {
        if (this.positionTween) {
            this.positionTween.stop();
        }
        this.positionTween = tween(this.node)
            .by(1.5, { position: new Vec3(0, 100, 0) }, { easing: 'sineOut' })
            .start();
    }

    // 让飘字向上移动指定距离，为新飘字让位
    public moveUp(distance: number): void {
        // 停止当前的位置动画
        if (this.positionTween) {
            this.positionTween.stop();
        }

        // 获取当前位置和目标位置
        const currentPos = this.node.position.clone();
        const targetY = currentPos.y + distance;

        // 平滑移动到新位置，然后继续向上飘动
        this.positionTween = tween(this.node)
            .to(0.3, { position: new Vec3(currentPos.x, targetY, currentPos.z) }, { easing: 'sineOut' })
            .call(() => {
                // 移动完成后，继续向上飘动
                this.startFloatUp();
            })
            .start();
    }

    public clear(): void {
        super.clear();
        // 停止所有动画，避免回收时动画未完成导致的异常
        tween(this.node).stop();
        if (this.uiOpacity) {
            tween(this.uiOpacity).stop();
        }
        if (this.positionTween) {
            this.positionTween.stop();
            this.positionTween = null!;
        }
    }

}
