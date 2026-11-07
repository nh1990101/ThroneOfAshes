import { BaseMgr } from '../../Common/BaseMgr';
import { lang } from '../../Common/LangMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { BagItem, BagMgr } from '../Bag/BagMgr';
import { getEquipmentConfig } from './EquipConfig';
import {
    cloneEquipment, EquipLang, getEquipData, getEquipmentAttributes, getEquipmentReturnExp,
    getHeroEquipmentTotals, previewEquipmentDecompose, previewEquipmentStrength, strengthenEquipmentState,
} from './EquipLogic';
import {
    EQUIPMENT_GOLD_ITEM, EquipAttribute, EquipAttributeTotals, EquipConsume, EquipFilter, EquipOperationResult,
    EquipReward, EquipSort, EquipStrengthPreview, EquipStrengthResult,
} from './EquipTypes';

/** 装备实例属于背包，本管理器集中处理装备规则和结算。 */
export class EquipMgr extends BaseMgr {
    private quick_strengthen_quality: number;
    private quick_decompose_qualities: number[];

    public getEquipmentItem(guid: number): BagItem | undefined {
        const item = BagMgr.getInstance().getItem(guid);
        return item && item.equip ? item : undefined;
    }

    public getEquipmentItems(): BagItem[] {
        return BagMgr.getInstance().getBagItems().filter(item => !!item.equip);
    }

    public getHeroEquipments(hero_uuid: string): BagItem[] {
        if (!hero_uuid) return [];
        return this.getEquipmentItems().filter(item => item.equip.hero_uuid === hero_uuid)
            .sort((left, right) => left.equip.pos_id - right.equip.pos_id);
    }

    public getHeroEquipment(hero_uuid: string, pos_id: number): BagItem | undefined {
        return this.getHeroEquipments(hero_uuid).find(item => item.equip.pos_id === pos_id);
    }

    public getEquipmentCandidates(hero_uuid: string, pos_id: number, filter: EquipFilter, sort: EquipSort): BagItem[] {
        const current = this.getHeroEquipment(hero_uuid, pos_id);
        const config = getEquipmentConfig();
        const direction = sort.direction === 'asc' ? 1 : -1;
        const items = this.getEquipmentItems().filter(item => {
            const equip = item.equip;
            if (equip.pos_id !== pos_id || current && item.guid === current.guid) {
                return false;
            }
            if (filter.lock === 'locked' && !equip.is_locked || filter.lock === 'unlocked' && equip.is_locked) {
                return false;
            }
            if (filter.worn === 'worn' && !equip.hero_uuid || filter.worn === 'unworn' && equip.hero_uuid) {
                return false;
            }
            return filter.qualities.length === 0 || filter.qualities.indexOf(config.items.get(item.item_id).quality) >= 0;
        });
        return items.sort((left, right) => {
            const quality_delta = config.items.get(left.item_id).quality - config.items.get(right.item_id).quality;
            const level_delta = left.equip.strength_lv - right.equip.strength_lv;
            return direction * (sort.field === 'quality' ? quality_delta : level_delta)
                || -(sort.field === 'quality' ? level_delta : quality_delta) || left.guid - right.guid;
        });
    }

    public wearHeroEquipment(hero_uuid: string, guid: number, transfer_confirmed = false): EquipOperationResult {
        const item = this.getEquipmentItem(guid);
        if (!item || !hero_uuid) {
            return { ok: false, message: lang(EquipLang.heroOrEquipMissing) };
        }
        if (item.equip.pos_id < 1 || item.equip.pos_id > 4) {
            return { ok: false, message: lang(EquipLang.exclusiveClosed) };
        }
        if (item.equip.hero_uuid === hero_uuid) {
            return { ok: false, message: lang(EquipLang.alreadyWorn) };
        }
        if (item.equip.hero_uuid && !transfer_confirmed) {
            return { ok: false, message: lang(EquipLang.wornByOther), needs_transfer_confirm: true };
        }
        const previous = this.getHeroEquipment(hero_uuid, item.equip.pos_id);
        const equip = cloneEquipment(item.equip);
        equip.hero_uuid = hero_uuid;
        const updates = [{ guid, equip }];
        if (previous) {
            const old_equip = cloneEquipment(previous.equip);
            old_equip.hero_uuid = undefined;
            updates.push({ guid: previous.guid, equip: old_equip });
        }
        const ok = BagMgr.getInstance().applyBagTransaction([], [], [], updates);
        return { ok, message: ok ? previous ? lang(EquipLang.replaceOk) : lang(EquipLang.wearOk) : lang(EquipLang.equipChanged) };
    }

    public removeHeroEquipment(hero_uuid: string, pos_id: number): EquipOperationResult {
        const item = this.getHeroEquipment(hero_uuid, pos_id);
        if (!item) {
            return { ok: false, message: lang(EquipLang.slotEmpty) };
        }
        const equip = cloneEquipment(item.equip);
        equip.hero_uuid = undefined;
        const ok = BagMgr.getInstance().applyBagTransaction([], [], [], [{ guid: item.guid, equip }]);
        return { ok, message: ok ? lang(EquipLang.takenOff) : lang(EquipLang.equipChanged) };
    }

