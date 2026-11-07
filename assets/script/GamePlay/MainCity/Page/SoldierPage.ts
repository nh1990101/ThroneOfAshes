import { _decorator, Layout, Node } from 'cc';
import { BasePage } from '../../../Component/BasePage';
import { GridScrollList, SCROLL_VERTICAL } from '../../../Component/BaseComp/GridScrollList';
import { refreshNodeList } from '../../../Component/NodeList';
import { child, comp } from '../../../Common/Decorator';
import { BaseBtn } from '../../../Component/BaseComp/BaseBtn';
import { BaseSprite } from '../../../Component/BaseComp/BaseSprite';
import { BaseLabel } from '../../../Component/BaseComp/BaseLabel';
import { bindTabList } from '../../../Component/SelectList';
import { ConfigMgr } from '../../../Config/ConfigMgr';
import { HeroFactionCell, HeroFactionData } from '../../Hero/HeroFactionCell';
import { lang } from '../../../Common/LangMgr';
import { SoldierCardCell } from '../../Soldier/SoldierCardCell';
import { SoldierAttrs, SoldierCardData, SoldierMgr } from '../../Soldier/SoldierMgr';
import { ItemIconComp } from '../../../Component/ItemIconComp';
import { UIMananger } from '../../../Component/UIMananger';
import { BagCost } from '../../Bag/BagMgr';
const { ccclass } = _decorator;

/** 阵营页签的全选。FactionData 的 id 从 1 开始 */
const FACTION_ALL = 0;

/** 属性表 id。数值仍用士兵属性字段，名字和图标读属性表 */
const ATTR_ROWS: { id: string; key: keyof SoldierAttrs }[] = [
    { id: 'base_atk', key: 'atk' },
    { id: 'base_def', key: 'def' },
    { id: 'base_hp', key: 'hp' },
    { id: 'base_speed', key: 'speed' },
];

@ccclass('SoldierPage')
export class SoldierPage extends BasePage {

    @comp(GridScrollList)
    soldier_scroll_list: GridScrollList = null!;

    @comp(BaseBtn)
    btn_show_sort_tab: BaseBtn = null!;

    @comp(BaseBtn)
    btn_hide_sort_tab: BaseBtn = null!;

    @comp(BaseBtn)
    btn_sort_score: BaseBtn = null!;

    @comp(BaseBtn)
    btn_sort_level: BaseBtn = null!;

    @comp(BaseSprite)
    sort_tab_list: BaseSprite = null!;

    @comp(BaseLabel)
    label_soldier_count: BaseLabel = null!;

    @comp(Layout)
    faction_tab_list: Layout = null!;

    @child()
    left_content: Node = null!;

    @child()
    soldier_lvup_content: Node = null!;

    @comp(BaseLabel)
    cur_level: BaseLabel = null!;

    @comp(BaseLabel)
    next_level: BaseLabel = null!;

    @comp(Layout)
    attr_list: Layout = null!;

    @comp(Layout)
    lvup_cost_list: Layout = null!;

    @comp(BaseBtn)
    btn_lvup: BaseBtn = null!;

    @child()
    tab_lv_up: Node = null!;

    @child()
    tab_evolve: Node = null!;

    private selected_faction_id = FACTION_ALL;
    private selected_soldier_id = 0;
    private sort_by_score = false;
    private view_ready = false;
    private attr_nodes: Node[] = [];
    private cost_icons: ItemIconComp[] = [];

    public initEvent(): void {
        this.addNodeEvent(this.btn_show_sort_tab.node, Node.EventType.TOUCH_END, this.onShowSortTabBtnClick);
        this.addNodeEvent(this.btn_hide_sort_tab.node, Node.EventType.TOUCH_END, this.onHideSortTabBtnClick);
        this.addNodeEvent(this.btn_sort_score.node, Node.EventType.TOUCH_END, this.onSortScoreBtnClick);
        this.addNodeEvent(this.btn_sort_level.node, Node.EventType.TOUCH_END, this.onSortLevelBtnClick);
        this.addNodeEvent(this.btn_lvup.node, Node.EventType.TOUCH_END, this.onClickLevelUp);
        this.addNodeEvent(this.tab_lv_up, Node.EventType.TOUCH_END, this.selectLevelTab);
        this.addNodeEvent(this.tab_evolve, Node.EventType.TOUCH_END, this.onClickEvolve);
        super.initEvent();
    }

