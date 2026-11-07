import { _decorator, Node } from 'cc';
import { comp } from '../../Common/Decorator';
import { GameEvent } from '../../Common/GameEnum';
import { lang } from '../../Common/LangMgr';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { CostItem } from '../../Component/CostItem';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { SliderInputComp } from '../../Component/SliderInputComp';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { IMarketGoodsData } from '../../Config/Typings/MarketGoodsData';
import { FlyNoticeMgr } from '../BaseSystem/FlyNoticeMgr';
import { BagMgr } from '../Bag/BagMgr';
import { ShopLang, ShopMgr } from './ShopMgr';
const { ccclass } = _decorator;

export interface ShopBuyParam {
    market_id: string;
    slot_id: string;
}

/** 限购剩余大于 1 时选购买数量 */
@ccclass('ShopBuyWin')
export class ShopBuyWin extends BaseWin {
    @comp(BaseBtn)
    btn_close: BaseBtn = null!;

    @comp(BaseBtn)
    private btn_confirm: BaseBtn = null!;

    @comp(ItemIconComp)
    private item_icon: ItemIconComp = null!;

    @comp(BaseLabel)
    private goods_name: BaseLabel = null!;

    @comp(BaseLabel)
    private have: BaseLabel = null!;

    @comp(SliderInputComp)
    private slider_input: SliderInputComp = null!;

    @comp(CostItem)
    private cost: CostItem = null!;

    private slider_ready = false;
    private shown_goods_id: string | null = null;

    public get parentWinName(): string | null {
        return 'ShopWin';
    }

    public initEvent(): void {
        this.addNodeEvent(this.btn_confirm.node, Node.EventType.TOUCH_END, this.onClickConfirm);
        this.addEvent(GameEvent.Update_Shop, this.OnRefreshUI, this);
        super.initEvent();
    }

    public showWin(param: ShopBuyParam): void {
        this.slider_ready = false;
        this.shown_goods_id = null;
        super.showWin(param);
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        const param = this.getData<ShopBuyParam>();
        if (!param) {
            return;
        }
        const goods = this.currentGoods(param);
        const left = ShopMgr.getInstance().remain(param.market_id, param.slot_id);
        if (!goods || left <= 0) {
            if (this.isInitComponent) {
                this.closeWin();
            }
            return;
        }
        this.paintGoods(goods);
        if (this.shown_goods_id !== goods.id) {
            this.shown_goods_id = goods.id;
            this.slider_ready = false;
        }
        if (!this.slider_ready) {
            this.slider_ready = true;
            this.slider_input.setSlider({
                min_value: 1,
                max_value: left,
                btn_step: 1,
                init_value: 1,
                value_step: { step: 1 },
                on_value_changed: () => this.paintCost(goods),
            });
        }
        this.paintCost(goods);
    }

    private currentGoods(param: ShopBuyParam): IMarketGoodsData | undefined {
        const view = ShopMgr.getInstance().getSlots(param.market_id)
            .find(slot => slot.slot_id === param.slot_id);
        if (!view?.goods_id) {
            return undefined;
        }
        return ConfigMgr.instance.MarketGoodsData.get(view.goods_id);
    }

    private paintGoods(goods: IMarketGoodsData): void {
        const sell = goods.sell_item;
        const item_id = sell?.[0];
        if (item_id == null) {
            return;
        }
        this.item_icon.setItem({ item_id, count: sell[1] ?? 1 });
        const item = ConfigMgr.instance.ItemData.get(item_id);
        if (item?.name != null) {
            this.goods_name.setText(lang(item.name));
        } else {
            this.goods_name.setText('');
        }
        this.have.setText(ShopLang.owned, { count: BagMgr.getInstance().getCount(item_id) });
    }

    private paintCost(goods: IMarketGoodsData): void {
        const param = this.getData<ShopBuyParam>();
        if (!param) {
            return;
        }
        const total = ShopMgr.getInstance().getPrice(param.market_id, goods.id) * this.buyCount();
        const cost_item = goods.cost_item;
        if (total > 0 && cost_item != null) {
            this.cost.node.active = true;
            this.cost.setData({ item_id: cost_item, count: total });
            return;
        }
        this.cost.node.active = false;
    }

    private buyCount(): number {
        const value = this.slider_input.getValue();
        return value > 0 ? value : 1;
    }

    private onClickConfirm(): void {
        const param = this.getData<ShopBuyParam>();
        if (!param) {
            return;
        }
        const tip = ShopMgr.getInstance().tryBuy(param.market_id, param.slot_id, this.buyCount());
        if (tip) {
            void FlyNoticeMgr.getInstance().showTexts(tip);
            return;
        }
        this.closeWin();
    }
}
