import { BaseMgr } from '../../Common/BaseMgr';
import { lang } from '../../Common/LangMgr';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { EquipMgr } from '../Equip/EquipMgr';
import { createLocalHeroes } from './HeroLocalData';
import type { HeroCardData, HeroInstanceData, HeroStarCostSlot } from './HeroTypes';

export type { HeroStarCostKind, HeroStarCostSlot } from './HeroTypes';

/** 程序多语言。英雄养成新句子从 341 起，属性和升级沿用已有 id。统御在游戏多语言 100294 */
export const HeroLang = {
    cardLevel: 341,
    exclusiveClosed: 342,
    artifactClosed: 343,
    noWearInstance: 344,
    breakthrough: 345,
    starCostWrong: 346,
    starCostShort: 347,
    any: 348,
    starCount: 349,
    skillUnlock: 350,
    level: 248,
    atk: 23,
    def: 24,
    intelligence: 79,
    command: 100294,
    upgrade: 25,
} as const;

/** 英雄实例和图鉴分别同步；未收到实例同步时才使用本地演示数据。 */
export class HeroMgr extends BaseMgr {
    private hero_by_uuid = new Map<string, HeroInstanceData>();
    private heroes_ready = false;
    private codex_hero_ids = new Set<number>();

    /** 返回列表副本，界面排序不改变管理器中的顺序和实例身份。 */
    public getHeroes(): HeroInstanceData[] {
        this.ensureHeroData();
        return Array.from(this.hero_by_uuid.values());
    }

    public getHeroByUuid(hero_uuid: string): HeroInstanceData | undefined {
        this.ensureHeroData();
        return this.hero_by_uuid.get(hero_uuid);
    }

    /** 兼容已有调用，数据统一来自拥有的英雄实例。 */
    public getTestHeroes(): HeroCardData[] {
        return this.getHeroes();
    }

    /** 全量实例同步入口。正式由服务器回包写入，空列表也会覆盖本地演示数据。 */
    public syncAllHeroes(heroes: readonly HeroInstanceData[]): void {
        const hero_uuids = new Set<string>();
        for (const hero of heroes) {
            if (typeof hero.uuid !== 'string' || !hero.uuid || hero_uuids.has(hero.uuid)) {
                throw new Error('英雄实例 uuid 为空或重复');
            }
            hero_uuids.add(hero.uuid);
        }
        const next_heroes = new Map<string, HeroInstanceData>();
        for (const hero of heroes) {
            next_heroes.set(hero.uuid, this.updateHeroInstance(hero));
        }
        this.hero_by_uuid = next_heroes;
        this.heroes_ready = true;
        EventManager.Instance.dispatch(GameEvent.HERO_DATA_UPDATE);
    }

    /** 同步一个完整实例，按 uuid 更新或加入；不使用配置 id 合并同名英雄。 */
    public syncHero(hero: HeroInstanceData): void {
        if (typeof hero.uuid !== 'string' || !hero.uuid) {
            throw new Error('英雄实例缺少 uuid');
        }
        this.hero_by_uuid.set(hero.uuid, this.updateHeroInstance(hero));
        this.heroes_ready = true;
        EventManager.Instance.dispatch(GameEvent.HERO_DATA_UPDATE);
    }

    /** 同步移除实例；图鉴记录和装备归属分别由各自的数据同步处理。 */
    public syncDeleteHero(hero_uuid: string): void {
        this.heroes_ready = true;
        if (this.hero_by_uuid.delete(hero_uuid)) {
            EventManager.Instance.dispatch(GameEvent.HERO_DATA_UPDATE);
        }
    }

    public getHeroDisplayAttrs(hero: HeroCardData): HeroCardData['attrs'] {
        const totals = EquipMgr.getInstance().getHeroEquipmentTotals(hero.uuid);
        const attrs = { ...hero.attrs };
        for (const attr_code of ['atk', 'def', 'intelligence', 'command']) {
            const attr_id = `base_${attr_code}`;
            attrs[attr_id] = Math.round(((hero.attrs?.[attr_id] ?? 0) + (totals.flat[attr_code] ?? 0))
                * (1 + (totals.rate[attr_code] ?? 0)) * 100) / 100;
        }
        return attrs;
    }

    /** 图鉴使用配置 id，与当前拥有几张英雄实例无关。 */
    public hasCodexHero(hero_id: number): boolean {
        return this.codex_hero_ids.has(hero_id);
    }

    /** 全量图鉴同步入口，正式由服务器回包覆盖本地记录。 */
    public syncCodexHeroes(hero_ids: readonly number[]): void {
        this.codex_hero_ids = new Set(hero_ids);
        EventManager.Instance.dispatch(GameEvent.HERO_CODEX_UPDATE);
    }

    public recordCodexHero(hero_id: number): boolean {
        return this.recordCodexHeroes([hero_id])[0];
    }

    /** 本地抽卡模拟使用；同批重复配置只有首次返回 true，整批只通知一次。 */
    public recordCodexHeroes(hero_ids: readonly number[]): boolean[] {
        const is_new = hero_ids.map(hero_id => {
            if (this.codex_hero_ids.has(hero_id)) {
                return false;
            }
            this.codex_hero_ids.add(hero_id);
            return true;
        });
        if (is_new.some(value => value)) {
            EventManager.Instance.dispatch(GameEvent.HERO_CODEX_UPDATE);
        }
        return is_new;
    }

    /** 只检查配置、阵营与星级是否匹配，实例占用由调用方排除。 */
    public matchStarCost(hero: HeroCardData, slot: HeroStarCostSlot): boolean {
        if (hero.star !== slot.starId) {
            return false;
        }
        if (slot.kind === 'self') {
            return hero.id === slot.matchId;
        }
        if (slot.kind === 'faction') {
            const cfg = ConfigMgr.instance.HeroData.get(hero.id);
            const unit = cfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(cfg.unit_id) : undefined;
            return unit?.faction_id === slot.matchId;
        }
        return true;
    }

    /** 材料按实例 uuid 去重，并用当前拥有的实例检查，避免使用过期快照。 */
    public checkStarUpCost(source: HeroCardData | undefined, slots: readonly HeroStarCostSlot[]): string {
        const used = new Set<string>();
        let missing = false;
        for (const slot of slots) {
            const selected = slot.selected;
            if (!selected) {
                missing = true;
                continue;
            }
            const current = selected.uuid ? this.getHeroByUuid(selected.uuid) : undefined;
            if (!current || current.uuid === source?.uuid || used.has(current.uuid) || !this.matchStarCost(current, slot)) {
                return lang(HeroLang.starCostWrong);
            }
            used.add(current.uuid);
        }
        return missing ? lang(HeroLang.starCostShort) : '';
    }

    /** 保持同一 uuid 的对象引用，已打开的卡片和养成页继续读取同一实例。 */
    private updateHeroInstance(hero: HeroInstanceData): HeroInstanceData {
        const data: HeroInstanceData = {
            uuid: hero.uuid,
            id: hero.id,
            name: hero.name,
            level: hero.level,
            star: hero.star,
            score: hero.score,
            attrs: hero.attrs ? { ...hero.attrs } : undefined,
        };
        const current = this.hero_by_uuid.get(hero.uuid);
        if (current) {
            Object.assign(current, data);
            return current;
        }
        return data;
    }

    private ensureHeroData(): void {
        if (this.heroes_ready) {
            return;
        }
        this.heroes_ready = true;
        for (const hero of createLocalHeroes()) {
            this.hero_by_uuid.set(hero.uuid, hero);
        }
    }
}
