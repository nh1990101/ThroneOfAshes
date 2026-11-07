import { ConfigMgr } from '../../Config/ConfigMgr';
import { lang } from '../../Common/LangMgr';
import { EquipLang } from './EquipLogic';
import { setEquipmentButtonText } from './EquipView';
import type { EquipConfirmData } from './EquipViewData';
import { Node, _decorator } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseWin } from '../../Component/BaseWin';
import { ItemIconComp } from '../../Component/ItemIconComp';
const { ccclass } = _decorator;

@ccclass('EquipConfirmWin')
export class EquipConfirmWin extends BaseWin {
    @comp(BaseBtn, "btn_close")
    public btn_close: BaseBtn = null!;

    private title_label: BaseLabel = null!;

    @comp(BaseLabel, "message_text")
    private message_text: BaseLabel = null!;

    @comp(ItemIconComp, "reward_icon")
    private reward_icon: ItemIconComp = null!;

    @child({ name: "reward_content" })
    private reward_content: Node = null!;

    @comp(BaseLabel, "reward_name")
    private reward_name: BaseLabel = null!;

    @child({ name: "buttons_dual" })
    private buttons_dual: Node = null!;

    @child({ name: "buttons_single" })
    private buttons_single: Node = null!;

    @comp(BaseBtn, "btn_cancel")
    private btn_cancel: BaseBtn = null!;

    @comp(BaseBtn, "btn_confirm")
    private btn_confirm: BaseBtn = null!;

    @comp(BaseBtn, "btn_single")
    private btn_single: BaseBtn = null!;

    private view_ready = false;

    public init(): void {
        super.init();
        this.title_label = this.node.getChildByPath("frame/safe_area/panel/title/text").getComponent(BaseLabel);
        this.view_ready = true;
    }

    public initEvent(): void {
        this.addNodeEvent(this.btn_cancel.node, Node.EventType.TOUCH_END, this.closeWin);
        this.addNodeEvent(this.btn_confirm.node, Node.EventType.TOUCH_END, this.onClickConfirm);
        this.addNodeEvent(this.btn_single.node, Node.EventType.TOUCH_END, this.onClickConfirm);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        if (!this.view_ready) return;
        const data = this.getData<EquipConfirmData>();
        if (!data) return;
        this.title_label.setText(data.title);
        this.message_text.setText(data.message);
        this.buttons_dual.active = !!data.on_confirm;
        this.buttons_single.active = !data.on_confirm;
        setEquipmentButtonText(this.btn_confirm, data.confirm_text || lang(EquipLang.confirm));
        setEquipmentButtonText(this.btn_cancel, data.cancel_text || lang(EquipLang.cancel));
        setEquipmentButtonText(this.btn_single, data.confirm_text || lang(EquipLang.gotIt));
        const reward = data.rewards && data.rewards.find(entry => entry.count > 0);
        this.reward_content.active = !!reward;
        if (reward) {
            this.reward_icon.setItem({ item_id: reward.item_id, count: reward.count }, { can_not_click: true });
            this.reward_name.setText(lang(ConfigMgr.instance.ItemData.get(reward.item_id).name));
        }
    }

    private onClickConfirm(): void {
        const data = this.getData<EquipConfirmData>();
        if (!data) return;
        const callback = data.on_confirm;
        this.closeWin();
        if (callback) callback();
    }
}

