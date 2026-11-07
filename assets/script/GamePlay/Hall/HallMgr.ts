import { BaseMgr } from '../../Common/BaseMgr';
import { lang } from '../../Common/LangMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { BagMgr } from '../Bag/BagMgr';
import { IBuildLevelData } from '../../Config/Typings/BuildLevelData';
import { IGarrisonTypeData } from '../../Config/Typings/GarrisonTypeData';
import { IUnitData } from '../../Config/Typings/UnitData';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { HeroMgr } from '../Hero/HeroMgr';
import type { HeroInstanceData } from '../Hero/HeroTypes';

export const HALL_STATE_UPDATE = 'HALL_STATE_UPDATE';

export const HallLang = {
    title: 86,
    back: 87,
    tabGarrison: 88,
    tabUpgrade: 89,
    listTitle: 90,
    listHint: 91,
    seatIndex: 92,
    seatLocked: 93,
    seatEmpty: 94,
    seatSelectedHero: 95,
    seatSelectedEmpty: 96,
    seatSelectedLocked: 97,
    baseOutput: 99,
    remove: 100,
    assign: 101,
    changeGarrison: 102,
    seatLockedBtn: 103,
    max_level: 104,
    upgradeButton: 105,
    noPrereq: 106,
    prereq: 107,
    prereqItem: 108,
    upgradeNote: 109,
    upgradeTime: 110,
    needBuilding: 111,
    resourceShort: 112,
    seatUnchanged: 113,
    seatChange: 114,
    outputChange: 115,
    modalTitle: 116,
    modalSub: 117,
    filterRecommend: 118,
    filterAll: 119,
    filterFree: 120,
    heroBonus: 121,
    cannotGarrison: 122,
    idle: 123,
    currentSeat: 124,
    garrisonAt: 125,
    noHeroResult: 126,
    preview: 127,
    chooseHero: 128,
    sameHero: 129,
    moveFrom: 130,
    moveInBuilding: 131,
    replaceHero: 132,
    garrisonNote: 133,
    confirmGarrison: 134,
    currentGarrison: 135,
    chooseHeroBtn: 136,
    upgradeSuccess: 137,
    removeSuccess: 138,
    garrisonUpdated: 139,
    garrisonFailed: 141,
    buildingNotExist: 142,
    heroNotExist: 143,
    heroCannotGarrison: 144,
    heroAlreadySeat: 145,
    demoHint: 146,
    level: 147,
    garrisonCount: 148,
    can_upgrade: 149,
    occupiedSeats: 150,
    upgradeTarget: 151,
    timeHour: 152,
    timeMinute: 153,
    timeSecond: 154,
} as const;

export type HallTab = 'garrison' | 'upgrade';

export type HeroFilter = 'recommend' | 'all' | 'free';

export interface HallBuildingRow {
    id: number;
    level: number;
    /** 每席保存拥有的英雄实例 UUID。 */
    slots: (string | null)[];
}

/** 临时本地状态结构。接服务器后由 HallRemote 返回同样结构。资源走 BagMgr。 */
export interface HallState {
    buildings: HallBuildingRow[];
}

// ==================== 临时接口 / 本地 mock ====================
// 服务器接入前先保留这组接口和内存实现：
// 1. 新写一个 HallRemote 实现；
// 2. 调用 HallMgr.setRemote(new XxxRemote())；
// 3. 删除 HallLocalGateway、DEMO_LEVELS、createDemoState。

/** 临时接口：接服务器时实现它，替换 HallLocalGateway。 */
export interface HallRemote {
    fetchState(): Promise<HallState>;
    upgrade(building_id: number): Promise<HallState>;
    setGarrison(building_id: number, slot: number, hero_uuid: string | null): Promise<HallState>;
}

export interface HallActionResult {
    ok: boolean;
    message: string;
}

export interface HeroAssignment {
    building_id: number;
    building_name: string;
    slot: number;
}

export interface HeroChoiceView {
    hero: HeroInstanceData;
    name: string;
    faction_name: string;
    /** 百分比，4 表示 +4% */
    bonus: number;
    assigned: HeroAssignment | null;
    can_garrison: boolean;
}

export interface HallCostView {
    item_id: number;
    name: string;
    need: number;
    owned: number;
    enough: boolean;
}

