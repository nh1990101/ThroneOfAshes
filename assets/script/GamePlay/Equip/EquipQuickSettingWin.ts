import { EquipMgr } from './EquipMgr';
import { lang } from '../../Common/LangMgr';
import { EquipLang } from './EquipLogic';
import { setEquipmentButtonText, getEquipmentQualityName } from './EquipView';
import type { EquipQuickSettingData } from './EquipViewData';
import { Node, _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseWin } from '../../Component/BaseWin';
const { ccclass } = _decorator;

@ccclass('EquipQuickSettingWin')
export class EquipQuickSettingWin extends BaseWin {
    @comp(BaseBtn, "btn_close")
    public btn_close: BaseBtn = null!;

    private title_label: BaseLabel = null!;

    @comp(BaseLabel, "setting_desc")
    private setting_desc: BaseLabel = null!;

    @comp(BaseBtn, "btn_save")
    private btn_save: BaseBtn = null!;

    private setting_content: Node = null!;

    private view_ready = false;

    public init(): void {
        super.init();
        this.title_label = this.node.getChildByPath("frame/safe_area/panel/title/text").getComponent(BaseLabel);
        this.setting_content = this.node.getChildByPath("frame/safe_area/panel/content");
        this.view_ready = true;
    }

    private selected_quality = 0;
    private selected_qualities: number[] = [];

    public initEvent(): void {
        this.addNodeEvent(this.btn_save.node, Node.EventType.TOUCH_END, this.onClickSave);
        for (let setting_index = 0; setting_index < 8; setting_index++) {
            this.addNodeEvent(this.setting_content.getChildByName(`setting_${setting_index}`), Node.EventType.TOUCH_END, () => {
                const data = this.getData<EquipQuickSettingData>();
                const quality = data.mode === 'strengthen' ? setting_index : setting_index + 1;
                if (data.mode === 'strengthen') this.selected_quality = quality;
                else this.selected_qualities = this.selected_qualities.indexOf(quality) >= 0
                    ? this.selected_qualities.filter(entry => entry !== quality) : this.selected_qualities.concat(quality);
                this.OnRefreshUI();
            });
        }
        super.initEvent();
    }

    public showWin(data: EquipQuickSettingData): void {
        const mgr = EquipMgr.getInstance();
        this.selected_quality = mgr.getEquipmentQuickQuality();
        this.selected_qualities = mgr.getEquipmentDecomposeQualities();
        super.showWin(data);
    }

    public OnRefreshUI(): void {
        if (!this.view_ready) return;
        const data = this.getData<EquipQuickSettingData>();
        if (!data) return;
        const is_strengthen = data.mode === 'strengthen';
        this.title_label.setText(is_strengthen ? lang(EquipLang.fillSetting) : lang(EquipLang.decomposeSetting));
        this.setting_desc.setText(is_strengthen ? lang(EquipLang.fillSettingDesc) : lang(EquipLang.decomposeSettingDesc));
        for (let setting_index = 0; setting_index < 8; setting_index++) {
            const button_node = this.setting_content.getChildByName(`setting_${setting_index}`);
            button_node.active = is_strengthen || setting_index < 7;
            if (!button_node.active) continue;
            const quality = is_strengthen ? setting_index : setting_index + 1;
            const selected = is_strengthen ? this.selected_quality === quality : this.selected_qualities.indexOf(quality) >= 0;
            const text = quality === 0 ? lang(EquipLang.materialOnly) : `${getEquipmentQualityName(quality)}${is_strengthen ? lang(EquipLang.andBelow) : ''}`;
            setEquipmentButtonText(button_node.getComponent(BaseBtn), `${selected ? '✓ ' : ''}${text}`);
        }
    }

    private onClickSave(): void {
        const data = this.getData<EquipQuickSettingData>();
        const mgr = EquipMgr.getInstance();
        if (data.mode === 'strengthen') mgr.setEquipmentQuickQuality(this.selected_quality);
        else mgr.setEquipmentDecomposeQualities(this.selected_qualities);
        this.closeWin();
    }
}