    public setEquipmentLocked(guid: number, is_locked: boolean): EquipOperationResult {
        const item = this.getEquipmentItem(guid);
        if (!item) {
            return { ok: false, message: lang(EquipLang.equipMissing) };
        }
        const equip = cloneEquipment(item.equip);
        equip.is_locked = is_locked;
        const ok = BagMgr.getInstance().applyBagTransaction([], [], [], [{ guid, equip }]);
        return { ok, message: ok ? is_locked ? lang(EquipLang.lockOk) : lang(EquipLang.unlockOk) : lang(EquipLang.equipChanged) };
    }

    public getEquipmentAttributes(guid: number, level?: number): EquipAttribute[] {
        const item = this.getEquipmentItem(guid);
        return item ? getEquipmentAttributes(item, getEquipmentConfig(), level) : [];
    }

    public getHeroEquipmentTotals(hero_uuid: string): EquipAttributeTotals {
        return getHeroEquipmentTotals(this.getHeroEquipments(hero_uuid), getEquipmentConfig());
    }

    public getEquipmentStrengthMaterials(target_guid: number): BagItem[] {
        const config = getEquipmentConfig();
        return BagMgr.getInstance().getBagItems().filter(item => {
            const row = config.items.get(item.item_id);
            return item.guid !== target_guid && row.add_equip_exp > 0 && row.artifact_data == null
                && !(item.equip && (item.equip.is_locked || item.equip.pos_id < 1 || item.equip.pos_id > 4));
        }).sort((left, right) => {
            if (!!left.equip !== !!right.equip) {
                return left.equip ? 1 : -1;
            }
            if (!left.equip) {
                return getEquipmentReturnExp(left, config) - getEquipmentReturnExp(right, config) || left.guid - right.guid;
            }
            return config.items.get(left.item_id).quality - config.items.get(right.item_id).quality
                || left.equip.strength_lv - right.equip.strength_lv
                || (getEquipData(left, config).suit_id ?? 0) - (getEquipData(right, config).suit_id ?? 0)
                || left.guid - right.guid;
        });
    }

    public previewEquipmentStrengthen(guid: number, selection: readonly EquipConsume[]): EquipOperationResult<EquipStrengthPreview> {
        const items = new Map(BagMgr.getInstance().getBagItems().map(item => [item.guid, item]));
        return previewEquipmentStrength(items.get(guid), items, selection, getEquipmentConfig());
    }

    public autoFillEquipmentMaterials(guid: number, selection: readonly EquipConsume[]): EquipOperationResult<EquipConsume[]> {
        const preview = this.previewEquipmentStrengthen(guid, selection);
        if (!preview.ok) {
            return { ok: false, message: preview.message };
        }
        if (preview.data.to_level >= preview.data.max_level) {
            return { ok: false, message: lang(EquipLang.strengthMaxFill) };
        }
        const config = getEquipmentConfig();
        const selected = new Map(selection.filter(entry => entry.count > 0).map(entry => [entry.guid, entry.count]));
        let needed_exp = preview.data.next_exp - preview.data.current_exp - preview.data.added_exp;
        let changed = false;
        for (const item of this.getEquipmentStrengthMaterials(guid)) {
            if (needed_exp <= 0) {
                break;
            }
            if (item.equip && (item.equip.hero_uuid || config.items.get(item.item_id).quality > this.getEquipmentQuickQuality())) {
                continue;
            }
            const available = item.count - (selected.get(item.guid) ?? 0);
            const per_exp = getEquipmentReturnExp(item, config);
            const take = Math.min(available, Math.ceil(needed_exp / per_exp));
            if (take <= 0) {
                continue;
            }
            selected.set(item.guid, (selected.get(item.guid) ?? 0) + take);
            needed_exp -= per_exp * take;
            changed = true;
        }
        return {
            ok: changed,
            message: !changed ? lang(EquipLang.noStrengthMaterial) : needed_exp > 0 ? lang(EquipLang.fillNotEnough) : lang(EquipLang.fillEnough),
            data: Array.from(selected, ([item_guid, count]) => ({ guid: item_guid, count })),
        };
    }