export interface HallPrereqView {
    building_id: number;
    name: string;
    need_level: number;
    current_level: number;
    met: boolean;
}

export interface HallUpgradeInfo {
    current_level: number;
    next_level: number;
    max_level: boolean;
    can_upgrade: boolean;
    reason: string;
    costs: HallCostView[];
    prereqs: HallPrereqView[];
    slot_before: number;
    slot_after: number;
    base_before: number;
    base_after: number;
    product_item?: number;
    product_name: string;
    time_seconds: number;
}

export interface HallEffectInfo {
    name: string;
    code: string;
    /** 百分比，12 表示 12% */
    bonus: number;
    /** 带正负号的展示文本 */
    text: string;
    product_item?: number;
    product_name: string;
    base_product: number;
}

export const RESOURCE_ITEM_IDS = [1002, 1003] as const;

/** 临时演示等级，覆盖 3/2/1 席三种状态。 */
const DEMO_LEVELS: Record<number, number> = {
    1: 21,
    2: 11,
    3: 1,
};

// ==================== 配置读取与业务规则 ====================

const level_rows = new Map<string, IBuildLevelData>();

function levelKey(build_id: number, level: number): string {
    return `${build_id}_${level}`;
}

function ensureLevelRows(): void {
    if (level_rows.size > 0) {
        return;
    }
    for (const row of ConfigMgr.instance.BuildLevelData.values()) {
        level_rows.set(levelKey(row.build_id, row.level), row);
    }
}

function getLevelRow(build_id: number, level: number): IBuildLevelData | undefined {
    ensureLevelRows();
    return level_rows.get(levelKey(build_id, level));
}

function getGarrisonBuildingIds(): number[] {
    return Array.from(ConfigMgr.instance.BuildTypeData.values())
        .filter(cfg => cfg.can_garrison === true)
        .map(cfg => cfg.id)
        .sort((a, b) => a - b);
}

/** 建筑等级表里配过等级的建筑。升级页用这份列表。 */
function getUpgradeBuildingIds(): number[] {
    ensureLevelRows();
    const build_ids = new Set<number>();
    for (const row of level_rows.values()) {
        if (row.build_id == null) {
            continue;
        }
        build_ids.add(row.build_id);
    }
    return Array.from(build_ids).sort((a, b) => a - b);
}

/** 驻守或升级都会用到的建筑。本地状态要带上当前等级。 */
function getStateBuildingIds(): number[] {
    const build_ids = new Set<number>(getGarrisonBuildingIds());
    for (const build_id of getUpgradeBuildingIds()) {
        build_ids.add(build_id);
    }
    return Array.from(build_ids).sort((a, b) => a - b);
}

function getBuildingName(build_id: number): string {
    const name = ConfigMgr.instance.BuildTypeData.get(build_id).name;
    return name != null ? lang(name) : '';
}

function getBuildingIcon(build_id: number): number | undefined {
    return ConfigMgr.instance.BuildTypeData.get(build_id).icon;
}

function getItemName(item_id: number): string {
    const name = ConfigMgr.instance.ItemData.get(item_id).name;
    return name != null ? lang(name) : '';
}

function getSlotCount(build_id: number, level: number): number {
    const row = getLevelRow(build_id, level);
    if (row == null || row.garrison_count == null) {
        return 0;
    }
    return row.garrison_count;
}

function getEffectConfig(build_id: number): IGarrisonTypeData {
    const effect_id = ConfigMgr.instance.BuildTypeData.get(build_id).garrison_effect_type;
    return ConfigMgr.instance.GarrisonTypeData.get(effect_id);
}

function getHeroUnit(hero_uuid: string): IUnitData {
    const hero = HeroMgr.getInstance().getHeroByUuid(hero_uuid);
    const unit_id = ConfigMgr.instance.HeroData.get(hero.id).unit_id;
    return ConfigMgr.instance.UnitData.get(unit_id);
}

function getHeroName(hero_uuid: string): string {
    return HeroMgr.getInstance().getHeroByUuid(hero_uuid).name;
}

function getHeroIcon(hero_uuid: string): number | undefined {
    return getHeroUnit(hero_uuid).icon;
}

