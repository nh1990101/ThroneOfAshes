import { lang } from '../../Common/LangMgr';
import { EquipLang } from './EquipLogic';
import { setEquipmentButtonText, getEquipmentQualityName } from './EquipView';
import type { EquipFilter } from './EquipTypes';
import type { EquipFilterData } from './EquipViewData';
import { Node, _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseWin } from '../../Component/BaseWin';
const { ccclass } = _decorator;

@ccclass('EquipFilterWin')
export class EquipFilterWin extends BaseWin {
    @comp(BaseBtn, "btn_close")
    public btn_close: BaseBtn = null!;

    private title_label: BaseLabel = null!;

    @comp(BaseBtn, "btn_reset")
    private btn_reset: BaseBtn = null!;

    @comp(BaseBtn, "btn_apply")
    private btn_apply: BaseBtn = null!;

    private filter_content: Node = null!;

    private view_ready = false;

    public init(): void {
        super.init();
        this.title_label = this.node.getChildByPath("frame/safe_area/panel/title/text").getComponent(BaseLabel);
        this.filter_content = this.node.getChildByPath("frame/safe_area/panel/content");
        this.view_ready = true;
    }

    private filter_draft: EquipFilter = { lock: 'all', worn: 'all', qualities: [] };

    public initEvent(): void {
        this.addNodeEvent(this.btn_reset.node, Node.EventType.TOUCH_END, this.onClickReset);
        this.addNodeEvent(this.btn_apply.node, Node.EventType.TOUCH_END, this.onClickApply);
        for (let index = 0; index < 3; index++) {
            const lock = ['all', 'locked', 'unlocked'][index] as EquipFilter['lock'];
            const worn = ['all', 'worn', 'unworn'][index] as EquipFilter['worn'];
            this.addNodeEvent(this.filter_content.getChildByName(`lock_${index}`), Node.EventType.TOUCH_END, () => {
                this.filter_draft.lock = lock; this.OnRefreshUI();
            });
            this.addNodeEvent(this.filter_content.getChildByName(`worn_${index}`), Node.EventType.TOUCH_END, () => {
                this.filter_draft.worn = worn; this.OnRefreshUI();
            });
        }
        for (let quality = 1; quality <= 7; quality++) {
            this.addNodeEvent(this.filter_content.getChildByName(`quality_${quality}`), Node.EventType.TOUCH_END, () => {
                const qualities = this.filter_draft.qualities;
                this.filter_draft.qualities = qualities.indexOf(quality) >= 0 ? qualities.filter(entry => entry !== quality) : qualities.concat(quality);
                this.OnRefreshUI();
            });
        }
        super.initEvent();
    }

    public showWin(data: EquipFilterData): void {
        this.filter_draft = { ...data.filter, qualities: data.filter.qualities.slice() };
        super.showWin(data);
    }

    public OnRefreshUI(): void {
        if (!this.view_ready || !this.getData()) return;
        for (let index = 0; index < 3; index++) {
            const lock_text = [lang(EquipLang.all), lang(EquipLang.locked), lang(EquipLang.unlocked)][index];
            const worn_text = [lang(EquipLang.all), lang(EquipLang.worn), lang(EquipLang.unworn)][index];
            const lock_selected = this.filter_draft.lock === ['all', 'locked', 'unlocked'][index];
            const worn_selected = this.filter_draft.worn === ['all', 'worn', 'unworn'][index];
            setEquipmentButtonText(this.filter_content.getChildByName(`lock_${index}`).getComponent(BaseBtn), `${lock_selected ? '✓ ' : ''}${lock_text}`);
            setEquipmentButtonText(this.filter_content.getChildByName(`worn_${index}`).getComponent(BaseBtn), `${worn_selected ? '✓ ' : ''}${worn_text}`);
        }
        for (let quality = 1; quality <= 7; quality++) {
            const selected = this.filter_draft.qualities.indexOf(quality) >= 0;
            setEquipmentButtonText(this.filter_content.getChildByName(`quality_${quality}`).getComponent(BaseBtn), `${selected ? '✓ ' : ''}${getEquipmentQualityName(quality)}`);
        }
    }

    private onClickReset(): void {
        this.filter_draft = { lock: 'all', worn: 'all', qualities: [] };
        this.OnRefreshUI();
    }

    private onClickApply(): void {
        const data = this.getData<EquipFilterData>();
        const filter = { ...this.filter_draft, qualities: this.filter_draft.qualities.slice() };
        this.closeWin();
        data.on_apply(filter);
    }
}

