import type { IEquipData } from '../../Config/Typings/EquipData';
import type { IEquipStrData } from '../../Config/Typings/EquipStrData';
import type { IEquipStarData } from '../../Config/Typings/EquipStarData';
import type { IEquipAttrData } from '../../Config/Typings/EquipAttrData';
import type { IEquipSuitData } from '../../Config/Typings/EquipSuitData';
import type { IEquipSuitAttrData } from '../../Config/Typings/EquipSuitAttrData';
import type { IItemData } from '../../Config/Typings/ItemData';

export const EQUIPMENT_CHANGED = 'equipment_changed';
export const EQUIPMENT_GOLD_ITEM = 1002;

export interface EquipAttribute {
    attr_id: number;
    value: number;
    strength_times: number;
}

/** 一件装备的已结算状态；经验从获得这件装备起累计。 */
export interface EquipInstance {
    pos_id: number;
    star_id: number;
    strength_lv: number;
    strength_exp: number;
    base_attrs: EquipAttribute[];
    sub_attrs: EquipAttribute[];
    is_locked: boolean;
    hero_uuid?: string;
}

export interface EquipBagItem {
    guid: number;
    item_id: number;
    count: number;
    equip?: EquipInstance;
}

export interface EquipRules {
    decompose_max: number;
    gold_per_exp: number;
    return_exp_rate: number;
    affix_levels: number[];
    max_sub_attrs: number;
    reward_item_id: number;
    quick_quality: number;
}

export interface EquipConfig {
    items: ReadonlyMap<number, IItemData>;
    equips: ReadonlyMap<number, IEquipData>;
    strengths: ReadonlyMap<number, IEquipStrData>;
    stars: ReadonlyMap<number, IEquipStarData>;
    attrs: ReadonlyMap<number, IEquipAttrData>;
    suits: ReadonlyMap<number, IEquipSuitData>;
    suit_attrs: ReadonlyMap<number, IEquipSuitAttrData>;
    rules: EquipRules;
}

export interface EquipConsume {
    guid: number;
    count: number;
}

export interface EquipReward {
    item_id: number;
    count: number;
}

export interface EquipFilter {
    lock: 'all' | 'locked' | 'unlocked';
    worn: 'all' | 'worn' | 'unworn';
    qualities: number[];
}

export interface EquipSort {
    field: 'level' | 'quality';
    direction: 'asc' | 'desc';
}

export interface EquipStrengthPreview {
    from_level: number;
    to_level: number;
    max_level: number;
    current_exp: number;
    target_exp: number;
    added_exp: number;
    waste_exp: number;
    gold_cost: number;
    next_exp: number;
    level_start_exp: number;
    pending_affixes: number;
    worn_guids: number[];
    consumes: EquipConsume[];
}

export interface EquipOperationResult<T = undefined> {
    ok: boolean;
    message: string;
    data?: T;
    needs_transfer_confirm?: boolean;
    needs_worn_confirm?: boolean;
    needs_overflow_confirm?: boolean;
}

export interface EquipAttributeTotals {
    flat: Record<string, number>;
    rate: Record<string, number>;
}

export interface EquipAffixChange {
    attr_id: number;
    is_new: boolean;
    delta: number;
    strength_times: number;
}

export interface EquipStrengthResult {
    preview: EquipStrengthPreview;
    affix_changes: EquipAffixChange[];
}

export interface EquipWindowContext {
    hero_uuid?: string;
    pos_id?: number;
    item_guid?: number;
    parent_win_name?: string;
}
