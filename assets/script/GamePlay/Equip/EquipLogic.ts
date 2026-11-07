import { lang } from '../../Common/LangMgr';
import type { IEquipData } from '../../Config/Typings/EquipData';
import type {
    EquipAffixChange, EquipAttribute, EquipAttributeTotals, EquipBagItem, EquipConfig,
    EquipConsume, EquipInstance, EquipOperationResult, EquipReward, EquipStrengthPreview,
} from './EquipTypes';

/** 程序多语言。装备界面从 246 起。全部沿用已有的 119 */
export const EquipLang = {
    filter: 246,
    filterCount: 247,
    level: 248,
    quality: 249,
    transferTitle: 250,
    transferMessage: 251,
    transferConfirm: 252,
    detail: 253,
    pendingWear: 254,
    currentWear: 255,
    pickBelow: 256,
    emptyWear: 257,
    unlock: 258,
    lock: 259,
    wearing: 260,
    bagEquip: 261,
    replace: 262,
    wear: 263,
    takeOff: 264,
    locked: 265,
    unlocked: 266,
    worn: 267,
    unworn: 268,
    missingRetry: 269,
    exclusiveNoStrength: 270,
    badMaterialCount: 271,
    materialChanged: 272,
    lockedMaterial: 273,
    badMaterial: 274,
    pickDecompose: 275,
    decomposeMax: 276,
    cannotDecompose: 277,
    heroOrEquipMissing: 278,
    exclusiveClosed: 279,
    alreadyWorn: 280,
    wornByOther: 281,
    replaceOk: 282,
    wearOk: 283,
    equipChanged: 284,
    slotEmpty: 285,
    takenOff: 286,
    equipMissing: 287,
    lockOk: 288,
    unlockOk: 289,
    strengthMaxFill: 290,
    noStrengthMaterial: 291,
    fillNotEnough: 292,
    fillEnough: 293,
    strengthMax: 294,
    pickStrength: 295,
    goldShort: 296,
    confirmCost: 297,
    strengthOk: 298,
    expAdded: 299,
    selectMax: 300,
    addedEquips: 301,
    noMatchedEquip: 302,
    decomposeOk: 303,
    fillSetting: 304,
    decomposeSetting: 305,
    fillSettingDesc: 306,
    decomposeSettingDesc: 307,
    materialOnly: 308,
    andBelow: 309,
    otherHero: 310,
    independent: 311,
    suitLine: 312,
    strengthenTitle: 313,
    decomposeTitle: 314,
    selectedCount: 315,
    strengthCap: 316,
    goldCost: 317,
    strengthen: 318,
    newAffixPending: 319,
    affixUnlock: 320,
    noMoreAffix: 321,
    materialMissing: 322,
    levelCapFill: 323,
    selectedOfMax: 324,
    wornMaterial: 325,
    wasteExp: 326,
    strengthConfirm: 327,
    continueAsk: 328,
    continueStrength: 329,
    newAffix: 330,
    affixUp: 331,
    strengthHelp: 332,
    decomposeHelp: 333,
    strengthHelpTitle: 334,
    decomposeHelpTitle: 335,
    gainTitle: 336,
    decomposed: 337,
    smeltClosed: 338,
    exclusiveSlot: 339,
    artifactSlot: 340,
    all: 119,
    reachedLimit: 220,
    confirm: 221,
    gotIt: 222,
    cancel: 223,
} as const;

function chooseWeighted(indices: number[], weights: readonly number[], random: () => number): number {
    const total_weight = indices.reduce((sum, index) => sum + weights[index], 0);
    if (total_weight <= 0) {
        throw new Error('装备属性池没有可用权重');
    }
    let point = random() * total_weight;
    for (const index of indices) {
        point -= weights[index];
        if (point < 0) {
            return index;
        }
    }
    return indices[indices.length - 1];
}

function drawAttributes(
    names: readonly number[], values: readonly number[], weights: readonly number[], count: number,
    random: () => number, excluded: readonly number[] = [],
): EquipAttribute[] {
    const indices = names.map((_name, index) => index)
        .filter(index => weights[index] > 0 && excluded.indexOf(names[index]) < 0);
    if (count > indices.length) {
        throw new Error('装备属性池不足，无法生成不重复词条');
    }
    const result: EquipAttribute[] = [];
    for (let draw_index = 0; draw_index < count; draw_index++) {
        const index = chooseWeighted(indices, weights, random);
        result.push({ attr_id: names[index], value: values[index], strength_times: 0 });
        indices.splice(indices.indexOf(index), 1);
    }
    return result;
}

export function getEquipData(item: EquipBagItem, config: EquipConfig): IEquipData {
    const item_config = config.items.get(item.item_id);
    const equip_config = config.equips.get(item_config.equip_id);
    if (!equip_config) {
        throw new Error(`装备配置不存在：${item.item_id}`);
    }
    return equip_config;
}

