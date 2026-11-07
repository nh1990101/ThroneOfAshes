import { _decorator, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
const { ccclass } = _decorator;

export interface HeroTabData {
    name: string;
    content: Node;
}

@ccclass('HeroTabCell')
export class HeroTabCell extends BaseRenderCell<HeroTabData> {
    public OnRefreshUI(): void {
        const data = this.getData();
        const label = this.node.getChildByName('label')?.getComponent(BaseLabel);
        if (label && data) {
            label.setText(data.name);
        }
    }

    protected onSelectionChanged(): void {
        const selected = this.isSelected();
        const select = this.node.getChildByName('select');
        const unselect = this.node.getChildByName('unselect');
        if (select) {
            select.active = selected;
        }
        if (unselect) {
            unselect.active = !selected;
        }
    }
}