    public strengthenEquipment(
        guid: number, selection: readonly EquipConsume[], worn_confirmed = false, overflow_confirmed = false,
    ): EquipOperationResult<EquipStrengthResult> {
        const result = this.previewEquipmentStrengthen(guid, selection);
        if (!result.ok) {
            return { ok: false, message: result.message };
        }
        const preview = result.data;
        if (preview.from_level >= preview.max_level) {
            return { ok: false, message: lang(EquipLang.strengthMax) };
        }
        if (preview.consumes.length === 0) {
            return { ok: false, message: lang(EquipLang.pickStrength) };
        }
        const bag = BagMgr.getInstance();
        if (!bag.isEnough(EQUIPMENT_GOLD_ITEM, preview.gold_cost)) {
            return { ok: false, message: lang(EquipLang.goldShort) };
        }
        if (preview.worn_guids.length && !worn_confirmed || preview.waste_exp > 0 && !overflow_confirmed) {
            return {
                ok: false, message: lang(EquipLang.confirmCost),
                needs_worn_confirm: preview.worn_guids.length > 0 && !worn_confirmed,
                needs_overflow_confirm: preview.waste_exp > 0 && !overflow_confirmed,
            };
        }
        const item = this.getEquipmentItem(guid);
        const strengthened = strengthenEquipmentState(item, preview.to_level, getEquipmentConfig());
        strengthened.equip.strength_exp = preview.target_exp;
        const ok = bag.applyBagTransaction(preview.consumes,
            [{ item_id: EQUIPMENT_GOLD_ITEM, count: preview.gold_cost }], [], [{ guid, equip: strengthened.equip }]);
        return {
            ok, message: ok ? preview.to_level > preview.from_level ? lang(EquipLang.strengthOk) : lang(EquipLang.expAdded) : lang(EquipLang.materialChanged),
            data: ok ? { preview, affix_changes: strengthened.changes } : undefined,
        };
    }

    public getEquipmentDecomposeItems(): BagItem[] {
        const config = getEquipmentConfig();
        return this.getEquipmentItems().filter(item => !item.equip.hero_uuid && !item.equip.is_locked
            && [1, 2, 3, 4].indexOf(item.equip.pos_id) >= 0).sort((left, right) =>
                config.items.get(left.item_id).quality - config.items.get(right.item_id).quality
                || (getEquipData(left, config).suit_id ?? 0) - (getEquipData(right, config).suit_id ?? 0)
                || left.equip.strength_lv - right.equip.strength_lv || left.guid - right.guid);
    }

    public previewEquipmentDecompose(guids: readonly number[], allow_empty = true) {
        return previewEquipmentDecompose(guids, new Map(BagMgr.getInstance().getBagItems().map(item => [item.guid, item])),
            getEquipmentConfig(), allow_empty);
    }

    public autoAddEquipmentDecompose(guids: readonly number[]): EquipOperationResult<number[]> {
        const preview = this.previewEquipmentDecompose(guids);
        if (!preview.ok) {
            return { ok: false, message: preview.message };
        }
        const config = getEquipmentConfig();
        const selected = new Set(preview.data.guids);
        const old_count = selected.size;
        if (old_count >= config.rules.decompose_max) {
            return { ok: false, message: lang(EquipLang.selectMax) };
        }
        const qualities = this.getEquipmentDecomposeQualities();
        const candidates = this.getEquipmentDecomposeItems().sort((left, right) =>
            config.items.get(left.item_id).quality - config.items.get(right.item_id).quality
            || left.equip.strength_lv - right.equip.strength_lv
            || (getEquipData(left, config).suit_id ?? 0) - (getEquipData(right, config).suit_id ?? 0)
            || left.guid - right.guid);
        for (const item of candidates) {
            if (selected.size >= config.rules.decompose_max) {
                break;
            }
            if (qualities.indexOf(config.items.get(item.item_id).quality) >= 0) {
                selected.add(item.guid);
            }
        }
        return { ok: selected.size > old_count, message: selected.size > old_count
            ? lang(EquipLang.addedEquips, { count: selected.size - old_count }) : lang(EquipLang.noMatchedEquip), data: Array.from(selected) };
    }

    public decomposeEquipment(guids: readonly number[]): EquipOperationResult<EquipReward[]> {
        const preview = this.previewEquipmentDecompose(guids, false);
        if (!preview.ok) {
            return { ok: false, message: preview.message };
        }
        const ok = BagMgr.getInstance().applyBagTransaction(preview.data.guids.map(guid => ({ guid, count: 1 })),
            [], preview.data.rewards);
        return { ok, message: ok ? lang(EquipLang.decomposeOk) : lang(EquipLang.equipChanged), data: ok ? preview.data.rewards : undefined };
    }

    public getEquipmentQuickQuality(): number {
        return this.quick_strengthen_quality ?? getEquipmentConfig().rules.quick_quality;
    }

    public setEquipmentQuickQuality(quality: number): void {
        this.quick_strengthen_quality = quality;
    }

    public getEquipmentDecomposeQualities(): number[] {
        if (!this.quick_decompose_qualities) {
            const ceiling = getEquipmentConfig().rules.quick_quality;
            this.quick_decompose_qualities = Array.from(ConfigMgr.instance.QualityData.keys()).filter(quality => quality <= ceiling);
        }
        return this.quick_decompose_qualities.slice();
    }

    public setEquipmentDecomposeQualities(qualities: readonly number[]): void {
        this.quick_decompose_qualities = Array.from(new Set(qualities));
    }
}
