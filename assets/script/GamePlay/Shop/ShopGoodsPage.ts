import { _decorator, Node } from 'cc';
import { comp } from '../../Common/Decorator';
import { EventManager } from '../../Common/EventManager';
import { GameEvent } from '../../Common/GameEnum';
import { lang } from '../../Common/LangMgr';
import { BasePage } from '../../Component/BasePage';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { GridScrollList, SCROLL_VERTICAL } from '../../Component/BaseComp/GridScrollList';
import { CostItem } from '../../Component/CostItem';
import { UIMananger } from '../../Component/UIMananger';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { IMarketTypeData } from '../../Config/Typings/MarketTypeData';
import { FlyNoticeMgr } from '../BaseSystem/FlyNoticeMgr';
import { ShopGoodsCell } from './ShopGoodsCell';
import { ShopLang, ShopMgr } from './ShopMgr';
import type { ShopWin } from './ShopWin';
const { ccclass } = _decorator;

/** 集市里的公共货物页。切页签只换商店，不换页面 */
@ccclass('ShopGoodsPage')
export class ShopGoodsPage extends BasePage {
    @comp(BaseLabel, 'name')
    private shop_name: BaseLabel = null!;

    @comp(BaseLabel)
    private discount: BaseLabel = null!;

    @comp(BaseLabel)
    private refresh_time: BaseLabel = null!;

    @comp(GridScrollList)
    private goods_list: GridScrollList = null!;

    @comp(BaseBtn)
    private refresh_btn: BaseBtn = null!;

    @comp(CostItem)
    private refresh_cost: CostItem = null!;

    private market_id: string | null = null;
    private list_ready = false;

    public initEvent(): void {
        this.addNodeEvent(this.refresh_btn.node, Node.EventType.TOUCH_END, this.onClickRefresh);
        this.schedule(this.tickTime, 1);
        super.initEvent();
    }

    public showPage(market_id?: string): void {
        if (typeof market_id === 'string') {
            this.market_id = market_id;
        } else if (this.market_id == null) {
            this.market_id = this.marketFromWin();
        }
        super.showPage(market_id);
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (this.market_id == null) {
            this.market_id = this.marketFromWin();
        }
        const market_id = this.market_id;
        if (market_id == null) {
            return;
        }
        const market = ConfigMgr.instance.MarketTypeData.get(market_id);
        if (!market) {
            return;
        }
        if (market.name != null) {
            this.shop_name.setText(market.name);
        } else {
            this.shop_name.setText('');
        }
        this.paintDiscount(market_id);
        this.paintTime(market_id);
        this.paintRefresh(market, market_id);
        this.paintGoods(market_id);
    }

    private marketFromWin(): string | null {
        const win = UIMananger.instance.getWinByName('ShopWin') as ShopWin;
        if (!win) {
            return null;
        }
        return win.getSelectedMarket();
    }

    private paintDiscount(market_id: string): void {
        const text = ShopMgr.getInstance().discountText(market_id);
        this.discount.node.active = text.length > 0;
        if (text) {
            this.discount.setText(text);
        }
    }

    private paintTime(market_id: string): void {
        const info = ShopMgr.getInstance().getRefreshInfo(market_id);
        this.refresh_time.node.active = info.show_time;
        if (info.show_time) {
            this.refresh_time.setText(ShopLang.refreshIn, { time: this.formatLeft(info.left_ms) });
        }
    }

    private paintRefresh(market: IMarketTypeData, market_id: string): void {
        const has_manual = (market.refresh_cost?.length ?? 0) > 0;
        this.refresh_btn.node.active = has_manual;
        if (!has_manual) {
            this.refresh_cost.node.active = false;
            return;
        }
        const info = ShopMgr.getInstance().getRefreshInfo(market_id);
        this.refresh_btn.interactable = info.can_refresh;
        const show_cost = info.can_refresh && info.cost_count > 0 && info.cost_item > 0;
        this.refresh_cost.node.active = show_cost;
        if (show_cost) {
            this.refresh_cost.setData({ item_id: info.cost_item, count: info.cost_count });
        }
    }

    private paintGoods(market_id: string): void {
        const slots = ShopMgr.getInstance().getSlots(market_id);
        if (!this.list_ready) {
            this.list_ready = true;
            this.goods_list.setDataList(ShopGoodsCell, slots, SCROLL_VERTICAL);
            return;
        }
        this.goods_list.updateList(slots);
    }

    private tickTime(): void {
        const market_id = this.market_id;
        if (market_id == null) {
            return;
        }
        if (ShopMgr.getInstance().touch(market_id)) {
            EventManager.Instance.dispatch(GameEvent.Update_Shop);
            return;
        }
        this.paintTime(market_id);
    }

    private onClickRefresh(): void {
        const market_id = this.market_id;
        if (market_id == null) {
            return;
        }
        const tip = ShopMgr.getInstance().tryRefresh(market_id);
        if (tip) {
            void FlyNoticeMgr.getInstance().showTexts(tip);
        }
    }

    private formatLeft(ms: number): string {
        const total = Math.max(0, Math.ceil(ms / 1000));
        const day = Math.floor(total / 86400);
        const hour = Math.floor((total % 86400) / 3600);
        const minute = Math.floor((total % 3600) / 60);
        const second = total % 60;
        const clock = `${this.pad(hour)}:${this.pad(minute)}:${this.pad(second)}`;
        if (day > 0) {
            return lang(ShopLang.dayTime, { day, time: clock });
        }
        return clock;
    }

    private pad(value: number): string {
        return value < 10 ? `0${value}` : String(value);
    }
}