export function getEquipmentStrength(item: EquipBagItem, config: EquipConfig) {
    const quality = config.items.get(item.item_id).quality;
    const strength_config = Array.from(config.strengths.values()).find(row => row.quality === quality);
    if (!strength_config) {
        throw new Error(`缺少品质 ${quality} 的装备强化配置`);
    }
    return strength_config;
}

export function createEquipment(
    item_id: number, config: EquipConfig, random: () => number = Math.random, star_id?: number,
): EquipInstance {
    const equip_config = getEquipData({ item_id, guid: 0, count: 1 }, config);
    if (star_id == null) {
        const star_ids = equip_config.star_id;
        star_id = star_ids && star_ids.length
            ? star_ids[chooseWeighted(star_ids.map((_id, index) => index), equip_config.star_weight, random)]
            : 1;
    }
    const initial_count = config.stars.get(star_id).sub_attr_num;
    return {
        pos_id: equip_config.pos,
        star_id,
        strength_lv: 0,
        strength_exp: 0,
        base_attrs: drawAttributes(equip_config.base_attr_name, equip_config.base_attr_value,
            equip_config.base_attr_weight, equip_config.base_attr_nums, random),
        sub_attrs: initial_count > 0
            ? drawAttributes(equip_config.sub_attr_name, equip_config.sub_attr_value,
                equip_config.sub_attr_weight, initial_count, random) : [],
        is_locked: false,
    };
}

export function cloneEquipment(equip: EquipInstance): EquipInstance {
    return {
        ...equip,
        base_attrs: equip.base_attrs.map(attr => ({ ...attr })),
        sub_attrs: equip.sub_attrs.map(attr => ({ ...attr })),
    };
}

export function getEquipmentAttributes(item: EquipBagItem, config: EquipConfig, level = item.equip.strength_lv): EquipAttribute[] {
    const rate = getEquipmentStrength(item, config).base_attr_rate ?? 0;
    return item.equip.base_attrs.map(attr => ({ ...attr, value: attr.value * (1 + rate * level) }))
        .concat(item.equip.sub_attrs.map(attr => ({ ...attr })));
}

export function getEquipmentReturnExp(item: EquipBagItem, config: EquipConfig): number {
    return (config.items.get(item.item_id).add_equip_exp ?? 0)
        + (item.equip ? item.equip.strength_exp * config.rules.return_exp_rate : 0);
}

export function getEquipmentLevel(total_exp: number, thresholds: readonly number[], max_level: number): number {
    let level = 0;
    while (level < max_level && total_exp >= thresholds[level]) {
        level++;
    }
    return level;
}

export function previewEquipmentStrength(
    target: EquipBagItem, items: ReadonlyMap<number, EquipBagItem>, selection: readonly EquipConsume[], config: EquipConfig,
): EquipOperationResult<EquipStrengthPreview> {
    if (!target || !target.equip) {
        return { ok: false, message: lang(EquipLang.missingRetry) };
    }
    if (target.equip.pos_id < 1 || target.equip.pos_id > 4) {
        return { ok: false, message: lang(EquipLang.exclusiveNoStrength) };
    }
    const strength = getEquipmentStrength(target, config);
    const max_level = strength.max_level;
    const consumes: EquipConsume[] = [];
    const worn_guids: number[] = [];
    const seen = new Set<number>();
    let added_exp = 0;
    for (const consume of selection) {
        if (consume.count === 0) {
            continue;
        }
        if (!Number.isSafeInteger(consume.count) || consume.count < 0 || seen.has(consume.guid)) {
            return { ok: false, message: lang(EquipLang.badMaterialCount) };
        }
        seen.add(consume.guid);
        const material = items.get(consume.guid);
        if (!material || material.count < consume.count) {
            return { ok: false, message: lang(EquipLang.materialChanged) };
        }
        if (material.guid === target.guid || material.equip && material.equip.is_locked) {
            return { ok: false, message: lang(EquipLang.lockedMaterial) };
        }
        const material_config = config.items.get(material.item_id);
        if (!(material_config.add_equip_exp > 0) || material_config.artifact_data != null
            || material.equip && (material.equip.pos_id < 1 || material.equip.pos_id > 4)
            || material_config.equip_id != null && !material.equip) {
            return { ok: false, message: lang(EquipLang.badMaterial) };
        }
        if (material.equip && material.equip.hero_uuid) {
            worn_guids.push(material.guid);
        }
        consumes.push({ ...consume });
        added_exp += getEquipmentReturnExp(material, config) * consume.count;
    }
    const current_exp = target.equip.strength_exp;
    const cap_exp = max_level > 0 ? strength.need_exp[max_level - 1] : 0;
    const target_exp = Math.min(current_exp + added_exp, cap_exp);
    const to_level = max_level > 0 ? getEquipmentLevel(target_exp, strength.need_exp, max_level) : 0;
    const available_slots = Math.max(0, config.rules.max_sub_attrs - target.equip.sub_attrs.length);
    const pending_affixes = Math.min(available_slots, config.rules.affix_levels
        .filter(level => level > target.equip.strength_lv && level <= to_level).length);
    return {
        ok: true, message: '', data: {
            from_level: target.equip.strength_lv, to_level, max_level, current_exp, target_exp, added_exp,
            waste_exp: Math.max(0, current_exp + added_exp - cap_exp),
            gold_cost: Math.ceil(added_exp * config.rules.gold_per_exp),
            next_exp: to_level < max_level ? strength.need_exp[to_level] : cap_exp,
            level_start_exp: to_level > 0 ? strength.need_exp[to_level - 1] : 0,
            pending_affixes, worn_guids, consumes,
        },
    };
}

