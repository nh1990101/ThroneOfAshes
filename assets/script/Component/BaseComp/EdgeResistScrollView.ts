import { _decorator, CCFloat, ScrollView, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/** 引擎 ScrollView 越界后把本帧位移乘的固定系数 */
const ENGINE_OUT_OF_BOUNDARY_SCALE = 0.5;

/**
 * 越界拖动：显示距离 = (c * 手指距离 * 视口) / (视口 + c * 手指距离)
 * 越出界越沉，显示距离趋近视口大小。往回拖走反函数，回到界内的部分恢复 1:1。
 */
@ccclass('EdgeResistScrollView')
export class EdgeResistScrollView extends ScrollView {

    @property({ type: CCFloat, tooltip: "越界后的拖动阻力。越小越沉，1 表示刚出界时接近跟手。填 0 用原来的固定减速" })
    edgeResist = 0.2;

    protected _scrollChildren(deltaMove: Vec3): void {
        const viewTrans = this.view;
        if (this.elastic && this.edgeResist > 0 && viewTrans) {
            const outOfBoundary = this._getHowMuchOutOfBoundary();
            const viewSize = viewTrans.contentSize;
            deltaMove.x = scaleEdgeDelta(deltaMove.x, outOfBoundary.x, viewSize.width, this.edgeResist);
            deltaMove.y = scaleEdgeDelta(deltaMove.y, outOfBoundary.y, viewSize.height, this.edgeResist);
        }
        super._scrollChildren(deltaMove);
    }
}

function scaleEdgeDelta(delta: number, outAmount: number, viewSize: number, resist: number): number {
    if (outAmount === 0 || viewSize <= 0) {
        return delta;
    }
    const inwardSign = Math.sign(outAmount);
    const inward = inwardTravel(delta * inwardSign, Math.abs(outAmount), viewSize, resist);
    return inward * inwardSign / ENGINE_OUT_OF_BOUNDARY_SCALE;
}

function inwardTravel(pull: number, displayed: number, viewSize: number, resist: number): number {
    const limit = viewSize * (1 - 1e-6);
    let moved = 0;
    if (displayed > limit) {
        const excess = displayed - limit;
        if (pull <= excess) {
            return pull > 0 ? pull : 0;
        }
        moved = excess;
        pull -= excess;
        displayed = limit;
    }
    const finger = (displayed * viewSize) / (resist * (viewSize - displayed));
    const nextFinger = finger - pull;
    if (nextFinger <= 0) {
        return moved + displayed - nextFinger;
    }
    const nextDisplayed = (resist * nextFinger * viewSize) / (viewSize + resist * nextFinger);
    return moved + displayed - nextDisplayed;
}
