import { _decorator, Button, Component, Label, Node, Sprite, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { BaseComp } from '../../Component/BaseComp';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { HexagonData } from './HexagonData';
import { GameUrl } from '../../Common/GameUrl';
import { comp } from '../../Common/Decorator';
import { HEXGON_GRID_COLOR } from '../../Common/GameEnum';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
const { ccclass, property } = _decorator;

/**
 * 战斗六边形地形
 */
@ccclass('HexagonCell')
export class HexagonCell extends BaseComp {

    lb_pos: Label = null!;


    protected m_data: HexagonData;

    protected _sp_hexagon: BaseSprite;
    protected _touch: Button;

    /** 六边形宽度 */
    public static readonly HEX_WIDTH = 98;
    /** 六边形高度 */
    public static readonly HEX_HEIGHT = 86;
    /**两六边形左右留宽 */
    public static readonly HEX_WIDTH_GAP = 2;
    /**两六边形上下留宽 */
    public static readonly HEX_HEIGHT_GAP = 3;

    private _breathTween: Tween<UIOpacity>;
    /**地图原有提示颜色，技能预览结束后恢复最新状态 */
    private _baseFrameName: string = "ui_battle_select_frame";
    private _isSkillAttackPreview: boolean = false;
    /**技能瞄准期间仅隐藏单位的基础红绿提示，不清除业务状态 */
    private _unitHintsHidden: boolean = false;
    /**呼吸效果的业务状态，技能预览期间仅暂停表现 */
    private _isBreathing: boolean = false;
    /**呼吸灯一呼一吸的时长（秒） */
    private static readonly BREATH_DURATION = 0.3;
    /**呼吸灯最暗时的透明度 */
    private static readonly BREATH_MIN_OPACITY = 55;

    private _uiOpacity: UIOpacity;

    protected onLoad(): void {
        this._sp_hexagon = this.getComponent(BaseSprite);
        this._touch = this.getComponent(Button);
        this.lb_pos = this.getComponentInChildren(Label)
    }
    init() {
        super.init();
        this.UpdatePosLabel();
    }

    public initEvent(): void {
        super.initEvent();

    }


    public SetData(data: HexagonData) {
        this.m_data = data;
        this.OnCheckRefreshUI();

    }
    public OnRefreshUI(): void {
        super.OnRefreshUI();
        // 使用配置尺寸，避免图集原图宽度覆盖格子大小；池化复用时同样更新。
        this._sp_hexagon.sizeMode = Sprite.SizeMode.CUSTOM;
        this.getComponent(UITransform).setContentSize(HexagonData.widthPx, HexagonData.heightPx);
        this.SetNormal();
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
        this.node.setPosition(pos.toVec3());

        // 打印坐标信息
        // console.log(`HexCell[${this._data.q},${this._data.r}] -> Pos(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
    }

    /**获取世界坐标 */
    public GetWorldPos() {
        this.UpdatePos();
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
            if (this.m_data.selected) {
                this.SetYellow();
            } else {
                this.SetNormal();
            }
        }
    }
    public SetNormal() {
        this.setBaseFrame("ui_battle_select_frame");
    }
    public SetRed() {
        this.setBaseFrame("ui_battle_select_frame_red");
    }

    public SetGreen() {
        this.setBaseFrame("ui_battle_select_frame_green");
    }
    public SetYellow() {
        this.setBaseFrame("ui_battle_select_frame_yellow");
    }
    public SetBlue() {
        this.setBaseFrame("ui_battle_select_frame_blue");

    }
    private setBaseFrame(frameName: string) {
        const wasBreathSuppressed = this.isBreathSuppressed();
        this._baseFrameName = frameName;
        if (!this._isSkillAttackPreview) {
            this.refreshFrame();
        }
        // 只有跨越隐藏颜色边界才调整呼吸，普通颜色刷新不重启已有动画。
        if (wasBreathSuppressed !== this.isBreathSuppressed()) {
            this.refreshBreath();
        }
    }
    private isUnitHintFrameHidden(): boolean {
        return this._unitHintsHidden && (this._baseFrameName === "ui_battle_select_frame_red"
            || this._baseFrameName === "ui_battle_select_frame_green");
    }
    private isBreathSuppressed(): boolean {
        return this._isSkillAttackPreview || this.isUnitHintFrameHidden();
    }
    private refreshFrame() {
        if (this._sp_hexagon && this._sp_hexagon.isValid) {
            const frameName = this._isSkillAttackPreview ? "ui_battle_select_frame_red"
                : this.isUnitHintFrameHidden() ? "ui_battle_select_frame" : this._baseFrameName;
            this._sp_hexagon.setSpriteFromAtlas(frameName, GameUrl.Atlas_Battle);
        }
    }
    /**临时隐藏单位红绿提示，黄色选中、蓝色及技能红色保持显示 */
    public SetUnitHintsHidden(hidden: boolean) {
        if (this._unitHintsHidden === hidden) {
            return;
        }
        const wasBreathSuppressed = this.isBreathSuppressed();
        this._unitHintsHidden = hidden;
        this.refreshFrame();
        if (wasBreathSuppressed !== this.isBreathSuppressed()) {
            this.refreshBreath();
        }
    }
    /**技能范围独立覆盖颜色，不修改格子数据或原有提示状态 */
    public SetSkillAttackPreview(enabled: boolean) {
        if (this._isSkillAttackPreview === enabled) {
            return;
        }
        this._isSkillAttackPreview = enabled;
        this.refreshFrame();
        this.refreshBreath();
    }
    public SetColor(color: HEXGON_GRID_COLOR) {
        switch (color) {
            case HEXGON_GRID_COLOR.GREEN:
                this.SetGreen();
                break;
            case HEXGON_GRID_COLOR.RED:
                this.SetRed();
                break;
            case HEXGON_GRID_COLOR.YELLOW:
                this.SetYellow();
                break;
            case HEXGON_GRID_COLOR.BLUE:
                this.SetBlue();
                break;
            default:
                this.SetNormal();
                break;
        }
    }
    /**开始呼吸灯效果 */
    public startBreath() {
        this._isBreathing = true;
        this.refreshBreath();
    }
    private refreshBreath() {
        this.stopBreathTween();
        if (!this._isBreathing || this.isBreathSuppressed()) {
            return;
        }
        var uiOpacity = this.getUIOpacity();
        uiOpacity.opacity = 255;
        this._breathTween = tween(uiOpacity)
            .to(HexagonCell.BREATH_DURATION, { opacity: HexagonCell.BREATH_MIN_OPACITY }, { easing: 'sineInOut' })
            .to(HexagonCell.BREATH_DURATION, { opacity: 255 }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }
    /**停止呼吸灯效果并恢复常亮 */
    public stopBreath() {
        this._isBreathing = false;
        this.stopBreathTween();
    }
    private stopBreathTween() {
        if (this._breathTween) {
            this._breathTween.stop();
            this._breathTween = null;
        }
        if (this._uiOpacity && this._uiOpacity.isValid) {
            this._uiOpacity.opacity = 255;
        }
    }
    protected getUIOpacity() {
        if (!this._uiOpacity) {
            this._uiOpacity = this.getComponent(UIOpacity);
            if (!this._uiOpacity) {
                this._uiOpacity = this.addComponent(UIOpacity);
            }
        }
        return this._uiOpacity;
    }
    clear() {
        super.clear();
        this.stopBreath();
        this._isSkillAttackPreview = false;
        this._unitHintsHidden = false;
        this.SetNormal();
        this.m_data = null;

    }
}


