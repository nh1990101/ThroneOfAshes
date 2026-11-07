import { Node, _decorator } from 'cc';
import {
    GRAPHIC_FPS_HIGH,
    GRAPHIC_FPS_LOW,
    GRAPHIC_QUALITY_HIGH,
    GRAPHIC_QUALITY_LOW,
    GRAPHIC_QUALITY_MID,
    SystemSettingMgr,
} from '../../Common/SystemSettingMgr';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseWin } from '../../Component/BaseWin';
import { SliderInputComp } from '../../Component/SliderInputComp';
const { ccclass } = _decorator;

@ccclass('SystemSettingWin')
export class SystemSettingWin extends BaseWin {
    @comp(BaseBtn, "btn_close")
    public btn_close: BaseBtn = null!;

    @comp(SliderInputComp, "music_slider")
    private music_slider: SliderInputComp = null!;

    @comp(SliderInputComp, "sound_slider")
    private sound_slider: SliderInputComp = null!;

    @comp(BaseBtn, "quality_low")
    private quality_low: BaseBtn = null!;

    @comp(BaseBtn, "quality_mid")
    private quality_mid: BaseBtn = null!;

    @comp(BaseBtn, "quality_high")
    private quality_high: BaseBtn = null!;

    @comp(BaseBtn, "fps_low")
    private fps_low: BaseBtn = null!;

    @comp(BaseBtn, "fps_high")
    private fps_high: BaseBtn = null!;

    private view_ready = false;

    public init(): void {
        super.init();
        this.view_ready = true;
    }

    public initEvent(): void {
        this.addNodeEvent(this.quality_low.node, Node.EventType.TOUCH_END, this.onClickQualityLow);
        this.addNodeEvent(this.quality_mid.node, Node.EventType.TOUCH_END, this.onClickQualityMid);
        this.addNodeEvent(this.quality_high.node, Node.EventType.TOUCH_END, this.onClickQualityHigh);
        this.addNodeEvent(this.fps_low.node, Node.EventType.TOUCH_END, this.onClickFpsLow);
        this.addNodeEvent(this.fps_high.node, Node.EventType.TOUCH_END, this.onClickFpsHigh);
        super.initEvent();
    }

    public showWin(): void {
        const setting_mgr = SystemSettingMgr.getInstance();
        this.music_slider.setSlider({
            min_value: 0,
            max_value: 100,
            value_step: { step: 1 },
            init_value: Math.round(setting_mgr.getMusicVolume() * 100),
            on_value_changed: (cur: number) => {
                SystemSettingMgr.getInstance().setMusicVolume(cur / 100);
            },
        });
        this.sound_slider.setSlider({
            min_value: 0,
            max_value: 100,
            value_step: { step: 1 },
            init_value: Math.round(setting_mgr.getSoundVolume() * 100),
            on_value_changed: (cur: number) => {
                SystemSettingMgr.getInstance().setSoundVolume(cur / 100);
            },
        });
        super.showWin();
    }

    public OnRefreshUI(): void {
        if (!this.view_ready) {
            return;
        }
        const setting_mgr = SystemSettingMgr.getInstance();
        const graphic_quality = setting_mgr.getGraphicQuality();
        const graphic_fps = setting_mgr.getGraphicFps();
        this.refreshOption(this.quality_low.node, graphic_quality === GRAPHIC_QUALITY_LOW);
        this.refreshOption(this.quality_mid.node, graphic_quality === GRAPHIC_QUALITY_MID);
        this.refreshOption(this.quality_high.node, graphic_quality === GRAPHIC_QUALITY_HIGH);
        this.refreshOption(this.fps_low.node, graphic_fps === GRAPHIC_FPS_LOW);
        this.refreshOption(this.fps_high.node, graphic_fps === GRAPHIC_FPS_HIGH);
    }

    private refreshOption(option_node: Node, selected: boolean): void {
        option_node.getChildByName('select').active = selected;
        option_node.getChildByName('unselect').active = !selected;
    }

    private onClickQualityLow(): void {
        SystemSettingMgr.getInstance().setGraphicQuality(GRAPHIC_QUALITY_LOW);
        this.OnRefreshUI();
    }

    private onClickQualityMid(): void {
        SystemSettingMgr.getInstance().setGraphicQuality(GRAPHIC_QUALITY_MID);
        this.OnRefreshUI();
    }

    private onClickQualityHigh(): void {
        SystemSettingMgr.getInstance().setGraphicQuality(GRAPHIC_QUALITY_HIGH);
        this.OnRefreshUI();
    }

    private onClickFpsLow(): void {
        SystemSettingMgr.getInstance().setGraphicFps(GRAPHIC_FPS_LOW);
        this.OnRefreshUI();
    }

    private onClickFpsHigh(): void {
        SystemSettingMgr.getInstance().setGraphicFps(GRAPHIC_FPS_HIGH);
        this.OnRefreshUI();
    }
}
