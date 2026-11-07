import { _decorator, Color } from 'cc';
import { comp } from '../../Common/Decorator';
import { Tools } from '../../Common/Tools';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { ItemIconComp } from '../../Component/ItemIconComp';
import { HallCostView } from './HallMgr';
const { ccclass } = _decorator;

/** 升级消耗的一格：物品图标、需求数量、拥有/需求。 */
@ccclass('HallCostCell')
export class HallCostCell extends BaseRenderCell<HallCostView> {
    @comp(ItemIconComp, 'cost_item')
    cost_item: ItemIconComp = null!;

    @comp(BaseLabel, 'status')
    status: BaseLabel = null!;

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        this.cost_item.setItem(
            { item_id: data.item_id, count: data.need },
            { can_not_click: true, count_text: `${data.need}` },
        );
        const [text, color] = Tools.setCostFormat(data.owned, data.need);
        this.status.setText(text);
        this.status.color = new Color().fromHEX(color);
    }
}
