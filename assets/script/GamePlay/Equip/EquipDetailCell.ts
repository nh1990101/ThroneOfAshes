import { ConfigMgr } from '../../Config/ConfigMgr';
import { lang } from '../../Common/LangMgr';
import { EquipMgr } from './EquipMgr';
import { getEquipmentConfig } from './EquipConfig';
import { EquipLang, getEquipmentStrength } from './EquipLogic';
import { formatEquipmentAttribute, getEquipmentName, getEquipmentQualityName, getEquipmentSuitView, getEquipmentOwnerName, setEquipmentButtonText, showEquipmentTip } from './EquipView';
import type { EquipDetailViewData } from './EquipViewData';
import { Color, Node, RichText, ScrollView, _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { EquipItemCell } from './EquipItemCell';
const { ccclass } = _decorator;

@ccclass('EquipDetailCell')
export class EquipDetailCell extends BaseRenderCell<EquipDetailViewData> {
    @comp(EquipItemCell, "detail_icon")
    private detail_icon: EquipItemCell = null!;

    @comp(BaseLabel, "tag_text")
    private tag_text: BaseLabel = null!;

    @comp(BaseLabel, "name_text")
    private name_text: BaseLabel = null!;

    @comp(BaseLabel, "quality_text")
    private quality_text: BaseLabel = null!;

    @comp(BaseLabel, "empty_text")
    private empty_text: BaseLabel = null!;

    @comp(ScrollView, "details_scroll")
    private details_scroll: ScrollView = null!;

    @comp(BaseLabel, "owner_text")
    private owner_text: BaseLabel = null!;

    @comp(BaseLabel, "set_name")
    private set_name: BaseLabel = null!;

    @comp(RichText, "primary_0")
    private primary_0: RichText = null!;

    @comp(BaseLabel, "set_0")
    private set_0: BaseLabel = null!;

    @comp(RichText, "primary_1")
    private primary_1: RichText = null!;

    @comp(BaseLabel, "set_1")
    private set_1: BaseLabel = null!;

    @comp(BaseLabel, "secondary_0")
    private secondary_0: BaseLabel = null!;

    @comp(BaseLabel, "secondary_1")
    private secondary_1: BaseLabel = null!;

    @comp(BaseLabel, "secondary_2")
    private secondary_2: BaseLabel = null!;

    @comp(BaseLabel, "secondary_3")
    private secondary_3: BaseLabel = null!;

    @comp(BaseBtn, "btn_lock")
    private btn_lock: BaseBtn = null!;

    @comp(BaseBtn, "btn_strengthen")
    private btn_strengthen: BaseBtn = null!;

    @comp(BaseBtn, "btn_action")
    private btn_action: BaseBtn = null!;

    private view_ready = false;
    private bound_guid: number;

    public setData(data: EquipDetailViewData): void {
        const changed = this.bound_guid !== data.item_guid;
        this.bound_guid = data.item_guid;
        super.setData(data);
        if (changed && this.view_ready) this.details_scroll.scrollToTop(0);
    }

    public init(): void {
        super.init();
        this.view_ready = true;
    }

    public initEvent(): void {
        this.addNodeEvent(this.btn_lock.node, Node.EventType.TOUCH_END, this.onClickLock);
        this.addNodeEvent(this.btn_strengthen.node, Node.EventType.TOUCH_END, this.onClickStrengthen);
        this.addNodeEvent(this.btn_action.node, Node.EventType.TOUCH_END, this.onClickAction);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        if (!this.view_ready) return;
        const data = this.getData();
        if (!data) return;
        const mgr = EquipMgr.getInstance();
        const item = data.item_guid != null ? mgr.getEquipmentItem(data.item_guid) : undefined;
        const is_candidate = data.role === 'candidate';
        this.tag_text.setText(data.role === 'info' ? lang(EquipLang.detail) : is_candidate ? lang(EquipLang.pendingWear) : lang(EquipLang.currentWear));
        this.empty_text.node.active = !item;
        this.empty_text.setText(is_candidate ? lang(EquipLang.pickBelow) : lang(EquipLang.emptyWear));
        this.details_scroll.node.active = !!item;
        this.detail_icon.node.active = !!item;
        this.name_text.node.active = !!item;
        this.quality_text.node.active = !!item;
        this.btn_lock.node.active = !!item;
        this.btn_action.node.active = !!item && data.role !== 'info';
        this.btn_strengthen.node.active = !!item && !!data.on_strengthen
            && getEquipmentStrength(item, getEquipmentConfig()).max_level > 0;
        if (!item) return;
        this.detail_icon.setData({ item });
        this.name_text.setText(getEquipmentName(item));
        const quality = ConfigMgr.instance.ItemData.get(item.item_id).quality;
        const star_name = lang(ConfigMgr.instance.EquipStarData.get(item.equip.star_id).name);
        this.quality_text.setText(`${getEquipmentQualityName(quality)} · ${star_name}`);
        setEquipmentButtonText(this.btn_lock, item.equip.is_locked ? lang(EquipLang.unlock) : lang(EquipLang.lock));
        const comparison = data.compare_guid != null ? mgr.getEquipmentItem(data.compare_guid) : undefined;
        const before_attrs = comparison ? mgr.getEquipmentAttributes(comparison.guid) : [];
        const base_count = item.equip.base_attrs.length;
        const attrs = mgr.getEquipmentAttributes(item.guid);
        for (let index = 0; index < 2; index++) {
            const label = index === 0 ? this.primary_0 : this.primary_1;
            const attr = index < base_count ? attrs[index] : undefined;
            label.node.active = !!attr;
            if (!attr) continue;
            const previous = before_attrs.find(entry => entry.attr_id === attr.attr_id);
            const delta = comparison ? attr.value - (previous ? previous.value : 0) : 0;
            let text = formatEquipmentAttribute(attr);
            if (comparison) text += delta > 0 ? ` <color=#41833f>↑ ${formatEquipmentAttribute({ ...attr, value: delta }).split(' ').slice(1).join(' ')}</color>`
                : delta < 0 ? ` <color=#b64836>↓ ${formatEquipmentAttribute({ ...attr, value: -delta }, false).split(' ').slice(1).join(' ')}</color>` : '  —';
            label.string = `<b>${text}</b>`;
        }
        const secondary_labels = [this.secondary_0, this.secondary_1, this.secondary_2, this.secondary_3];
        secondary_labels.forEach((label, index) => {
            const attr = item.equip.sub_attrs[index];
            label.node.active = !!attr;
            label.setText(attr ? `${formatEquipmentAttribute(attr)}  ◇${attr.strength_times}` : '');
        });
        const suit = getEquipmentSuitView(item, data.hero_uuid, is_candidate);
        this.set_name.setText(suit.name);
        [this.set_0, this.set_1].forEach((label, index) => {
            const line = suit.lines[index];
            label.node.active = !!line;
            label.setText(line ? line.text : '');
            if (line) {
                label.color = new Color().fromHEX(line.active ? '#41833f' : '#8b8170');
            }
        });
        this.owner_text.setText(item.equip.hero_uuid ? lang(EquipLang.wearing, { name: getEquipmentOwnerName(item.equip.hero_uuid) }) : lang(EquipLang.bagEquip));
        const current = data.hero_uuid ? mgr.getHeroEquipment(data.hero_uuid, item.equip.pos_id) : undefined;
        setEquipmentButtonText(this.btn_action, is_candidate ? current ? lang(EquipLang.replace) : lang(EquipLang.wear) : lang(EquipLang.takeOff));
    }

    private onClickLock(): void {
        const data = this.getData();
        const item = data && EquipMgr.getInstance().getEquipmentItem(data.item_guid);
        if (!item) return;
        showEquipmentTip(EquipMgr.getInstance().setEquipmentLocked(item.guid, !item.equip.is_locked).message);
    }

    private onClickStrengthen(): void {
        const data = this.getData();
        if (data && data.on_strengthen) data.on_strengthen();
    }

    private onClickAction(): void {
        const data = this.getData();
        if (data && data.on_action) data.on_action();
    }
}

