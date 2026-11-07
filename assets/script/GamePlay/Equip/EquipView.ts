import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { lang } from '../../Common/LangMgr';
import { UIMananger } from '../../Component/UIMananger';
import { BagItem } from '../Bag/BagMgr';
import { HeroMgr } from '../Hero/HeroMgr';
import { EquipMgr } from './EquipMgr';
import { getEquipmentConfig } from './EquipConfig';
import { EquipLang, getEquipData } from './EquipLogic';
import type { EquipAttribute } from './EquipTypes';

export function setEquipmentButtonText(button: BaseBtn, text: string): void {
    button.node.getChildByName('Label').getComponent(BaseLabel).setText(text);
}

export function getEquipmentName(item: BagItem): string {
    return lang(ConfigMgr.instance.ItemData.get(item.item_id).name);
}

export function getEquipmentQualityName(quality: number): string {
    return lang(ConfigMgr.instance.QualityData.get(quality).name);
}

export function formatEquipmentNumber(value: number): string {
    return Number(value.toFixed(2)).toLocaleString('en-US');
}

export function formatEquipmentAttribute(attr: EquipAttribute, signed = true): string {
    const config = ConfigMgr.instance.EquipAttrData.get(attr.attr_id);
    const name = lang(config.name);
    const value = config.value_type === 'rate' ? `${formatEquipmentNumber(attr.value * 100)}%` : formatEquipmentNumber(attr.value);
    return `${name} ${signed && attr.value >= 0 ? '+' : ''}${value}`;
}

export function getEquipmentOwnerName(hero_uuid: string): string {
    const hero = HeroMgr.getInstance().getHeroByUuid(hero_uuid);
    if (!hero) {
        return lang(EquipLang.otherHero);
    }
    const hero_config = ConfigMgr.instance.HeroData.get(hero.id);
    const name_id = ConfigMgr.instance.UnitData.get(hero_config.unit_id).name;
    return lang(name_id);
}

export function getEquipmentSuitView(item: BagItem, hero_uuid?: string, preview_candidate = false) {
    const config = getEquipmentConfig();
    const suit_id = getEquipData(item, config).suit_id;
    if (suit_id == null) {
        return { name: lang(EquipLang.independent), lines: [] as { text: string; active: boolean }[] };
    }
    const owner_uuid = hero_uuid || item.equip.hero_uuid;
    let equipped = owner_uuid ? EquipMgr.getInstance().getHeroEquipments(owner_uuid) : [];
    if (preview_candidate) {
        equipped = equipped.filter(entry => entry.equip.pos_id !== item.equip.pos_id).concat(item);
    }
    const count = equipped.filter(entry => getEquipData(entry, config).suit_id === suit_id).length;
    const lines = Array.from(config.suit_attrs.values()).filter(row => row.suit_id === suit_id)
        .sort((left, right) => left.suit_nums - right.suit_nums).map(row => ({
            text: lang(EquipLang.suitLine, {
                count: row.suit_nums,
                attr: row.suit_attribute_name.map((attr_id, index) =>
                    formatEquipmentAttribute({ attr_id, value: row.suit_attribute_value[index], strength_times: 0 })).join('、'),
            }),
            active: count >= row.suit_nums,
        }));
    return { name: `${lang(config.suits.get(suit_id).name)}（${count}/4）`, lines };
}

export function showEquipmentTip(message: string): void {
    UIMananger.instance.showFlyNotice(message);
}