    public showPage(...param): void {
        this.ensureSoldierView();
        super.showPage(...param);
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (!this.view_ready) {
            return;
        }
        this.refreshSoldierList();
    }

    /** 页签、属性行、材料格和列表只在第一次打开时建立 */
    private ensureSoldierView(): void {
        if (this.view_ready) {
            return;
        }
        this.initFactionTabs();
        this.initLevelRows();
        this.soldier_scroll_list.autoSelectIndex = -1;
        this.soldier_scroll_list.setSelectFunc((soldier: SoldierCardData) => {
            this.selected_soldier_id = soldier.id;
            this.refreshLevel(soldier);
        });
        this.selectLevelTab();
        this.hideSortTab();
        this.view_ready = true;
        this.refreshSoldierList(true);
    }

    private initFactionTabs(): void {
        bindTabList(this.faction_tab_list.node, 'hero_faction_tab', this.getFactionTabs(), HeroFactionCell, tab => {
            this.selected_faction_id = tab.id;
            if (this.view_ready) {
                this.refreshSoldierList();
            }
        });
    }

    private getFactionTabs(): HeroFactionData[] {
        const tabs: HeroFactionData[] = [{ id: FACTION_ALL, name: lang(18) }];
        const factions = Array.from(ConfigMgr.instance.FactionData.values()).sort((a, b) => a.id - b.id);
        for (const faction of factions) {
            tabs.push({ id: faction.id, name: faction.name != null ? lang(faction.name) : '' });
        }
        return tabs;
    }

    private initLevelRows(): void {
        refreshNodeList(this.attr_list.node, 'attr_item', ATTR_ROWS, (node, row) => {
            const attr = ConfigMgr.instance.AttributeData.get(row.id);
            node.getChildByName('attr_icon').getComponent(BaseSprite).setIconData(attr.icon);
            node.getChildByName('attr_name').getComponent(BaseLabel).setText(attr.name);
            this.attr_nodes.push(node);
        });
        let max_cost_count = 0;
        for (const row of ConfigMgr.instance.SoldierLevelData.values()) {
            const cost_count = Math.min(row.upgrade_item?.length ?? 0, row.upgrade_count?.length ?? 0);
            max_cost_count = Math.max(max_cost_count, cost_count);
        }
        const slots = Array.from({ length: max_cost_count }, (_value, index) => index);
        refreshNodeList(this.lvup_cost_list.node, 'item_icon', slots, node => {
            this.cost_icons.push(node.addComponent(ItemIconComp));
        });
    }

    private refreshSoldierList(is_first = false): void {
        const soldiers = this.getVisibleSoldiers();
        if (is_first) {
            this.soldier_scroll_list.setDataList(SoldierCardCell, soldiers, SCROLL_VERTICAL);
        } else {
            this.soldier_scroll_list.updateList(soldiers);
        }
        this.label_soldier_count.setText(lang(19, { count: soldiers.length }));
        this.refreshSortState();
        this.left_content.active = soldiers.length > 0;
        if (soldiers.length === 0) {
            this.selected_soldier_id = 0;
            return;
        }
        const selected_index = soldiers.findIndex(soldier => soldier.id === this.selected_soldier_id);
        this.soldier_scroll_list.setSelectedIndex(selected_index < 0 ? 0 : selected_index, false);
    }

    /** 全选显示全部。其它页签按单位表 faction_id 过滤 */
    private getVisibleSoldiers(): SoldierCardData[] {
        const mgr = SoldierMgr.getInstance();
        const soldiers = mgr.getSoldiers().filter(soldier => {
            if (this.selected_faction_id === FACTION_ALL) {
                return true;
            }
            const cfg = ConfigMgr.instance.SoldierData.get(soldier.id);
            const unit = cfg?.unit_id != null ? ConfigMgr.instance.UnitData.get(cfg.unit_id) : undefined;
            return unit?.faction_id === this.selected_faction_id;
        });
        soldiers.sort((a, b) => {
            const difference = this.sort_by_score
                ? mgr.getAttrs(b.id, b.level).score - mgr.getAttrs(a.id, a.level).score
                : b.level - a.level;
            return difference || a.id - b.id;
        });
        return soldiers;
    }

