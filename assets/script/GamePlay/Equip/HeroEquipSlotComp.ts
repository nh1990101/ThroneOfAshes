import { Node, _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { StarListComp } from '../../Component/StarListComp';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { lang } from '../../Common/LangMgr';
import { EquipLang } from './EquipLogic';
import { EquipMgr } from './EquipMgr';
const { ccclass } = _decorator;

/** 英雄身上的装备槽，在现有装备图标外补充实例状态。 */
@ccclass('HeroEquipSlotComp')
export class HeroEquipSlotComp extends BaseRenderCell<{ hero_uuid: string; pos_id: number }> {
    @comp(BaseSprite, 'slot_empty')
    private slot_empty: BaseSprite = null!;

    @comp(BaseLabel, 'slot_name')
    private slot_name: BaseLabel = null!;

    @comp(BaseLabel, 'slot_level')
    private slot_level: BaseLabel = null!;

    @comp(BaseSprite, 'slot_lock')
    private slot_lock: BaseSprite = null!;

    @comp(StarListComp, 'slot_stars')
    private slot_stars: StarListComp = null!;

    private item_icon: ItemIconComp;

    public init(): void {
        super.init();
        this.item_icon = this.getComponent(ItemIconComp);
    }

    public OnRefreshUI(): void {
        if (!this.isInit) return;
        const data = this.getData();
        if (!data) return;
        const item = EquipMgr.getInstance().getHeroEquipment(data.hero_uuid, data.pos_id);
        const ordinary = data.pos_id <= 4;
        this.slot_empty.node.active = !item && ordinary;
        this.slot_name.node.active = !item;
        this.slot_level.node.active = !!item && item.equip.strength_lv > 0;
        this.slot_stars.node.active = !!item;
        this.slot_lock.node.active = !ordinary || !!item && item.equip.is_locked;
        this.node.getChildByName('icon').active = !!item;
        if (item) {
            this.item_icon.setItem(item, { can_not_click: true, hide_type_icon: true });
            this.item_icon.setSelected(false);
            this.slot_level.setText(`+${item.equip.strength_lv}`);
            this.slot_stars.setStarCount(ConfigMgr.instance.EquipStarData.get(item.equip.star_id).level);
        } else {
            this.node.getChildByName('bg').getComponent(BaseSprite).setIconData(ConfigMgr.instance.QualityData.get(1).quality_frame);
            for (const name of ['count', 'label', 'type_icon', 'top_left_icon']) this.node.getChildByName(name).active = false;
            if (ordinary) {
                const row = ConfigMgr.instance.EquipPosData.get(data.pos_id);
                this.slot_empty.setIconData(row.bottom_icon);
                this.slot_name.setText(lang(row.name));
            } else this.slot_name.setText(data.pos_id === 5 ? lang(EquipLang.exclusiveSlot) : lang(EquipLang.artifactSlot));
        }
    }
}
