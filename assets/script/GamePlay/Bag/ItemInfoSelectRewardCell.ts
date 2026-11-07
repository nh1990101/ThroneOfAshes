import { _decorator } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { NumberInputBarComp } from '../../Component/NumberInputBarComp';
import { comp } from '../../Common/Decorator';
const { ccclass } = _decorator;

/** 自选奖励的一格。数量上限由窗口按其他格已选数量算好 */
export interface ItemInfoSelectReward {
    item_id: number;
    count: number;
    /** 是否能使用 */
    can_use: boolean;
    getSelected: () => number;
    getMaxCount: () => number;
    onCountChanged: (itemId: number, count: number) => void;
}

@ccclass('ItemInfoSelectRewardCell')
export class ItemInfoSelectRewardCell extends BaseRenderCell<ItemInfoSelectReward> {
    @comp(ItemIconComp)
    item_icon: ItemIconComp = null!;

    @comp(NumberInputBarComp)
    number_input_bar: NumberInputBarComp = null!;

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        this.item_icon.setItem({ item_id: data.item_id, count: data.count });
        this.number_input_bar.setInput({
            min: 0,
            max: data.getMaxCount(),
            init_value: data.getSelected(),
            on_value_changed: (cur) => data.onCountChanged(data.item_id, cur),
        });
        this.number_input_bar.subBtn.interactable = data.can_use;
        this.number_input_bar.addBtn.interactable = data.can_use;
        this.number_input_bar.editBox.enabled = data.can_use;
    }

    public getItemId(): number | undefined {
        return this.getData()?.item_id;
    }

    /** 其他格数量变了之后，只收这一格的上限 */
    public applyMax(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        this.number_input_bar.setMax(data.getMaxCount());
    }
}
