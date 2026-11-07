import { ConfigMgr } from '../../Config/ConfigMgr';
import { HeroMgr } from '../Hero/HeroMgr';
import { getEquipmentConfig } from './EquipConfig';
import { getEquipData } from './EquipLogic';
import { formatEquipmentNumber } from './EquipView';
import type { EquipItemViewData } from './EquipViewData';
import { Node, _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { HeroIcon } from '../PVE/component/HeroIcon';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { StarListComp } from '../../Component/StarListComp';
const { ccclass } = _decorator;

@ccclass('EquipItemCell')
export class EquipItemCell extends BaseRenderCell<EquipItemViewData> {
    @comp(ItemIconComp, "item_icon")
    private item_icon: ItemIconComp = null!;

    @comp(BaseLabel, "strength_text")
    private strength_text: BaseLabel = null!;

    @comp(BaseLabel, "selection_text")
    private selection_text: BaseLabel = null!;

    @comp(BaseLabel, "material_count")
    private material_count: BaseLabel = null!;

    @comp(BaseLabel, "empty_name")
    private empty_name: BaseLabel = null!;

    @comp(BaseSprite, "empty_icon")
    private empty_icon: BaseSprite = null!;

    @comp(BaseSprite, "lock_icon")
    private lock_icon: BaseSprite = null!;

    @comp(BaseSprite, "suit_icon")
    private suit_icon: BaseSprite = null!;

    @comp(HeroIcon, "owner_icon")
    private owner_icon: HeroIcon = null!;

    @comp(StarListComp, "equipment_stars")
    private equipment_stars: StarListComp = null!;

    private view_ready = false;

    public init(): void {
        super.init();
        this.view_ready = true;
    }

    public initEvent(): void {
        this.addNodeEvent(this.item_icon.node, Node.EventType.TOUCH_END, this.onClickItem);
        this.addNodeEvent(this.owner_icon.node, Node.EventType.TOUCH_END, this.onClickItem);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        if (!this.view_ready) return;
        const data = this.getData();
        if (!data) return;
        const item = data.item;
        const equip = item && item.equip;
        this.item_icon.node.active = !!item;
        this.empty_icon.node.active = !item && data.empty_pos_id != null;
        this.empty_name.node.active = !item && !!data.empty_text;
        this.empty_name.setText(data.empty_text || '');
        this.strength_text.node.active = !!equip && equip.strength_lv > 0;
        this.strength_text.setText(equip ? `+${equip.strength_lv}` : '');
        this.lock_icon.node.active = !!equip && equip.is_locked;
        this.equipment_stars.node.active = !!equip;
        this.material_count.node.active = !!item && !equip;
        this.material_count.setText(item && !equip ? `${data.selected_count || 0}/${formatEquipmentNumber(item.count)}` : '');
        this.selection_text.node.active = !!data.selected;
        this.selection_text.setText(data.selection_mark === 'minus' ? '-' : '✓');
        if (!item) {
            this.owner_icon.node.active = false;
            this.suit_icon.node.active = false;
            if (data.empty_pos_id != null) this.empty_icon.setIconData(ConfigMgr.instance.EquipPosData.get(data.empty_pos_id).bottom_icon);
            return;
        }
        this.item_icon.setItem({ item_id: item.item_id, guid: item.guid, count: 1 }, { can_not_click: true, hide_type_icon: true });
        this.item_icon.setSelected(!!data.selected);
        if (!equip) {
            this.owner_icon.node.active = false;
            this.suit_icon.node.active = false;
            return;
        }
        this.equipment_stars.setStarCount(ConfigMgr.instance.EquipStarData.get(equip.star_id).level);
        const equip_config = getEquipData(item, getEquipmentConfig());
        const suit_config = equip_config.suit_id != null ? ConfigMgr.instance.EquipSuitData.get(equip_config.suit_id) : undefined;
        this.suit_icon.node.active = !!suit_config && suit_config.icon != null;
        if (suit_config && suit_config.icon != null) this.suit_icon.setIconData(suit_config.icon);
        const hero = equip.hero_uuid ? HeroMgr.getInstance().getHeroByUuid(equip.hero_uuid) : undefined;
        this.owner_icon.node.active = !!hero;
        if (hero) this.owner_icon.setData({ heroId: hero.id, unitId: ConfigMgr.instance.HeroData.get(hero.id).unit_id, lv: hero.level ?? 0, star: undefined });
    }

    private onClickItem(): void {
        const data = this.getData();
        if (data && data.click_func) data.click_func();
    }
}

