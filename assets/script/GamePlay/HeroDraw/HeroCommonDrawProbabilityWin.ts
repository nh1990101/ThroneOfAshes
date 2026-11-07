import { _decorator, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { SelectCmp, SelectMode } from '../../Component/SelectCmp';
import { bindTabList } from '../../Component/SelectList';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { HeroFactionCell, HeroFactionData } from '../Hero/HeroFactionCell';
import { HeroIcon, HeroIconData } from '../PVE/component/HeroIcon';
import { DrawLang } from './HeroDrawMgr';
const { ccclass } = _decorator;

/** 阵营页签的全选。FactionData 的 id 从 1 开始 */
const FACTION_ALL = 0;

/** 抽卡概率。预览列出英雄，概率页用预制体上的提示文字 */
@ccclass('HeroCommonDrawProbabilityWin')
export class HeroCommonDrawProbabilityWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @child()
    private content: Node = null!;

    @child()
    private preview_content: Node = null!;

    /** 预制体节点名是 probabiliy_content */
    @child()
    private probabiliy_content: Node = null!;

    @comp(GridScrollList, 'hero_scroll')
    private hero_scroll: GridScrollList = null!;

    @child()
    private faction_tab_list: Node = null!;

    private faction_id = FACTION_ALL;
    private content_select: SelectCmp<Node> = null!;
    private tabs_ready = false;
    private list_ready = false;

    public showWin(): void {
        if (this.content_select) {
            this.content_select.setSelect(this.previewTab(), true);
        }
        super.showWin();
    }

    public init(): void {
        super.init();
        this.hero_scroll.content = this.hero_scroll.node.getChildByPath('view/content');
    }

    public initEvent(): void {
        // 卡池表没有玩法说明 id，btn_tips 先不打开说明
        this.bindContentTabs();
        this.buildFactionTabs();
        super.initEvent();
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (!this.tabs_ready) {
            return;
        }
        this.refreshHeroList();
    }

    /** panel 下另有一个隐藏的 tab_list，页签从 content 上取 */
    private bindContentTabs(): void {
        const tab_list = this.content.getChildByName('tab_list');
        const preview_tab = tab_list.getChildByName('preview_tab');
        const probability_tab = tab_list.getChildByName('probabiliy_tab');
        this.content_select = new SelectCmp<Node>(SelectMode.Single, (_key, is_select, node) => {
            if (!node) {
                return;
            }
            node.getChildByName('select').active = is_select;
            node.getChildByName('unselect').active = !is_select;
            if (!is_select) {
                return;
            }
            const show_preview = node === preview_tab;
            this.preview_content.active = show_preview;
            this.probabiliy_content.active = !show_preview;
        });
        this.addNodeEvent(preview_tab, Node.EventType.TOUCH_END, () => {
            this.content_select.setSelect(preview_tab, true);
        });
        this.addNodeEvent(probability_tab, Node.EventType.TOUCH_END, () => {
            this.content_select.setSelect(probability_tab, true);
        });
        this.content_select.addKey(preview_tab, preview_tab);
        this.content_select.addKey(probability_tab, probability_tab);
    }

    private previewTab(): Node {
        return this.content.getChildByName('tab_list').getChildByName('preview_tab');
    }

    private buildFactionTabs(): void {
        bindTabList(this.faction_tab_list, 'hero_faction_tab', this.factionTabs(), HeroFactionCell, tab => {
            this.faction_id = tab.id;
            this.refreshHeroList();
        });
        this.tabs_ready = true;
    }

    private factionTabs(): HeroFactionData[] {
        const tabs: HeroFactionData[] = [{ id: FACTION_ALL, name: lang(DrawLang.all) }];
        const factions = Array.from(ConfigMgr.instance.FactionData.values()).sort((a, b) => a.id - b.id);
        for (const faction of factions) {
            tabs.push({ id: faction.id, name: faction.name != null ? lang(faction.name) : '' });
        }
        return tabs;
    }

    /** 卡池奖励还没接，先用英雄表里的全部英雄 */
    private refreshHeroList(): void {
        const icons: HeroIconData[] = [];
        const heroes = Array.from(ConfigMgr.instance.HeroData.values()).sort((a, b) => a.id - b.id);
        for (const hero of heroes) {
            if (this.faction_id !== FACTION_ALL && this.heroFaction(hero.id) !== this.faction_id) {
                continue;
            }
            icons.push(this.iconData(hero.id));
        }
        if (!this.list_ready) {
            this.list_ready = true;
            this.hero_scroll.setDataList(HeroIcon, icons, SCROLL_VERTICAL, [15, 15, 20]);
        } else {
            this.hero_scroll.updateList(icons);
        }
    }

    private heroFaction(hero_id: number): number {
        const unit_id = ConfigMgr.instance.HeroData.get(hero_id)?.unit_id;
        if (unit_id == null) {
            return FACTION_ALL;
        }
        return ConfigMgr.instance.UnitData.get(unit_id)?.faction_id ?? FACTION_ALL;
    }

    private iconData(hero_id: number): HeroIconData {
        const unit_id = ConfigMgr.instance.HeroData.get(hero_id)?.unit_id ?? 0;
        const unit = ConfigMgr.instance.UnitData.get(unit_id);
        const star = unit?.rarity_id != null
            ? ConfigMgr.instance.UnitRareData.get(unit.rarity_id)?.default_star
            : undefined;
        return { heroId: hero_id, uId: 0, unitId: unit_id, lv: 0, star };
    }
}
