import { _decorator, Node } from 'cc';
import { child } from '../Common/Decorator';
import { BaseComp } from './BaseComp';
import { ItemBarComp } from './ItemBarComp';
import { refreshNodeList } from './NodeList';
const { ccclass } = _decorator;

/** 物品表：金币、钻石 */
const DEFAULT_ITEM_IDS = [1002, 1001];

/** 挂在 top_item_bar 上。不传列表时显示金币和钻石 */
@ccclass('TopItemBarComp')
export class TopItemBarComp extends BaseComp {

    @child()
    item_bar_list: Node = null!;

    @child()
    btn_item_summary: Node = null!;

    private item_ids: number[] = DEFAULT_ITEM_IDS.slice();

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_item_summary, Node.EventType.TOUCH_END, this.onSummary);
    }

    /** 不传就回到金币、钻石 */
    public setItems(item_ids?: readonly number[]): void {
        this.item_ids = item_ids ? item_ids.slice() : DEFAULT_ITEM_IDS.slice();
        this.OnCheckRefreshUI();
    }

    public OnRefreshUI(): void {
        this.btn_item_summary.active = this.item_ids.length > 2;
        refreshNodeList(this.item_bar_list, 'item_bar', this.item_ids, (node, item_id) => {
            const bar = node.getComponent(ItemBarComp) || node.addComponent(ItemBarComp);
            bar.setItem(item_id);
        });
    }

    /** 物品总览。通用逻辑以后写在这里 */
    private onSummary(): void {
    }
}