    private refreshSortState(): void {
        this.btn_sort_score.node.getChildByName('is_select').active = this.sort_by_score;
        this.btn_sort_level.node.getChildByName('is_select').active = !this.sort_by_score;
        this.btn_show_sort_tab.node.getChildByName('Label').getComponent(BaseLabel).setText(
            this.sort_by_score ? lang['$Lang$战力排序'] : lang['$Lang$等级排序'],
        );
    }

    private refreshLevel(soldier: SoldierCardData): void {
        const mgr = SoldierMgr.getInstance();
        const costs = mgr.getUpgradeCost(soldier.level);
        const is_maxed = costs === null;
        this.cur_level.setText(lang(21, { level: soldier.level }));
        this.next_level.setText(is_maxed ? '' : lang(21, { level: soldier.level + 1 }));
        this.soldier_lvup_content.getChildByName('arrow').active = !is_maxed;
        this.btn_lvup.node.getChildByName('Label').getComponent(BaseLabel).setText(is_maxed ? lang(26) : lang(25));

        const current_attrs = mgr.getAttrs(soldier.id, soldier.level);
        const next_attrs = is_maxed ? null : mgr.getAttrs(soldier.id, soldier.level + 1);
        for (let index = 0; index < ATTR_ROWS.length; index++) {
            const node = this.attr_nodes[index];
            const key = ATTR_ROWS[index].key;
            node.getChildByName('cur_attr_value').getComponent(BaseLabel).setText(`${current_attrs[key]}`);
            const delta = next_attrs ? next_attrs[key] - current_attrs[key] : 0;
            node.getChildByName('add_attr_value').getComponent(BaseLabel).setText(
                is_maxed ? '' : `${delta >= 0 ? '+' : ''}${delta}`,
            );
        }
        this.refreshCost(costs ?? []);
    }

    private refreshCost(costs: BagCost[]): void {
        this.lvup_cost_list.node.active = costs.length > 0;
        this.soldier_lvup_content.getChildByName('cost_tips').active = costs.length > 0;
        for (let index = 0; index < this.cost_icons.length; index++) {
            const icon = this.cost_icons[index];
            const cost = costs[index];
            icon.node.active = cost != null;
            if (cost) {
                icon.setItem({ item_id: cost.item_id, count: cost.count }, {
                    count_text: `${cost.count}`,
                    can_not_click: true,
                });
            }
        }
    }

    private onClickLevelUp(): void {
        const soldier = this.soldier_scroll_list.selectedData as SoldierCardData;
        if (!soldier) {
            return;
        }
        const tip = SoldierMgr.getInstance().tryLevelUp(soldier);
        if (tip) {
            UIMananger.instance.showFlyNotice(tip);
            return;
        }
        this.refreshSoldierList();
    }

    private selectLevelTab(): void {
        this.tab_lv_up.getChildByName('select').active = true;
        this.tab_lv_up.getChildByName('unselect').active = false;
        this.tab_evolve.getChildByName('select').active = false;
        this.tab_evolve.getChildByName('unselect').active = true;
    }

    private onClickEvolve(): void {
        UIMananger.instance.showFlyNotice(lang['$Lang$敬请期待']);
    }

    private onShowSortTabBtnClick() {
        this.sort_tab_list.node.active = true;
        this.btn_hide_sort_tab.node.active = true;
    }

    private onHideSortTabBtnClick() {
        this.hideSortTab();
    }

    private onSortScoreBtnClick() {
        this.sort_by_score = true;
        this.refreshSoldierList();
        this.hideSortTab();
    }

    private onSortLevelBtnClick() {
        this.sort_by_score = false;
        this.refreshSoldierList();
        this.hideSortTab();
    }

    private hideSortTab() {
        this.sort_tab_list.node.active = false;
        this.btn_hide_sort_tab.node.active = false;
    }
}