function getHeroFactionName(hero_uuid: string): string {
    const faction_id = getHeroUnit(hero_uuid).faction_id;
    if (faction_id == null) {
        return '';
    }
    const name = ConfigMgr.instance.FactionData.get(faction_id).name;
    return name != null ? lang(name) : '';
}

/** 返回百分比，4 表示 4%。某一档没填加成时为 0，该英雄不能驻守这栋建筑。 */
function getHeroBonus(hero_uuid: string, build_id: number): number {
    if (!HeroMgr.getInstance().getHeroByUuid(hero_uuid)) {
        return 0;
    }
    const bonus_list = ConfigMgr.instance.BuildTypeData.get(build_id).garrison_bonus;
    const rarity = getHeroUnit(hero_uuid).rarity_id;
    const value = bonus_list[rarity - 1];
    if (value == null) {
        return 0;
    }
    return Math.round(value * 10000) / 100;
}

function formatPercent(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getStateBuilding(state: HallState, build_id: number): HallBuildingRow | undefined {
    return state.buildings.find(row => row.id === build_id);
}

function getTotalBonus(state: HallState, build_id: number): number {
    const building = getStateBuilding(state, build_id);
    let total = 0;
    for (const hero_uuid of building.slots) {
        if (hero_uuid != null) {
            total += getHeroBonus(hero_uuid, build_id);
        }
    }
    return Math.round(total * 100) / 100;
}

function getEffectInfo(state: HallState, build_id: number): HallEffectInfo {
    const building = getStateBuilding(state, build_id);
    const level_row = getLevelRow(build_id, building.level);
    const effect_cfg = getEffectConfig(build_id);
    const bonus = getTotalBonus(state, build_id);
    const code = effect_cfg.effect_code;
    const sign = code === 'recruit_cost' ? '-' : '+';
    const name_id = effect_cfg.name;
    return {
        name: name_id != null ? lang(name_id) : '',
        code,
        bonus,
        text: bonus === 0 ? '0%' : `${sign}${formatPercent(bonus)}%`,
        product_item: level_row.product_item,
        product_name: level_row.product_item != null ? getItemName(level_row.product_item) : '',
        base_product: level_row.product_count,
    };
}

function getOwnedHeroUuids(): string[] {
    return HeroMgr.getInstance().getHeroes().map(hero => hero.uuid);
}

function getHeroAssignment(state: HallState, hero_uuid: string): HeroAssignment | null {
    for (const building of state.buildings) {
        for (let slot = 0; slot < building.slots.length; slot++) {
            if (building.slots[slot] === hero_uuid) {
                return {
                    building_id: building.id,
                    building_name: getBuildingName(building.id),
                    slot,
                };
            }
        }
    }
    return null;
}

function getHeroChoices(state: HallState, build_id: number): HeroChoiceView[] {
    return HeroMgr.getInstance().getHeroes().map(hero => {
        const bonus = getHeroBonus(hero.uuid, build_id);
        return {
            hero,
            name: hero.name,
            faction_name: getHeroFactionName(hero.uuid),
            bonus,
            assigned: getHeroAssignment(state, hero.uuid),
            can_garrison: bonus > 0,
        };
    });
}

function filterHeroChoices(list: HeroChoiceView[], filter: HeroFilter): HeroChoiceView[] {
    let result = list;
    if (filter === 'free') {
        result = list.filter(hero => !hero.assigned);
    }
    return [...result].sort((a, b) => {
        if (filter === 'recommend' && b.bonus !== a.bonus) {
            return b.bonus - a.bonus;
        }
        if (filter === 'recommend' && Boolean(a.assigned) !== Boolean(b.assigned)) {
            return a.assigned ? 1 : -1;
        }
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
}

/** 返回加入/更换英雄后的总加成，不修改状态。 */
function calculatePreviewBonus(state: HallState, build_id: number, slot: number, hero_uuid: string | null): { before: number; after: number } {
    const before = getTotalBonus(state, build_id);
    const building = getStateBuilding(state, build_id);
    if (hero_uuid == null || building.slots[slot] === hero_uuid) {
        return { before, after: before };
    }
    const slot_hero_uuid = building.slots[slot];
    const slot_bonus = slot_hero_uuid != null ? getHeroBonus(slot_hero_uuid, build_id) : 0;
    const chosen_bonus = getHeroBonus(hero_uuid, build_id);
    const assignment = getHeroAssignment(state, hero_uuid);
    const duplicated = assignment?.building_id === build_id && assignment.slot !== slot;
    const after = before - slot_bonus + chosen_bonus - (duplicated ? chosen_bonus : 0);
    return { before, after: Math.max(0, Math.round(after * 100) / 100) };
}

/** 临时演示状态。接服务器后删除。 */
function createDemoState(): HallState {
    const buildings: HallBuildingRow[] = getStateBuildingIds().map(build_id => {
        const type_cfg = ConfigMgr.instance.BuildTypeData.get(build_id);
        // 类型表没填初始等级时从 0 级开始，等级表第一行是升到这一级的消耗。
        const level = DEMO_LEVELS[build_id] ?? type_cfg.init_level ?? 0;
        const count = type_cfg.can_garrison === true ? getSlotCount(build_id, level) : 0;
        return {
            id: build_id,
            level,
            slots: Array.from({ length: count }, () => null),
        };
    });
    seedDemoGarrison(buildings);
    return { buildings };
}

/** 临时演示：先放几个英雄，打开界面就能看到驻守中和空闲两种状态。 */
function seedDemoGarrison(buildings: HallBuildingRow[]): void {
    const hero_uuids = getOwnedHeroUuids();
    const seeds: Record<number, (string | null)[]> = {
        1: [hero_uuids[0] ?? null, hero_uuids[1] ?? null, null],
        2: [hero_uuids[2] ?? null, null],
        3: [null],
    };
    for (const building of buildings) {
        const seed = seeds[building.id];
        if (!seed) {
            continue;
        }
        for (let i = 0; i < building.slots.length && i < seed.length; i++) {
            const hero_uuid = seed[i];
            if (hero_uuid != null && getHeroBonus(hero_uuid, building.id) > 0) {
                building.slots[i] = hero_uuid;
            }
        }
    }
}

/** 英雄被消耗或移除后，原驻守席位随之空出。 */
function clearUnownedGarrison(state: HallState): void {
    const owned_uuids = new Set(getOwnedHeroUuids());
    for (const building of state.buildings) {
        for (let slot = 0; slot < building.slots.length; slot++) {
            const hero_uuid = building.slots[slot];
            if (hero_uuid != null && !owned_uuids.has(hero_uuid)) {
                building.slots[slot] = null;
            }
        }
    }
}

function cloneState(state: HallState): HallState {
    return {
        buildings: state.buildings.map(row => ({
            id: row.id,
            level: row.level,
            slots: [...row.slots],
        })),
    };
}

function getUpgradeInfo(state: HallState, build_id: number): HallUpgradeInfo {
    const building = getStateBuilding(state, build_id);
    const current_level = building.level;
    const current_row = getLevelRow(build_id, current_level);
    const next_level = current_level + 1;
    const next_row = getLevelRow(build_id, next_level);
    const product_item = current_row != null && current_row.product_item != null
        ? current_row.product_item
        : next_row != null ? next_row.product_item : undefined;
    const product_name = product_item != null ? getItemName(product_item) : '';
    const slot_before = current_row != null && current_row.garrison_count != null ? current_row.garrison_count : 0;
    const base_before = current_row != null && current_row.product_count != null ? current_row.product_count : 0;

    if (!next_row) {
        return {
            current_level,
            next_level: current_level,
            max_level: true,
            can_upgrade: false,
            reason: lang(HallLang.max_level),
            costs: [],
            prereqs: [],
            slot_before,
            slot_after: slot_before,
            base_before,
            base_after: base_before,
            product_item,
            product_name,
            time_seconds: 0,
        };
    }

    const need_items = next_row.need_item ?? [];
    const need_counts = next_row.item_count ?? [];
    const costs: HallCostView[] = need_items.map((item_id, index) => {
        const need = need_counts[index];
        const owned = BagMgr.getInstance().getCount(item_id);
        return {
            item_id,
            name: getItemName(item_id),
            need,
            owned,
            enough: owned >= need,
        };
    });

    const need_build_ids = next_row.need_build_id ?? [];
    const need_build_levels = next_row.need_build_level ?? [];
    const prereqs: HallPrereqView[] = need_build_ids.map((need_id, index) => {
        const state_row = getStateBuilding(state, need_id);
        const current = state_row ? state_row.level : 0;
        const need_level = need_build_levels[index];
        return {
            building_id: need_id,
            name: getBuildingName(need_id),
            need_level,
            current_level: current,
            met: current >= need_level,
        };
    });

    const failed_prereq = prereqs.find(item => !item.met);
    const lacks_resource = !BagMgr.getInstance().isEnoughList(costs.map(cost => ({ item_id: cost.item_id, count: cost.need })));
    const can_upgrade = !failed_prereq && !lacks_resource;

    return {
        current_level,
        next_level,
        max_level: false,
        can_upgrade,
        reason: failed_prereq
            ? lang(HallLang.needBuilding, { name: failed_prereq.name, lv: failed_prereq.need_level })
            : lacks_resource
                ? lang(HallLang.resourceShort)
                : '',
        costs,
        prereqs,
        slot_before,
        slot_after: next_row.garrison_count ?? 0,
        base_before,
        base_after: next_row.product_count,
        product_item,
        product_name,
        time_seconds: next_row.uplv_time,
    };
}

function validateUpgrade(state: HallState, build_id: number): string {
    const info = getUpgradeInfo(state, build_id);
    if (info.max_level) {
        return lang(HallLang.max_level);
    }
    if (info.reason) {
        return info.reason;
    }
    return '';
}

function applyUpgrade(state: HallState, build_id: number): void {
    const info = getUpgradeInfo(state, build_id);
    if (info.max_level) {
        return;
    }
    const building = getStateBuilding(state, build_id);
    if (!BagMgr.getInstance().applyBagTransaction([], info.costs.map(cost => ({ item_id: cost.item_id, count: cost.need })))) {
        throw new Error(lang(HallLang.resourceShort));
    }
    building.level = info.next_level;
    if (ConfigMgr.instance.BuildTypeData.get(build_id).can_garrison !== true) {
        return;
    }
    const count = getSlotCount(build_id, building.level);
    while (building.slots.length < count) {
        building.slots.push(null);
    }
    while (building.slots.length > count) {
        building.slots.pop();
    }
}

function validateGarrison(state: HallState, build_id: number, slot: number, hero_uuid: string | null): string {
    const building = getStateBuilding(state, build_id);
    if (!building) {
        return lang(HallLang.buildingNotExist);
    }
    if (slot < 0 || slot >= getSlotCount(build_id, building.level)) {
        return lang(HallLang.seatLockedBtn);
    }
    if (hero_uuid == null) {
        return '';
    }
    if (!HeroMgr.getInstance().getHeroByUuid(hero_uuid)) {
        return lang(HallLang.heroNotExist);
    }
    if (getHeroBonus(hero_uuid, build_id) <= 0) {
        return lang(HallLang.heroCannotGarrison);
    }
    if (building.slots[slot] === hero_uuid) {
        return lang(HallLang.heroAlreadySeat);
    }
    return '';
}

function applyGarrison(state: HallState, build_id: number, slot: number, hero_uuid: string | null): void {
    const building = getStateBuilding(state, build_id);
    if (hero_uuid == null) {
        building.slots[slot] = null;
        return;
    }
    for (const row of state.buildings) {
        const old_slot = row.slots.indexOf(hero_uuid);
        if (old_slot >= 0) {
            row.slots[old_slot] = null;
        }
    }
    building.slots[slot] = hero_uuid;
}

// ==================== 本地网关（临时实现） ====================

/** 临时本地实现：状态只在内存，刷新游戏后重置；接协议后升级扣费和建筑状态由服务器结算。 */
class HallLocalGateway implements HallRemote {
    private state: HallState;

    constructor(state?: HallState) {
        this.state = state ? cloneState(state) : createDemoState();
    }

    public async fetchState(): Promise<HallState> {
        clearUnownedGarrison(this.state);
        return cloneState(this.state);
    }

    public async upgrade(building_id: number): Promise<HallState> {
        clearUnownedGarrison(this.state);
        const reason = validateUpgrade(this.state, building_id);
        if (reason) {
            throw new Error(reason);
        }
        applyUpgrade(this.state, building_id);
        return cloneState(this.state);
    }

    public async setGarrison(building_id: number, slot: number, hero_uuid: string | null): Promise<HallState> {
        clearUnownedGarrison(this.state);
        const reason = validateGarrison(this.state, building_id, slot, hero_uuid);
        if (reason) {
            throw new Error(reason);
        }
        applyGarrison(this.state, building_id, slot, hero_uuid);
        return cloneState(this.state);
    }
}

// ==================== 对外管理器 ====================

export class HallMgr extends BaseMgr {
    /** 临时本地状态；load 后来自 remote。 */
    private state: HallState = createDemoState();
    /** 临时默认实现；接服务器后 setRemote 替换。 */
    private remote: HallRemote = new HallLocalGateway(this.state);

    constructor() {
        super();
        EventManager.Instance.addListener(GameEvent.HERO_DATA_UPDATE, this.onHeroesUpdate, this);
    }

    private onHeroesUpdate(): void {
        clearUnownedGarrison(this.state);
        EventManager.Instance.dispatch(HALL_STATE_UPDATE);
    }

    /** 临时接入口：服务器实现 HallRemote 后在这里替换。 */
    public setRemote(remote: HallRemote): void {
        this.remote = remote;
    }

    public async load(): Promise<void> {
        this.state = await this.remote.fetchState();
        clearUnownedGarrison(this.state);
    }

    public getState(): HallState {
        return this.state;
    }

    public getBuildingIds(tab: HallTab): number[] {
        return tab === 'upgrade' ? getUpgradeBuildingIds() : getGarrisonBuildingIds();
    }

    public getBuilding(build_id: number): HallBuildingRow | undefined {
        return this.state.buildings.find(row => row.id === build_id);
    }

    /** 当前建筑等级。议事厅没有这栋建筑时是 0。 */
    public getBuildingLevel(build_id: number): number {
        const building = this.getBuilding(build_id);
        if (!building) {
            return 0;
        }
        return building.level;
    }

    public async upgrade(build_id: number): Promise<HallActionResult> {
        try {
            this.state = await this.remote.upgrade(build_id);
            clearUnownedGarrison(this.state);
            EventManager.Instance.dispatch(HALL_STATE_UPDATE);
            return { ok: true, message: lang(HallLang.upgradeSuccess) };
        } catch (error) {
            return { ok: false, message: (error as Error).message };
        }
    }

    public async setGarrison(build_id: number, slot: number, hero_uuid: string | null): Promise<HallActionResult> {
        const reason = validateGarrison(this.state, build_id, slot, hero_uuid);
        if (reason) {
            return { ok: false, message: reason };
        }
        try {
            this.state = await this.remote.setGarrison(build_id, slot, hero_uuid);
            clearUnownedGarrison(this.state);
            EventManager.Instance.dispatch(HALL_STATE_UPDATE);
            return { ok: true, message: hero_uuid == null ? lang(HallLang.removeSuccess) : lang(HallLang.garrisonUpdated) };
        } catch (error) {
            return { ok: false, message: (error as Error).message };
        }
    }

    public getUpgradeInfo(build_id: number): HallUpgradeInfo {
        return getUpgradeInfo(this.state, build_id);
    }

    public getEffectInfo(build_id: number): HallEffectInfo {
        return getEffectInfo(this.state, build_id);
    }

    public getHeroChoices(build_id: number, filter: HeroFilter): HeroChoiceView[] {
        return filterHeroChoices(getHeroChoices(this.state, build_id), filter);
    }

    public getHeroAssignment(hero_uuid: string): HeroAssignment | null {
        return getHeroAssignment(this.state, hero_uuid);
    }

    public getGarrisonPreviewBonus(build_id: number, slot: number, hero_uuid: string | null): { before: number; after: number } {
        return calculatePreviewBonus(this.state, build_id, slot, hero_uuid);
    }

    public getBuildingName(build_id: number): string {
        return getBuildingName(build_id);
    }

    public getBuildingIcon(build_id: number): number | undefined {
        return getBuildingIcon(build_id);
    }

    public getItemName(item_id: number): string {
        return getItemName(item_id);
    }

    public getHeroName(hero_uuid: string): string {
        return getHeroName(hero_uuid);
    }

    public getHeroIcon(hero_uuid: string): number | undefined {
        return getHeroIcon(hero_uuid);
    }

    public getHeroBonus(hero_uuid: string, build_id: number): number {
        return getHeroBonus(hero_uuid, build_id);
    }

    public formatPercent(value: number): string {
        return formatPercent(value);
    }
}