/** 只在消耗检查和确认通过后调用，预览不调用随机数。 */
export function strengthenEquipmentState(
    item: EquipBagItem, to_level: number, config: EquipConfig, random: () => number = Math.random,
): { equip: EquipInstance; changes: EquipAffixChange[] } {
    const equip = cloneEquipment(item.equip);
    const equip_config = getEquipData(item, config);
    const changes = new Map<number, EquipAffixChange>();
    for (const level of config.rules.affix_levels) {
        if (level <= equip.strength_lv || level > to_level) {
            continue;
        }
        let attr: EquipAttribute;
        let is_new = false;
        if (equip.sub_attrs.length < config.rules.max_sub_attrs) {
            attr = drawAttributes(equip_config.sub_attr_name, equip_config.sub_attr_value,
                equip_config.sub_attr_weight, 1, random, equip.sub_attrs.map(entry => entry.attr_id))[0];
            equip.sub_attrs.push(attr);
            is_new = true;
        } else {
            attr = equip.sub_attrs[Math.floor(random() * equip.sub_attrs.length)];
        }
        const pool_index = equip_config.sub_attr_name.indexOf(attr.attr_id);
        const delta = is_new ? attr.value : equip_config.sub_attr_value[pool_index];
        if (!is_new) {
            attr.value += delta;
        }
        attr.strength_times++;
        const previous = changes.get(attr.attr_id);
        changes.set(attr.attr_id, {
            attr_id: attr.attr_id, is_new: is_new || !!previous && previous.is_new,
            delta: delta + (previous ? previous.delta : 0), strength_times: attr.strength_times,
        });
    }
    equip.strength_lv = to_level;
    return { equip, changes: Array.from(changes.values()) };
}

export function previewEquipmentDecompose(
    guids: readonly number[], items: ReadonlyMap<number, EquipBagItem>, config: EquipConfig, allow_empty = false,
): EquipOperationResult<{ guids: number[]; rewards: EquipReward[] }> {
    const selected_guids = Array.from(new Set(guids));
    if (!allow_empty && selected_guids.length === 0) {
        return { ok: false, message: lang(EquipLang.pickDecompose) };
    }
    if (selected_guids.length > config.rules.decompose_max) {
        return { ok: false, message: lang(EquipLang.decomposeMax, { count: config.rules.decompose_max }) };
    }
    let total_exp = 0;
    for (const guid of selected_guids) {
        const item = items.get(guid);
        if (!item || !item.equip) {
            return { ok: false, message: lang(EquipLang.missingRetry) };
        }
        if (item.equip.is_locked || item.equip.hero_uuid || [1, 2, 3, 4].indexOf(item.equip.pos_id) < 0) {
            return { ok: false, message: lang(EquipLang.cannotDecompose) };
        }
        total_exp += getEquipmentReturnExp(item, config);
    }
    const reward_item_id = config.rules.reward_item_id;
    const reward_exp = config.items.get(reward_item_id).add_equip_exp;
    if (!(reward_exp > 0)) {
        throw new Error('分解返还物品没有配置装备经验');
    }
    return { ok: true, message: '', data: {
        guids: selected_guids,
        rewards: [{ item_id: reward_item_id, count: Math.floor(total_exp / reward_exp) }],
    } };
}

export function getHeroEquipmentTotals(items: readonly EquipBagItem[], config: EquipConfig): EquipAttributeTotals {
    const totals: EquipAttributeTotals = { flat: {}, rate: {} };
    const suit_counts = new Map<number, number>();
    const addAttribute = (attr_id: number, value: number) => {
        const attr_config = config.attrs.get(attr_id);
        const values = attr_config.value_type === 'rate' ? totals.rate : totals.flat;
        values[attr_config.attr_code] = (values[attr_config.attr_code] ?? 0) + value;
    };
    for (const item of items) {
        for (const attr of getEquipmentAttributes(item, config)) {
            addAttribute(attr.attr_id, attr.value);
        }
        const suit_id = getEquipData(item, config).suit_id;
        if (suit_id != null) {
            suit_counts.set(suit_id, (suit_counts.get(suit_id) ?? 0) + 1);
        }
    }
    for (const suit_attr of config.suit_attrs.values()) {
        if ((suit_counts.get(suit_attr.suit_id) ?? 0) < suit_attr.suit_nums) {
            continue;
        }
        suit_attr.suit_attribute_name.forEach((attr_id, index) => {
            addAttribute(attr_id, suit_attr.suit_attribute_value[index]);
        });
    }
    return totals;
}
