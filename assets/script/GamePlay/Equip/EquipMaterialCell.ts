import { Node, _decorator } from 'cc';
import { comp } from '../../Common/Decorator';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { EquipItemCell } from './EquipItemCell';
const { ccclass } = _decorator;

@ccclass('EquipMaterialCell')
export class EquipMaterialCell extends EquipItemCell {
    @comp(BaseBtn, 'btn_material_minus')
    private btn_material_minus: BaseBtn = null!;

    public initEvent(): void {
        this.addNodeEvent(this.btn_material_minus.node, Node.EventType.TOUCH_END, this.onClickMaterialMinus);
        super.initEvent();
    }

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        if (!this.isInit) return;
        const data = this.getData();
        this.btn_material_minus.node.active = !!data && !!data.item && !data.item.equip && data.selected_count > 0;
    }

    private onClickMaterialMinus(): void {
        const data = this.getData();
        if (data && data.minus_func) data.minus_func();
    }
}
