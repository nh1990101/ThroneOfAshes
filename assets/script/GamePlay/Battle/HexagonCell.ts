import { _decorator, Button, Component, Label, Node, Vec3 } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { HexagonData } from './HexagonData';
import { GameUrl } from '../../Common/GameUrl';
const { ccclass, property } = _decorator;

/**
 * 战斗六边形地形
 */
@ccclass('HexagonCell')
export class HexagonCell extends BaseComp {
    @property(Label)
    lb_pos: Label;

    protected m_data: HexagonData;

    private _sp_hexagon: BaseSprite;
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
        this.m_data = data;
        if (this.isInit) {
            this.SetNormal();
        }
        this.UpdatePos();
        this.UpdatePosLabel();
    }

    public GetData(): HexagonData {
        return this.m_data;
    }

    /**
     * 根据轴坐标更新位置
     */
    public UpdatePos() {
        if (!this.m_data) return;

        const pos = this.m_data.toPixel();
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
            this.lb_pos.string = `${this.m_data.q}_${this.m_data.r}`;
        }
    }
    public ShowPosLabel(bolShow: boolean) {
        this.lb_pos.node.active = bolShow;
    }
    /**
     * 
     * @param data 更新后的格子状态
     */
    public UpdateData(data: HexagonData) {
        this.m_data = data;
        this.UpdateShowStatus();
    }
    /**更新显示状态 */
    public UpdateShowStatus() {
        //如果是高亮状态下（即检测状态），根据格子是否可移动来显示颜色
        if (this.m_data.highlighted) {
            if (this.m_data.isWalkable() && this.m_data.isEmpty()) {
                this.SetGreen();
            } else {
                this.SetRed();
            }
        } else {
            this.SetNormal();
        }
    }
    public SetNormal() {
        this._sp_hexagon.setSpriteFromAtlas("ui_battle_select_frame", GameUrl.Atlas_Battle);
    }
    public SetRed() {
        this._sp_hexagon.setSpriteFromAtlas("ui_battle_select_frame_red", GameUrl.Atlas_Battle);
    }

    public SetGreen() {
        this._sp_hexagon.setSpriteFromAtlas("ui_battle_select_frame_green", GameUrl.Atlas_Battle);
    }
}


