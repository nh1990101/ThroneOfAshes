import { _decorator, Button, Component, Node, Vec3 } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { HexagonData } from './HexagonData';
const { ccclass, property } = _decorator;

/**
 * 战斗六边形地形
 */
@ccclass('HexagonCell')
export class HexagonCell extends BaseComp {
    private _sp_hexagon: BaseSprite;
    private _data: HexagonData;
    private _touch: Button;

    /** 六边形宽度 */
    public static readonly HEX_WIDTH = 98;
    /** 六边形高度 */
    public static readonly HEX_HEIGHT = 86;
    /**两六边形左右留宽 */
    public static readonly HEX_WIDTH_GAP = 2;
    /**两六边形上下留宽 */
    public static readonly HEX_HEIGHT_GAP = 3;

    init() {
        super.init();
        this._sp_hexagon = this.getComponent(BaseSprite);
        this._touch = this.getComponent(Button);
    }

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_CANCEL, this.OnClickCell);
    }

    OnClickCell() {

    }

    public SetData(data: HexagonData) {
        this._data = data;
        this.UpdatePos();
    }

    public GetData(): HexagonData {
        return this._data;
    }

    /**
     * 根据轴坐标更新位置
     */
    public UpdatePos() {
        if (!this._data) return;

        const pos = this._data.toPixel(HexagonCell.HEX_WIDTH + HexagonCell.HEX_WIDTH_GAP, HexagonCell.HEX_HEIGHT + HexagonCell.HEX_HEIGHT_GAP);
        this.node.setPosition(new Vec3(pos.x, pos.y, 0));

        // 打印坐标信息
        // console.log(`HexCell[${this._data.q},${this._data.r}] -> Pos(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
    }
}


