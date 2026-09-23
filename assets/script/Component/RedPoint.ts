import { _decorator, Component, Node, tween, Tween, v3, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('RedPoint')
export class RedPoint extends Component {
    @property
    isAnimation = true;
    private _isRed: boolean
    private _targetScale = v3(1.5, 1.5, 1);
    start() {
    }
    protected onLoad(): void {
        this.isRed = false;

    }

    update(deltaTime: number) {

    }
    get isRed(): boolean {
        return this._isRed
    }
    set isRed(val: boolean) {
        this._isRed = val;
        if (this.node) {
            this.node.active = val;
            Tween.stopAllByTarget(this.node)
            if (val && this.isAnimation) {
                tween(this.node).to(0.4, { scale: this._targetScale }).to(0.4, { scale: Vec3.ONE }).union().repeatForever().start();
            }
        }
    }
}


