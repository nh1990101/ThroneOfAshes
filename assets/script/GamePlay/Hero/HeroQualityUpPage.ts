import { _decorator, Layout, Node } from 'cc';
import { BasePage } from '../../Component/BasePage';
import { child, comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { refreshNodeList } from '../../Component/NodeList';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { Tools } from '../../Common/Tools';
import { HeroIcon, HeroIconData } from '../PVE/component/HeroIcon';
import { StarListComp } from '../../Component/StarListComp';
import { UIMananger } from '../../Component/UIMananger';
import { HeroSelectStarUpWin } from './HeroSelectStarUpWin';
import { HeroLang, HeroMgr } from './HeroMgr';
import { lang } from '../../Common/LangMgr';
import type { HeroAttrId, HeroCardData, HeroGrowPageParam, HeroStarCostKind } from './HeroTypes';
import { AttrTipsUI } from '../AttrTipsUI';
const { ccclass } = _decorator;

type StarCostKind = HeroStarCostKind;

interface StarCostSlot {
    kind: StarCostKind;
    starId: number;
    /** 同名槽是英雄 id，同阵营槽是阵营 id */
    matchId?: number;
    name: string;
    selected?: HeroCardData;
}

interface HeroAttrItem {
    text: string;
    value: string;
    icon_id: number;
}

/** 任意材料预览的阵营图标，图标表 id */
const ANY_COST_FACTION_ICON = 55;

/** 等级格子图标，图标表 id */
const LEVEL_ATTR_ICON = 155;

/** 等级后面的四项，按这个顺序从 attrs 取 */
const ATTR_LIST: { id: HeroAttrId; name: number }[] = [
    { id: 'base_atk', name: HeroLang.atk },
    { id: 'base_def', name: HeroLang.def },
    { id: 'base_intelligence', name: HeroLang.intelligence },
    { id: 'base_command', name: HeroLang.command },
];

@ccclass('HeroQualityUpPage')
export class HeroQualityUpPage extends BasePage {

    @comp(Layout)
    quality_content_attr_list: Layout = null!;

    @comp(BaseSprite)
    quality_up_score: BaseSprite = null!;

    @comp(BaseBtn)
    btn_quality_up: BaseBtn = null!;

    @child()
    cur_quality: Node = null!;

    @child()
    next_quality: Node = null!;

    @child()
    cost_item_list: Node = null!;

    /** 当前英雄的升星材料槽。换英雄后清空已选 */
    private starCostSlots: StarCostSlot[] = [];
    private starCostHero?: HeroCardData;
    private starCostNodeIndex = new WeakMap<Node, number>();
    private starCostClickBound = new WeakSet<Node>();
    private attr_node_text = new WeakMap<Node, string>();
    private attr_click_bound = new WeakSet<Node>();

    public initEvent(): void {
        this.addNodeEvent(this.btn_quality_up.node, Node.EventType.TOUCH_END, this.onClickQualityUp);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        this.refreshAttrs(hero);
        this.refreshScore(hero);
        this.refreshQuality(hero);
        this.refreshStarCost(hero);
    }

    private get hero(): HeroCardData | null {
        return this.param?.hero ?? null;
    }

    private get heroes(): HeroCardData[] {
        return this.param?.heroes ?? [];
    }

    private get param(): HeroGrowPageParam | null {
        const data = this._winData as HeroGrowPageParam;
        if (!data?.hero) {
            return null;
        }
        return data;
    }

    /** 升星协议还没有。材料不对就飘字，对上了先不发 */
    private onClickQualityUp() {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const tip = HeroMgr.getInstance().checkStarUpCost(hero, this.starCostSlots);
        if (tip) {
            UIMananger.instance.showFlyNotice(tip);
        }
    }

    private refreshScore(hero: HeroCardData) {
        const text = Tools.getNumberShow(hero.score ?? 0);
        this.quality_up_score.node.getChildByName('value').getComponent(BaseLabel).setText(text);
    }

    /** 第一项是等级，当前/上限，图标写死。后面四项从属性表读大图标 */
    private refreshAttrs(hero: HeroCardData) {
        const attrs = HeroMgr.getInstance().getHeroDisplayAttrs(hero);
        const items: HeroAttrItem[] = [
            { text: lang(HeroLang.level), value: `${hero.level ?? 0}/${this.getLevelLim(hero.star)}`, icon_id: LEVEL_ATTR_ICON },
            ...ATTR_LIST.map(item => ({
                text: lang(item.name),
                value: `${attrs?.[item.id] ?? 0}`,
                icon_id: ConfigMgr.instance.AttributeData.get(item.id).icon_big,
            })),
        ];
        refreshNodeList(this.quality_content_attr_list.node, 'attr_item', items, (node, item) => {
            this.bindAttrItem(node, item);
        });
    }

    /** 格子刷图标和数值。点一下在格子旁边弹出说明 */
    private bindAttrItem(node: Node, item: HeroAttrItem) {
        node.getChildByName('icon').getComponent(BaseSprite).setIconData(item.icon_id);
        node.getChildByName('value').getComponent(BaseLabel).setText(item.value);
        this.attr_node_text.set(node, item.text);
        if (this.attr_click_bound.has(node)) {
            return;
        }
        this.attr_click_bound.add(node);
        this.addNodeEvent(node, Node.EventType.TOUCH_END, () => {
            const text = this.attr_node_text.get(node);
            if (!text) {
                return;
            }
            UIMananger.instance.showWin(AttrTipsUI, {
                desc: text,
                go: node,
                show_mask: false,
            });
        });
    }

    /** 升品页左边是当前星级，右边读这一行的 show_next_stage */
    private refreshQuality(hero: HeroCardData) {
        const star = hero.star;
        const row = star != null ? ConfigMgr.instance.UnitStarData.get(star) : undefined;
        this.bindQuality(this.cur_quality, star);
        this.bindQuality(this.next_quality, row?.show_next_stage);
    }

    /**
     * 当前星级行的消耗。升到下一星用这一行。
     * 同名、同阵营、任意对应星级表三列，星级必须相同。
     * 换英雄时清空已选，同一只英雄刷新时保留。
     */
    private refreshStarCost(hero: HeroCardData) {
        const built = this.buildStarCostSlots(hero);
        if (this.starCostHero?.uuid ? this.starCostHero.uuid === hero.uuid : this.starCostHero === hero) {
            for (let i = 0; i < built.length; i++) {
                const old = this.starCostSlots[i];
                const selected = old?.selected?.uuid ? HeroMgr.getInstance().getHeroByUuid(old.selected.uuid) : undefined;
                if (selected && old.kind === built[i].kind && old.starId === built[i].starId
                    && HeroMgr.getInstance().matchStarCost(selected, built[i])) {
                    built[i].selected = selected;
                }
            }
        }
        this.starCostHero = hero;
        this.starCostSlots = built;
        this.bindStarCostSlots();
    }

    private buildStarCostSlots(hero: HeroCardData): StarCostSlot[] {
        const star = hero.star;
        const row = star != null ? ConfigMgr.instance.UnitStarData.get(star) : undefined;
        const heroCfg = ConfigMgr.instance.HeroData.get(hero.id);
        const unit = heroCfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(heroCfg.unit_id) : undefined;
        const faction = unit?.faction_id != null
            ? ConfigMgr.instance.FactionData.get(unit.faction_id)
            : undefined;
        const slots: StarCostSlot[] = [];
        for (const starId of row?.base_self_star ?? []) {
            slots.push({
                kind: 'self',
                starId,
                matchId: hero.id,
                name: unit?.name != null ? lang(unit.name) : '',
            });
        }
        for (const starId of row?.base_type_star ?? []) {
            slots.push({
                kind: 'faction',
                starId,
                matchId: unit?.faction_id,
                name: faction?.name != null ? lang(faction.name) : '',
            });
        }
        for (const starId of row?.base_all_star ?? []) {
            slots.push({
                kind: 'any',
                starId,
                name: lang(HeroLang.any),
            });
        }
        return slots;
    }

    private bindStarCostSlots() {
        refreshNodeList(this.cost_item_list, 'cost_item', this.starCostSlots, (node, item, index) => {
            node.getChildByName('item_icon').active = false;
            const slot = node.getChildByName('hero_slot');
            const preview = slot.getChildByName('preview');
            const heroNode = slot.getChildByName('hero_icon');
            const picked = item.selected;
            let heroData: HeroIconData | undefined;
            if (picked) {
                const unitId = ConfigMgr.instance.HeroData.get(picked.id)?.unit_id;
                if (unitId == null || picked.level == null) {
                    throw new Error(`英雄图标缺少 unitId 或 lv：${picked.id}`);
                }
                heroData = { unitId, lv: picked.level, star: picked.star, heroId: picked.id };
            }
            preview.active = heroData == null;
            heroNode.active = heroData != null;
            if (heroData) {
                const icon = heroNode.getComponent(HeroIcon) || heroNode.addComponent(HeroIcon);
                icon.setData(heroData);
            } else {
                const starNode = preview.getChildByName('star_list');
                const starList = starNode.getComponent(StarListComp) || starNode.addComponent(StarListComp);
                starList.setStar(item.starId);
                const faction_node = preview.getChildByName('facicon');
                let icon_id: number | undefined;
                if (item.kind === 'faction' && item.matchId != null) {
                    icon_id = ConfigMgr.instance.FactionData.get(item.matchId)?.icon;
                } else if (item.kind === 'any') {
                    icon_id = ANY_COST_FACTION_ICON;
                }
                if (icon_id == null) {
                    faction_node.active = false;
                } else {
                    faction_node.active = true;
                    faction_node.getComponent(BaseSprite).setIconData(icon_id);
                }
            }
            node.getChildByName('cost_item_name').getComponent(BaseLabel).setText(item.name);
            this.starCostNodeIndex.set(slot, index);
            if (this.starCostClickBound.has(slot)) {
                return;
            }
            this.starCostClickBound.add(slot);
            slot.on(Node.EventType.TOUCH_END, () => {
                const slotIndex = this.starCostNodeIndex.get(slot);
                if (slotIndex == null) {
                    return;
                }
                this.onClickStarCost(slotIndex);
            });
        });
    }

    /** 本体和别的槽已经选走的不进列表。当前槽已选的仍留着 */
    private onClickStarCost(index: number) {
        const slot = this.starCostSlots[index];
        if (!slot) {
            return;
        }
        const heroes = this.collectStarCostHeroes(slot, index);
        UIMananger.instance.showWin(HeroSelectStarUpWin, heroes, slot.selected, (hero: HeroCardData) => {
            const current_slot = this.starCostSlots[index];
            if (!current_slot) {
                return;
            }
            const current = this.collectStarCostHeroes(current_slot, index).find(item => item.uuid === hero.uuid);
            if (!current) {
                UIMananger.instance.showFlyNotice(lang(HeroLang.starCostWrong));
                return;
            }
            current_slot.selected = current;
            this.bindStarCostSlots();
        });
    }

    private collectStarCostHeroes(slot: StarCostSlot, index: number): HeroCardData[] {
        const used = new Set<string>();
        for (let i = 0; i < this.starCostSlots.length; i++) {
            if (i === index) {
                continue;
            }
            const selected = this.starCostSlots[i].selected;
            if (selected) {
                used.add(selected.uuid);
            }
        }
        const source = this.hero ?? undefined;
        const list = this.heroes.filter(hero => this.canUseStarCost(hero, slot, source, used));
        list.sort((a, b) => this.compareStarCostHero(a, b));
        return list;
    }

    private canUseStarCost(
        hero: HeroCardData,
        slot: StarCostSlot,
        source: HeroCardData | undefined,
        used: Set<string>,
    ): boolean {
        const current = hero.uuid ? HeroMgr.getInstance().getHeroByUuid(hero.uuid) : undefined;
        if (!current || current.uuid === source?.uuid || used.has(current.uuid)) {
            return false;
        }
        return HeroMgr.getInstance().matchStarCost(current, slot);
    }

    /** 稀有度从低到高，再按阵营，再按英雄 id */
    private compareStarCostHero(a: HeroCardData, b: HeroCardData): number {
        const rare = this.heroRarity(a) - this.heroRarity(b);
        if (rare !== 0) {
            return rare;
        }
        const faction = this.heroFactionId(a) - this.heroFactionId(b);
        if (faction !== 0) {
            return faction;
        }
        return a.id - b.id;
    }

    private heroRarity(hero: HeroCardData): number {
        const cfg = ConfigMgr.instance.HeroData.get(hero.id);
        const unit = cfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(cfg.unit_id) : undefined;
        return unit?.rarity_id ?? 0;
    }

    private heroFactionId(hero: HeroCardData): number {
        const cfg = ConfigMgr.instance.HeroData.get(hero.id);
        const unit = cfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(cfg.unit_id) : undefined;
        return unit?.faction_id ?? 0;
    }

    /** 文本是这一档的星数。星星列表和顶部星级同一套图标 */
    private bindQuality(root: Node, starId: number | undefined) {
        const count = root.getChildByName('star_list').getComponent(StarListComp).setStar(starId);
        root.getChildByName('qualiy').getComponent(BaseLabel).setText(count > 0 ? lang(HeroLang.starCount, { count }) : '');
    }

    private getLevelLim(starId: number | undefined): number {
        if (starId == null) {
            return 0;
        }
        return ConfigMgr.instance.UnitStarData.get(starId)?.level_lim ?? 0;
    }
}
