import { _decorator, Layout, Node } from 'cc';
import { BasePage } from '../../Component/BasePage';
import { ScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/ScrollList';
import { comp } from '../../Common/Decorator';
import { HeroListCell, HeroListRow } from './HeroListCell';
import type { HeroCardData } from './HeroTypes';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { bindTabList } from '../../Component/SelectList';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { HeroFactionCell, HeroFactionData } from './HeroFactionCell';
import { lang } from '../../Common/LangMgr';
import { HeroMgr } from './HeroMgr';
import { GameEvent } from '../../Common/GameEnum';
const { ccclass } = _decorator;

/** 阵营页签的全选。FactionData 的 id 从 1 开始 */
const FACTION_ALL = 0;

@ccclass('HeroListPage')
export class HeroListPage extends BasePage {

    @comp(ScrollList)
    HeroCardScroll: ScrollList = null!;

    @comp(BaseBtn)
    ShowSortTabBtn: BaseBtn = null!;

    @comp(BaseBtn)
    HideSortTabBtn: BaseBtn = null!;

    @comp(BaseBtn)
    btn_sort_score: BaseBtn = null!;

    @comp(BaseBtn)
    btn_sort_quality: BaseBtn = null!;

    @comp(BaseBtn)
    btn_sort_level: BaseBtn = null!;

    @comp(BaseSprite)
    SortTabList: BaseSprite = null!;

    @comp(BaseLabel)
    label_hero_count: BaseLabel = null!;

    @comp(Layout)
    faction_tab_list: Layout = null!;

    private heroes: HeroCardData[] = [];
    private hero_sort: ((hero: HeroCardData) => number) | null = null;
    /** 0 是全选，其它是 FactionData.id */
    private selectedFactionId = FACTION_ALL;
    /** 阵营和列表只建一次。刷新不把阵营打回全选 */
    private viewReady = false;

    public initEvent(): void {
        this.addEvent(GameEvent.HERO_DATA_UPDATE, this.OnRefreshUI, this);
        this.addNodeEvent(this.ShowSortTabBtn.node, Node.EventType.TOUCH_END, this.onShowSortTabBtnClick);
        this.addNodeEvent(this.HideSortTabBtn.node, Node.EventType.TOUCH_END, this.onHideSortTabBtnClick);
        this.addNodeEvent(this.btn_sort_score.node, Node.EventType.TOUCH_END, this.onSortScoreBtnClick);
        this.addNodeEvent(this.btn_sort_quality.node, Node.EventType.TOUCH_END, this.onSortStarBtnClick);
        this.addNodeEvent(this.btn_sort_level.node, Node.EventType.TOUCH_END, this.onSortLevelBtnClick);
        this.selectedFactionId = FACTION_ALL;
        this.initHeroCards();
        this.initFactionTabs();
        this.hideSortTab();
        this.applySortSelect(this.btn_sort_level);
        this.viewReady = true;
        super.initEvent();
    }

    public OnRefreshUI(): void {
        if (!this.viewReady) {
            return;
        }
        this.applyHeroList(false);
    }

    protected onEnable(): void {
        super.onEnable();
        this.OnCheckRefreshUI();
    }

    /** 全选在最前，后面按阵营表 id 排序。模板节点由 Layout 横向排开 */
    private initFactionTabs() {
        bindTabList(this.faction_tab_list.node, 'hero_faction_tab', this.getFactionTabs(), HeroFactionCell, tab => {
            this.selectedFactionId = tab.id;
            this.applyHeroList(false);
        });
    }

    private getFactionTabs(): HeroFactionData[] {
        const tabs: HeroFactionData[] = [{ id: FACTION_ALL, name: '全选' }];
        const factions = Array.from(ConfigMgr.instance.FactionData.values()).sort((a, b) => a.id - b.id);
        for (const faction of factions) {
            tabs.push({ id: faction.id, name: faction.name != null ? lang(faction.name) : '' });
        }
        return tabs;
    }

    private initHeroCards() {
        const scroll = this.HeroCardScroll;
        scroll.horizontal = false;
        scroll.vertical = true;
        scroll.autoSelectIndex = -1;
        this.applyHeroList(true);
    }


    private applyHeroList(rebuild: boolean) {
        this.heroes = HeroMgr.getInstance().getHeroes();
        if (this.hero_sort) {
            this.heroes.sort((a, b) => this.hero_sort(b) - this.hero_sort(a));
        }
        const heroes = this.getVisibleHeroes();
        const rows: HeroListRow[] = [];
        for (let i = 0; i < heroes.length; i += 3) {
            rows.push({ cards: heroes.slice(i, i + 3), heroes });
        }
        if (rebuild) {
            this.HeroCardScroll.setDataList(HeroListCell, rows, SCROLL_VERTICAL, [0, 0, 12]);
        } else {
            this.HeroCardScroll.updateList(rows);
        }
        this.label_hero_count.setText(lang(5, { count: heroes.length }));
    }

    /** 全选显示全部。其它页签按单位表 faction_id 过滤 */
    private getVisibleHeroes(): HeroCardData[] {
        if (this.selectedFactionId === FACTION_ALL) {
            return this.heroes;
        }
        const factionId = this.selectedFactionId;
        return this.heroes.filter(hero => {
            const cfg = ConfigMgr.instance.HeroData.get(hero.id);
            const unit = cfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(cfg.unit_id) : undefined;
            return unit?.faction_id === factionId;
        });
    }

    private sortHeroes(pick: (hero: HeroCardData) => number) {
        this.hero_sort = pick;
        this.applyHeroList(false);
    }

    private onShowSortTabBtnClick() {
        this.SortTabList.node.active = true;
        this.HideSortTabBtn.node.active = true;
    }

    private onHideSortTabBtnClick() {
        this.hideSortTab();
    }

    private onSortScoreBtnClick() {
        this.sortHeroes(hero => hero.score ?? 0);
        this.applySortSelect(this.btn_sort_score);
        this.hideSortTab();
    }

    private onSortStarBtnClick() {
        this.sortHeroes(hero => hero.star ?? 0);
        this.applySortSelect(this.btn_sort_quality);
        this.hideSortTab();
    }

    private onSortLevelBtnClick() {
        this.sortHeroes(hero => hero.level ?? 0);
        this.applySortSelect(this.btn_sort_level);
        this.hideSortTab();
    }

    /** 当前排序亮自己的 is_select，按钮文案跟这条排序的 Label 走 */
    private applySortSelect(selected: BaseBtn) {
        const tabs = [this.btn_sort_level, this.btn_sort_quality, this.btn_sort_score];
        for (const tab of tabs) {
            tab.node.getChildByName('is_select').active = tab === selected;
        }
        const text = selected.node.getChildByName('Label').getComponent(BaseLabel).string;
        this.ShowSortTabBtn.node.getChildByName('Label').getComponent(BaseLabel).setText(text);
    }

    private hideSortTab() {
        this.SortTabList.node.active = false;
        this.HideSortTabBtn.node.active = false;
    }
}
