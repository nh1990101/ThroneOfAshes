import { _decorator, Node } from 'cc';
import { BaseRenderCell } from '../../Component/BaseRenderCell';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
const { ccclass } = _decorator;

export interface BagPageTab {
    /** BagPageData.id */
    id: number;
    name: string;
}

@ccclass('BagPageCell')
export class BagPageCell extends BaseRenderCell<BagPageTab> {
    clickFunc: (() => void) | null = null;

    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.node, Node.EventType.TOUCH_END, this.onClick);
    }

    public OnRefreshUI(): void {
        const data = this.getData();
        if (!data) {
            return;
        }
        this.node.getChildByPath('select/label').getComponent(BaseLabel).setText(data.name);
        this.node.getChildByPath('unselect/label').getComponent(BaseLabel).setText(data.name);
    }

    protected onSelectionChanged(): void {
        const selected = this.isSelected();
        this.node.getChildByName('select').active = selected;
        this.node.getChildByName('unselect').active = !selected;
    }

    private onClick(): void {
        if (this.clickFunc) {
            this.clickFunc();
        }
    }
}
