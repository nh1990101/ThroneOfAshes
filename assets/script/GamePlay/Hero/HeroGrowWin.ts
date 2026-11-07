import { _decorator, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import type { HeroCardData, HeroGrowPageParam } from './HeroTypes';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { comp } from '../../Common/Decorator';
import { SelectCmp, SelectMode } from '../../Component/SelectCmp';
import { PageController } from '../../Component/PageController';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { StarListComp } from '../../Component/StarListComp';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { GameUrl } from '../../Common/GameUrl';
import { HeroLevelUpPage } from './HeroLevelUpPage';
import { HeroQualityUpPage } from './HeroQualityUpPage';
import { UIMananger } from '../../Component/UIMananger';
import { EquipChangeWin } from '../Equip/EquipChangeWin';
import { HeroEquipSlotComp } from '../Equip/HeroEquipSlotComp';
import { EQUIPMENT_CHANGED } from '../Equip/EquipTypes';
import { showEquipmentTip } from '../Equip/EquipView';
import { HeroLang, HeroMgr } from './HeroMgr';
import { lang } from '../../Common/LangMgr';
import { GameEvent } from '../../Common/GameEnum';
const { ccclass } = _decorator;

/** 英雄养成窗口*/
@ccclass('HeroGrowWin')
export class HeroGrowWin extends BaseWin {

    @comp(BaseBtn)
    btn_tab_quality_up: BaseBtn = null!;

    @comp(BaseBtn)
    btn_tab_level_up: BaseBtn = null!;

    @comp(PageController)
    pageCtrl: PageController = null!;

    @comp(BaseBtn)
    return_btn: BaseBtn = null!;

    @comp(BaseSprite)
    icon_faction: BaseSprite = null!;

    @comp(BaseSprite)
    faction_bg: BaseSprite = null!;

    @comp(BaseLabel)
    text_name: BaseLabel = null!;

    @comp(BaseLabel)
    text_nickname: BaseLabel = null!;

    @comp(BaseSprite)
    icon_rare: BaseSprite = null!;

    @comp(StarListComp)
    star_list: StarListComp = null!;

    @comp(BaseBtn)
    btn_left: BaseBtn = null!;

    @comp(BaseBtn)
    btn_right: BaseBtn = null!;

    private tabSelect: SelectCmp<number>;
    /** 登记页签时第一次自动选中，先别加载页面，等 selectLevelTab 带上英雄 */
    private suppressPage = false;
    /** showWin 早于 initEvent 时，先记下，等页签建好再切回升级页 */
    private pendingLevelTab = false;
    /** 打开时外面列表的顺序，左右切换按这份走 */
    private heroes: HeroCardData[] = [];
    private heroIndex = -1;
    private equipment_slots: HeroEquipSlotComp[] = [];

    public get Is_FullScene() {
        return true;
    }

    public init(): void {
        super.init();
        this.pageCtrl.RegisterPages([
            { url: GameUrl.HeroPrefab.format('HeroLevelUpPage'), pageClass: HeroLevelUpPage, indexPage: 1 },
            { url: GameUrl.HeroPrefab.format('HeroQualityUpPage'), pageClass: HeroQualityUpPage, indexPage: 2 },
        ]);
        for (let pos_id = 1; pos_id <= 6; pos_id++) {
            this.equipment_slots.push(this.node.getChildByPath(`Content/middle/equip_content/${pos_id}`).getComponent(HeroEquipSlotComp));
        }
    }

    public initEvent(): void {
        this.initTabSelect();
        this.selectLevelTab();
        super.initEvent();
        this.addNodeEvent(this.return_btn.node, Node.EventType.TOUCH_END, this.closeWin);
        this.addNodeEvent(this.btn_left.node, Node.EventType.TOUCH_END, this.onClickLeft);
        this.addNodeEvent(this.btn_right.node, Node.EventType.TOUCH_END, this.onClickRight);
        this.addEvent(EQUIPMENT_CHANGED, this.OnRefreshUI, this);
        this.addEvent(GameEvent.HERO_DATA_UPDATE, this.OnRefreshUI, this);
        for (let pos_id = 1; pos_id <= 6; pos_id++) {
            this.addNodeEvent(this.equipment_slots[pos_id - 1].node, Node.EventType.TOUCH_END, () => this.openHeroEquipment(pos_id));
        }
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (!this.hero) {
            return;
        }
        this.heroes = this.heroes.filter(hero => !hero.uuid || HeroMgr.getInstance().getHeroByUuid(hero.uuid) != null);
        this.heroIndex = this.hero.uuid
            ? this.heroes.findIndex(hero => hero.uuid === this.hero.uuid)
            : this.heroes.indexOf(this.hero);
        this.refreshHeroBase();
        this.refreshSwitchBtn();
        this.refreshEquipmentSlots();
        this.refreshCurrentPage();
    }

    showWin(hero: HeroCardData, heroes: HeroCardData[] = []): void {
        this.heroes = heroes.slice();
        this.heroIndex = hero.uuid ? this.heroes.findIndex(item => item.uuid === hero.uuid) : this.heroes.indexOf(hero);
        const equipment_win = UIMananger.instance.getWinByName('EquipChangeWin') as EquipChangeWin;
        if (equipment_win) equipment_win.resetEquipmentFilters();
        this.pendingLevelTab = true;
        this.selectLevelTab();
        super.showWin(hero);
    }

    /** 每次打开切回升级页。页签还没建好就等 initEvent。已经停在升级页时也要把英雄再传进去 */
    private selectLevelTab(): void {
        if (!this.pendingLevelTab || !this.tabSelect) {
            return;
        }
        this.pendingLevelTab = false;
        const key = this.btn_tab_level_up.node;
        if (this.tabSelect.isSelect(key)) {
            this.openPage(1);
            return;
        }
        this.tabSelect.setSelect(key, true);
    }

    public get hero(): HeroCardData {
        return this.getData<HeroCardData>();
    }

    private onClickLeft() {
        if (this.heroIndex <= 0) {
            return;
        }
        this.switchHero(this.heroIndex - 1);
    }

    private onClickRight() {
        if (this.heroIndex < 0 || this.heroIndex >= this.heroes.length - 1) {
            return;
        }
        this.switchHero(this.heroIndex + 1);
    }

    /** 只换当前英雄，页签保持不动 */
    private switchHero(index: number) {
        const hero = this.heroes[index];
        if (!hero) {
            return;
        }
        this.heroIndex = index;
        this.setData(hero);
        this.refreshHeroBase();
        this.refreshSwitchBtn();
        this.refreshEquipmentSlots();
        this.refreshCurrentPage();
    }

    private refreshEquipmentSlots(): void {
        this.equipment_slots.forEach((slot, index) => slot.setData({ hero_uuid: this.hero.uuid, pos_id: index + 1 }));
    }

    private openHeroEquipment(pos_id: number): void {
        if (pos_id > 4) {
            showEquipmentTip(pos_id === 5 ? lang(HeroLang.exclusiveClosed) : lang(HeroLang.artifactClosed));
            return;
        }
        if (!this.hero.uuid) {
            showEquipmentTip(lang(HeroLang.noWearInstance));
            return;
        }
        UIMananger.instance.showWin(EquipChangeWin, { hero_uuid: this.hero.uuid, pos_id });
    }

    /** 已经在最左或最右时，把对应按钮藏掉 */
    private refreshSwitchBtn() {
        this.btn_left.node.active = this.heroIndex > 0;
        this.btn_right.node.active = this.heroIndex >= 0 && this.heroIndex < this.heroes.length - 1;
    }

    /** 名字、昵称读单位表；阵营图标、详情背景、稀有度图标再转到图标表 */
    private refreshHeroBase() {
        const hero = this.hero;
        const heroCfg = hero ? ConfigMgr.instance.HeroData.get(hero.id) : undefined;
        const unit = heroCfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(heroCfg.unit_id) : undefined;
        this.text_name.setText(unit?.name ?? '');
        this.text_nickname.setText(unit?.nickname ?? '');

        const faction = unit?.faction_id != null
            ? ConfigMgr.instance.FactionData.get(unit.faction_id)
            : undefined;
        this.showIcon(this.icon_faction, faction?.big_icon);
        this.showIcon(this.faction_bg, faction?.hero_detail_bg);

        const rarityId = unit?.rarity_id;
        const rareIcon = rarityId != null ? ConfigMgr.instance.UnitRareData.get(rarityId)?.icon : undefined;
        this.showIcon(this.icon_rare, rareIcon);
        this.star_list.setStar(hero?.star);
    }

    /** 没有图标 id 时藏掉。有 id 交给 BaseSprite 区分图集和单图 */
    private showIcon(sprite: BaseSprite, icon_id: number | undefined) {
        sprite.node.active = icon_id != null;
        if (icon_id != null) {
            sprite.setIconData(icon_id);
        }
    }

    private initTabSelect() {
        const tabs: { btn: BaseBtn, index: number }[] = [
            { btn: this.btn_tab_level_up, index: 1 },
            { btn: this.btn_tab_quality_up, index: 2 },
        ];
        this.tabSelect = new SelectCmp<number>(SelectMode.Single, (key, isSelect, index) => {
            this.setTabSelected(key as Node, isSelect);
            if (isSelect && index != null && !this.suppressPage) {
                this.openPage(index);
            }
        });
        this.suppressPage = true;
        for (const tab of tabs) {
            this.tabSelect.addKey(tab.btn.node, tab.index);
            this.addNodeEvent(tab.btn.node, Node.EventType.TOUCH_END, () => {
                this.tabSelect.setSelect(tab.btn.node, true);
            });
        }
        this.suppressPage = false;
    }

    private setTabSelected(tabNode: Node, isSelect: boolean) {
        tabNode.getChildByName('select').active = isSelect;
        tabNode.getChildByName('unselect').active = !isSelect;
    }

    private openPage(index: number) {
        const param = this.pageParam();
        const page_args = param ? [param] : [];
        this.pageCtrl.switchPage(index, ...page_args).then(() => {
            if (param && this.pageCtrl.curIndex === index && this.pageCtrl.curPage) {
                this.pageCtrl.curPage.showPage(param);
            }
        });
    }

    /** 页签不动，把当前英雄再交给已经打开的页面 */
    private refreshCurrentPage() {
        const param = this.pageParam();
        if (!param || !this.pageCtrl.curPage) {
            return;
        }
        this.pageCtrl.curPage.showPage(param);
    }

    private pageParam(): HeroGrowPageParam | null {
        const hero = this.hero;
        if (!hero) {
            return null;
        }
        return { hero, heroes: this.heroes };
    }
}
