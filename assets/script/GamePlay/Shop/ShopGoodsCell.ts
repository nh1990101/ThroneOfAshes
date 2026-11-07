import { _decorator, Node } from 'cc';
import { child, comp } from '../../Common/Decorator';
import { lang } from '../../Common/LangMgr';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseSprite } from '../../Component/BaseComp/BaseSprite';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { UIMananger } from '../../Component/UIMananger';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { FlyNoticeMgr } from '../BaseSystem/FlyNoticeMgr';
import { ShopBuyWin } from './ShopBuyWin';
import { ShopLang, ShopMgr, ShopSlotView } from './ShopMgr';
const { ccclass } = _decorator;

/** 集市的一格商品 */
@ccclass('ShopGoodsCell')
export class ShopGoodsCell extends BaseRenderCell<ShopSlotView> {
    @comp(ItemIconComp)
    private item_icon: ItemIconComp = null!;

    @comp(BaseLabel, 'GoodsName')
    private goods_name: BaseLabel = null!;

    @comp(BaseLabel, 'GoodsLimitText')
    private goods_limit: BaseLabel = null!;

    @comp(BaseLabel, 'Unlock')
    private unlock: BaseLabel = null!;

    @child({ name: 'SoldOut' })
    private sold_out: Node = null!;

    @child({ name: 'Button' })
    private price_btn: Node = null!;

    @comp(BaseSprite, 'CurrencyIcon')
    private currency_icon: BaseSprite = null!;

    @comp(BaseLabel, 'CurrencyNumber')
    private currency_number: BaseLabel = null!;

    public initEvent(): void {
        this.addNodeEvent(this.price_btn, Node.EventType.TOUCH_END, this.onClickBuy);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        const view = this.getData();
        if (!view) {
            return;
        }
        const goods = view.goods_id && !view.locked
            ? ConfigMgr.instance.MarketGoodsData.get(view.goods_id)
            : undefined;
        const show_goods = !!goods;
        this.item_icon.node.active = show_goods;
        this.goods_name.node.active = show_goods;
        this.price_btn.active = show_goods;
        this.unlock.node.active = view.locked;
        if (view.locked) {
            this.unlock.setText(ShopLang.unlock, { level: view.unlock_level });
        }
        if (!goods) {
            this.goods_limit.node.active = false;
            this.sold_out.active = false;
            return;
        }
        const sell = goods.sell_item;
        if (sell && sell.length > 0) {
            this.item_icon.setItem({ item_id: sell[0], count: sell[1] ?? 1 });
            const item = ConfigMgr.instance.ItemData.get(sell[0]);
            if (item?.name != null) {
                this.goods_name.setText(lang(item.name));
            } else {
                this.goods_name.setText('');
            }
        } else {
            this.item_icon.node.active = false;
            this.goods_name.setText('');
        }
        const show_limit = goods.limit_times != null;
        this.goods_limit.node.active = show_limit;
        if (show_limit) {
            this.goods_limit.setText(ShopLang.limit, { buy: view.buy_count, limit: goods.limit_times });
        }
        const sold = goods.limit_times != null && view.buy_count >= goods.limit_times;
        this.sold_out.active = sold;
        const price = ShopMgr.getInstance().getPrice(view.market_id, goods.id);
        const free = price <= 0;
        const cost_item = goods.cost_item;
        this.currency_icon.node.active = !free && cost_item != null;
        if (!free && cost_item != null) {
            const cost = ConfigMgr.instance.ItemData.get(cost_item);
            if (cost?.icon != null) {
                this.currency_icon.setIconData(cost.icon);
            }
        }
        this.currency_number.setText(free ? ShopLang.free : String(price));
    }

    private onClickBuy(): void {
        const view = this.getData();
        if (!view || view.locked || !view.goods_id) {
            return;
        }
        const goods = ConfigMgr.instance.MarketGoodsData.get(view.goods_id);
        if (!goods) {
            return;
        }
        if (goods.limit_times != null && view.buy_count >= goods.limit_times) {
            return;
        }
        const left = goods.limit_times == null ? 1 : goods.limit_times - view.buy_count;
        if (left > 1) {
            UIMananger.instance.showWin(ShopBuyWin, {
                market_id: view.market_id,
                slot_id: view.slot_id,
            });
            return;
        }
        const tip = ShopMgr.getInstance().tryBuy(view.market_id, view.slot_id, 1);
        if (tip) {
            void FlyNoticeMgr.getInstance().showTexts(tip);
        }
    }
}
