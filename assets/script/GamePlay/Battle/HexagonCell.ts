import { _decorator, Button, Component, Label, Node, Vec3 } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { HexagonData } from './HexagonData';
const { ccclass, property } = _decorator;

/**
 * 战斗六边形地形
 */
@ccclass('HexagonCell')
export class HexagonCell extends BaseComp {
    @property(Label)
    lb_pos: Label;
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
        this.UpdatePosLabel();
    }

    public initEvent(): void {
        super.initEvent();

    }


    public SetData(data: HexagonData) {
        this._data = data;
        this.UpdatePos();
        this.UpdatePosLabel();
    }

    public GetData(): HexagonData {
        return this._data;
    }

    /**
     * 根据轴坐标更新位置
     */
    public UpdatePos() {
        if (!this._data) return;

        const pos = this._data.toPixel();
        this.node.setPosition(new Vec3(pos.x, pos.y, 0));

        // 打印坐标信息
        // console.log(`HexCell[${this._data.q},${this._data.r}] -> Pos(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
    }

    /**获取世界坐标 */
    public GetWorldPos() {
        return this.node.worldPosition;
    }
    public GetMapGridPos(): number[] {
        var data = this.GetData();
        if (data) {
            return [data.q, data.r];
        }
        return []
    }
    private UpdatePosLabel() {
        if (this.lb_pos) {
            this.lb_pos.string = `${this._data.q}_${this._data.r}`;
        }
    }
}


