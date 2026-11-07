import { _decorator, EventTouch, Node } from 'cc';
import { child, comp } from '../Common/Decorator';
import { GameEvent } from '../Common/GameEnum';
import { Tools } from '../Common/Tools';
import { ConfigMgr } from '../Config/ConfigMgr';
import { BagMgr } from '../GamePlay/Bag/BagMgr';
import { ItemInfoWin } from '../GamePlay/Bag/ItemInfoWin';
import { BaseComp } from './BaseComp';
import { BaseLabel } from './BaseComp/BaseLabel';
import { BaseSprite } from './BaseComp/BaseSprite';
import { UIMananger } from './UIMananger';
const { ccclass } = _decorator;

/** 数量文案和前往。不传就显示自己背包里的数量，也不显示加号 */
export interface ItemBarExtra {
    bar_text?: string;
    /** 有值才显示加号。点加号和点整条都走这里 */
    navigate?: string;
    click_func?: () => void;
    can_not_click?: boolean;
}

/** 挂在 item_bar 上。数量跟着背包变 */
@ccclass('ItemBarComp')
export class ItemBarComp extends BaseComp {

    @comp(BaseSprite)
    img_icon: BaseSprite = null!;

    @comp(BaseLabel)
    lb_num: BaseLabel = null!;

    @child()
    btn_add: Node = null!;

    private item_id = 0;
    private extra?: ItemBarExtra;

    /** 前往还没有统一入口。接上之后由那边注册 */
    private static open_navigate: (navigate: string) => void = (navigate) => {
        throw new Error(`物品栏前往还没有接：${navigate}`);
    };

    public static setOpenNavigate(open_navigate: (navigate: string) => void): void {
        this.open_navigate = open_navigate;
    }

    public initEvent(): void {
        super.initEvent();
        this.addEvent(GameEvent.BAG_ITEMS_UPDATE, this.OnRefreshUI, this);
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onBarClick);
        this.addNodeEvent(this.btn_add, Node.EventType.TOUCH_END, this.onAddClick);
    }

    /** 显示自己的这种物品 */
    public setItem(item_id: number, extra?: ItemBarExtra): void {
        this.item_id = item_id;
        this.extra = extra;
        this.OnCheckRefreshUI();
    }

    public OnRefreshUI(): void {
        if (!this.item_id) {
            return;
        }
        const cfg = ConfigMgr.instance.ItemData.get(this.item_id);
        if (!cfg) {
            throw new Error(`物品表没有这个 id：${this.item_id}`);
        }
        if (cfg.icon == null) {
            throw new Error(`物品没有图标：${this.item_id}`);
        }
        this.img_icon.setIconData(cfg.icon);
        const bar_text = this.extra?.bar_text;
        this.lb_num.setText(bar_text != null ? bar_text : Tools.getNumberShow(BagMgr.getInstance().getCount(this.item_id)));
        this.btn_add.active = this.navigate() != null;
    }

    private onBarClick(event: EventTouch): void {
        const hit = event.target as Node;
        if (hit === this.btn_add) {
            return;
        }
        this.open();
    }

    private onAddClick(): void {
        this.open();
    }

    /** 自定义点击优先。有前往就跳转，否则打开物品信息 */
    private open(): void {
        if (!this.item_id || this.extra?.can_not_click) {
            return;
        }
        if (this.extra?.click_func) {
            this.extra.click_func();
            return;
        }
        const navigate = this.navigate();
        if (navigate) {
            ItemBarComp.open_navigate(navigate);
            return;
        }
        UIMananger.instance.showWin(ItemInfoWin, {
            item_id: this.item_id,
            count: BagMgr.getInstance().getCount(this.item_id),
        }, false);
    }

    private navigate(): string | undefined {
        const navigate = this.extra?.navigate;
        if (navigate) {
            return navigate;
        }
        return undefined;
    }
}
