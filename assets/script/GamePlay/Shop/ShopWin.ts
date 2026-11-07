import { _decorator, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { GameEvent } from '../../Common/GameEnum';
import { GameUrl } from '../../Common/GameUrl';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { CostItem } from '../../Component/CostItem';
import { PageController } from '../../Component/PageController';
import { refreshNodeList } from '../../Component/NodeList';
import { SelectCmp, SelectKey, SelectMode } from '../../Component/SelectCmp';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { IMarketTypeData } from '../../Config/Typings/MarketTypeData';
import { BagMgr } from '../Bag/BagMgr';
import { ShopGoodsPage } from './ShopGoodsPage';
import { ShopMgr } from './ShopMgr';
const { ccclass } = _decorator;

/** 集市。底栏切商店，中间始终是同一张货物页 */
@ccclass('ShopWin')
export class ShopWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(PageController)
    private pageCtrl: PageController = null!;

    @child()
    private bottom_tab_list: Node = null!;

    @child()
    private title_bar: Node = null!;

    private tab_select: SelectCmp<Node> = null!;
    private view_ready = false;
    private selected_market_id: string | null = null;

    public get Is_FullScene() {
        return true;
    }

    public init(): void {
        super.init();
        this.pageCtrl.RegisterPages([
            { url: GameUrl.ShopPrefab.format('ShopGoodsPage'), pageClass: ShopGoodsPage, indexPage: 1 },
        ]);
    }

    public initEvent(): void {
        this.buildTabs();
        this.addEvent(GameEvent.Update_Shop, this.OnRefreshUI, this);
        super.initEvent();
    }

    public getSelectedMarket(): string | null {
        return this.selected_market_id;
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (!this.view_ready || !this.selected_market_id) {
            return;
        }
        this.refreshCurrency();
        const page = this.pageCtrl.curPage as ShopGoodsPage;
        if (page) {
            page.showPage(this.selected_market_id);
        }
    }

    /** 页签只建一次。重开窗口保持当前商店 */
    private buildTabs(): void {
        const markets = Array.from(ConfigMgr.instance.MarketTypeData.values())
            .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id.localeCompare(b.id));
        this.tab_select = new SelectCmp<Node>(SelectMode.Single, (key, is_select, node) => {
            this.onTab(key, is_select, node);
        });
        refreshNodeList(this.bottom_tab_list, 'tab_btn', markets, (node, market) => {
            this.bindTab(node, market);
        });
        this.view_ready = true;
    }

    private bindTab(node: Node, market: IMarketTypeData): void {
        const select_label = node.getChildByPath('select/label').getComponent(BaseLabel);
        const unselect_label = node.getChildByPath('unselect/label').getComponent(BaseLabel);
        if (market.name != null) {
            select_label.setText(market.name);
            unselect_label.setText(market.name);
        } else {
            select_label.setText('');
            unselect_label.setText('');
        }
        this.addNodeEvent(node, Node.EventType.TOUCH_END, () => {
            this.tab_select.setSelect(market.id, true);
        });
        this.tab_select.addKey(market.id, node);
    }

    private onTab(key: SelectKey, is_select: boolean, node: Node | null): void {
        if (node) {
            node.getChildByName('select').active = is_select;
            node.getChildByName('unselect').active = !is_select;
        }
        if (!is_select || typeof key !== 'string') {
            return;
        }
        this.selected_market_id = key;
        this.refreshCurrency();
        const page = this.pageCtrl.curPage as ShopGoodsPage;
        if (page) {
            page.showPage(key);
        }
    }

    private refreshCurrency(): void {
        if (!this.selected_market_id) {
            return;
        }
        const item_ids = ShopMgr.getInstance().currencyIds(this.selected_market_id);
        refreshNodeList(this.title_bar, 'item_bar', item_ids, (node, item_id) => {
            const cost = node.getComponent(CostItem) || node.addComponent(CostItem);
            cost.setData({ item_id, count: BagMgr.getInstance().getCount(item_id) });
        });
    }
}
