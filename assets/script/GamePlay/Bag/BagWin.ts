import { _decorator, Layout, Node, Prefab } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { comp } from '../../Common/Decorator';
import { bindTabList } from '../../Component/SelectList';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { UIMananger } from '../../Component/UIMananger';
import { Tools } from '../../Common/Tools';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { BagItem, BagMgr } from './BagMgr';
import { BagPageCell, BagPageTab } from './BagPageCell';
import { ItemInfoWin } from './ItemInfoWin';
import { lang } from '../../Common/LangMgr';
import { EquipItemCell } from '../Equip/EquipItemCell';
import { EquipInfoWin } from '../Equip/EquipInfoWin';
import { GameEvent } from '../../Common/GameEnum';
const { ccclass, property } = _decorator;

/** 背包。页签来自 BagPageData，列表是该页的物品 */
@ccclass('BagWin')
export class BagWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(Layout)
    page_tab_list: Layout = null!;

    @comp(GridScrollList)
    ItemScroll: GridScrollList = null!;

    @property(Prefab)
    equipment_cell_prefab: Prefab = null!;

    /** 页签只建一次。重开停在当前页，只刷物品 */
    private pagesReady = false;
    private listReady = false;
    private pageId = 0;
    private pageItems: BagItem[] = [];
    private equipment_list_mode = false;
    private regular_item_prefab: Prefab;

    public initEvent(): void {
        this.addEvent(GameEvent.BAG_ITEMS_UPDATE, this.OnRefreshUI, this);
        super.initEvent();
    }

    public get Is_FullScene() {
        return false;
    }

    public showWin(...param): void {
        this.ensurePages();
        super.showWin(...param);
    }

    public OnRefreshUI(): void {
        console.warn('OnRefreshUI');
        super.OnRefreshUI();
        if (!this.listReady) {
            return;
        }
        this.showPage(this.pageId);
    }

    public closeWin(): void {
        UIMananger.instance.getWinByName(Tools.getClsName(ItemInfoWin))?.closeWin();
        super.closeWin();
    }

    /** 背包页签只在 showWin 里建一次 */
    private ensurePages(): void {
        if (this.pagesReady) {
            return;
        }
        this.pagesReady = true;
        this.buildPages();
    }

    private buildPages(): void {
        bindTabList(this.page_tab_list.node, 'bag_page_tab', this.getPages(), BagPageCell, page => {
            this.showPage(page.id);
        });
    }

    private getPages(): BagPageTab[] {
        const pages = Array.from(ConfigMgr.instance.BagPageData.values())
            .sort((a, b) => (a.sort ?? a.id) - (b.sort ?? b.id));
        return pages.map(page => ({ id: page.id, name: page.name != null ? lang(page.name) : '' }));
    }

    private showPage(pageId: number): void {
        this.pageId = pageId;
        this.pageItems = BagMgr.getInstance().getPageItems(pageId);
        const equipment_mode = pageId === 2;
        if (!this.listReady || this.equipment_list_mode !== equipment_mode) {
            if (!this.regular_item_prefab) this.regular_item_prefab = this.ItemScroll.itemPrefab;
            this.equipment_list_mode = equipment_mode;
            this.ItemScroll.setItemPrefab(equipment_mode ? this.equipment_cell_prefab : this.regular_item_prefab);
            this.ItemScroll.autoSelectIndex = -1;
            this.ItemScroll.onItemRender = (node: Node, index: number) => {
                const item = this.pageItems[index];
                if (this.equipment_list_mode) {
                    node.getComponent(EquipItemCell).setData({ item, click_func: () =>
                        UIMananger.instance.showWin(EquipInfoWin, { item_guid: item.guid }) });
                    return;
                }
                const cell = node.getComponent(ItemIconComp);
                cell.setItem(item, {
                    click_func: () => UIMananger.instance.showWin(ItemInfoWin, item, true),
                });
                cell.setSelected(false);
            };
            this.ItemScroll.setDataList(equipment_mode ? EquipItemCell : ItemIconComp, this.pageItems, SCROLL_VERTICAL, [0, 0, 13]);
            this.listReady = true;
            return;
        }
        this.ItemScroll.updateList(this.pageItems);
    }
}
