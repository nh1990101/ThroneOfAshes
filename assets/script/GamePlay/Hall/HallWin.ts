import { _decorator, Node } from 'cc';
import { comp, child } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { refreshNodeList } from '../../Component/NodeList';
import { SelectCmp, SelectMode } from '../../Component/SelectCmp';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseWin } from '../../Component/BaseWin';
import { UIMananger } from '../../Component/UIMananger';
import { BagMgr } from '../Bag/BagMgr';
import { HallBuildingCell, HallBuildingCellData } from './HallBuildingCell';
import { HallBuildingWin } from './HallBuildingWin';
import { HALL_STATE_UPDATE, HallLang, HallMgr, HallTab, RESOURCE_ITEM_IDS } from './HallMgr';
import { Tools } from '../../Common/Tools';
import { GameEvent } from '../../Common/GameEnum';
const { ccclass } = _decorator;

@ccclass('HallWin')
export class HallWin extends BaseWin {
    @comp(BaseBtn, 'btn_back')
    private btn_back: BaseBtn = null!;

    @comp(BaseBtn, 'tab_garrison')
    private tab_garrison: BaseBtn = null!;

    @comp(BaseBtn, 'tab_upgrade')
    private tab_upgrade: BaseBtn = null!;

    @comp(BaseLabel, 'title')
    private title: BaseLabel = null!;

    @comp(BaseLabel, 'res_gold')
    private res_gold: BaseLabel = null!;

    @comp(BaseLabel, 'res_wood')
    private res_wood: BaseLabel = null!;

    @comp(BaseLabel, 'scene_title')
    private scene_title: BaseLabel = null!;

    @comp(BaseLabel, 'list_title')
    private list_title: BaseLabel = null!;

    @comp(BaseLabel, 'list_hint')
    private list_hint: BaseLabel = null!;

    @comp(BaseLabel, 'bottom_hint')
    private bottom_hint: BaseLabel = null!;

    @child()
    private list_container: Node = null!;

    private hall_mgr = HallMgr.getInstance();
    private building_ids: number[] = [];
    private tab: HallTab = 'garrison';
    private selected_building_id = 0;
    private view_ready = false;
    private tab_select: SelectCmp<Node> = null!;
    private loading = false;
    private row_cells: HallBuildingCell[] = [];

    public get Is_FullScene(): boolean {
        return true;
    }

    public showWin(...param): void {
        this.loading = true;
        this.tab = 'garrison';
        this.selected_building_id = 0;
        UIMananger.instance.closeWin(HallBuildingWin);
        super.showWin(...param);
        this.ensureBuildingList();
        if (this.view_ready) {
            this.tab_select.setSelect('garrison', true);
        }
        void this.reload();
    }

    public initEvent(): void {
        this.addEvent(GameEvent.BAG_ITEMS_UPDATE, this.OnRefreshUI, this);
        this.addEvent(GameEvent.Update_Tech_Tree, this.OnRefreshUI, this);
        this.addEvent(HALL_STATE_UPDATE, this.OnRefreshUI, this);
        super.initEvent();
        this.bindButtons();
        this.initTabs();
        this.setStaticText();
        this.view_ready = true;
        this.tab_select.setSelect('garrison', true);
        this.OnRefreshUI();
    }

    public OnRefreshUI(): void {
        if (!this.view_ready || this.loading) {
            return;
        }
        this.refresh();
    }

    private async reload(): Promise<void> {
        try {
            await this.hall_mgr.load();
        } catch (error) {
            UIMananger.instance.showFlyNotice(error instanceof Error ? error.message : lang(HallLang.garrisonFailed));
        } finally {
            this.loading = false;
            if (this.node.activeInHierarchy) {
                this.OnCheckRefreshUI();
            }
        }
    }

    private bindButtons(): void {
        this.addNodeEvent(this.btn_back.node, Node.EventType.TOUCH_END, this.closeWin);
    }

    private initTabs(): void {
        this.tab_select = new SelectCmp<Node>(SelectMode.Single, (key, is_select, node) => {
            node!.getChildByName('selected_bg').active = is_select;
            if (is_select) {
                this.setTab(key as HallTab);
            }
        });
        const tabs: { key: HallTab; btn: BaseBtn }[] = [
            { key: 'garrison', btn: this.tab_garrison },
            { key: 'upgrade', btn: this.tab_upgrade },
        ];
        this.tab_garrison.node.getChildByName('label').getComponent(BaseLabel).setText(HallLang.tabGarrison);
        this.tab_upgrade.node.getChildByName('label').getComponent(BaseLabel).setText(HallLang.tabUpgrade);
        for (const tab of tabs) {
            this.tab_select.addKey(tab.key, tab.btn.node);
            this.addNodeEvent(tab.btn.node, Node.EventType.TOUCH_END, () => this.tab_select.setSelect(tab.key, true));
        }
    }

    private setStaticText(): void {
        this.title.setText(HallLang.title);
        this.btn_back.node.getChildByName('label').getComponent(BaseLabel).setText(HallLang.back);
        this.list_title.setText(HallLang.listTitle);
        this.list_hint.setText(HallLang.listHint);
        this.bottom_hint.setText(HallLang.demoHint);
    }

    private refresh(): void {
        this.building_ids = this.hall_mgr.getBuildingIds(this.tab);
        if (this.selected_building_id !== 0 && !this.building_ids.includes(this.selected_building_id)) {
            this.selected_building_id = 0;
            UIMananger.instance.closeWin(HallBuildingWin);
        }
        this.refreshHeader();
        this.refreshBuildingList();
    }

    private refreshHeader(): void {
        const item_ids = [RESOURCE_ITEM_IDS[0], RESOURCE_ITEM_IDS[1]];
        const labels = [this.res_gold, this.res_wood];
        for (let i = 0; i < item_ids.length; i++) {
            labels[i].setText(`${this.hall_mgr.getItemName(item_ids[i])} ${Tools.getNumberShow(BagMgr.getInstance().getCount(item_ids[i]))}`);
        }
    }

    private refreshBuildingList(): void {
        for (let index = 0; index < this.row_cells.length; index++) {
            const cell = this.row_cells[index];
            cell.node.active = index < this.building_ids.length;
            if (!cell.node.active) {
                continue;
            }
            const id = this.building_ids[index];
            cell.setData({ id, tab: this.tab });
            cell.setSelected(id === this.selected_building_id);
        }
    }

    private ensureBuildingList(): void {
        if (this.row_cells.length > 0) {
            return;
        }
        const all_ids = new Set([...this.hall_mgr.getBuildingIds('garrison'), ...this.hall_mgr.getBuildingIds('upgrade')]);
        const cells: HallBuildingCellData[] = Array.from(all_ids, id => ({ id, tab: 'upgrade' }));
        refreshNodeList(this.list_container, 'row_template', cells, (node, data) => {
            const cell = node.getComponent(HallBuildingCell) || node.addComponent(HallBuildingCell);
            cell.setData(data);
            cell.click_func = () => this.openBuilding(cell.getData().id);
            this.row_cells.push(cell);
        });
        this.building_ids = this.hall_mgr.getBuildingIds(this.tab);
        this.refreshBuildingList();
    }

    private openBuilding(build_id: number): void {
        this.selected_building_id = build_id;
        this.refreshBuildingList();
        UIMananger.instance.showWin(HallBuildingWin, build_id, this.tab);
    }

    private setTab(tab: HallTab): void {
        const changed = this.tab !== tab;
        this.tab = tab;
        if (changed) {
            UIMananger.instance.closeWin(HallBuildingWin);
        }
        this.OnRefreshUI();
    }
}
