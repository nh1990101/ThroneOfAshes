import { _decorator } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { comp } from '../../Common/Decorator';
const { ccclass } = _decorator;

/** 固定奖励或随机奖励的一格。有概率才显示概率 */
export interface ItemInfoRewardData {
    item_id: number;
    count: number;
    /** 0 到 1。没有就不显示概率 */
    odds?: number;
}

@ccclass('ItemInfoRewardCell')
export class ItemInfoRewardCell extends BaseRenderCell<ItemInfoRewardData> {
    @comp(ItemIconComp)
    item_icon: ItemIconComp = null!;

    @comp(BaseLabel)
    probability: BaseLabel = null!;

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        this.item_icon.setItem({ item_id: data.item_id, count: data.count });
        const showOdds = data.odds != null;
        this.probability.node.active = showOdds;
        if (!showOdds) {
            return;
        }
        const percent = (data.odds * 100).toFixed(2);
        this.probability.setText(`${percent}%`);
    }
}
