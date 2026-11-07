import { _decorator, Component, Node } from 'cc';
import { BaseRenderCell } from './BaseRenderCell';
import { BaseLabel } from './BaseComp/BaseLabel';
import { BaseSprite } from './BaseComp/BaseSprite';
import { comp } from '../Common/Decorator';
const { ccclass, property } = _decorator;

@ccclass('MenuCell')
export class MenuCell extends BaseRenderCell<string> {

    @comp(BaseLabel)
    lb_content: BaseLabel = null!;

    @comp(BaseSprite)
    is_select: BaseSprite = null!;

    public OnRefreshUI(): void {
        super.OnRefreshUI();
        var content = this.getData();
        this.lb_content.string = content;
        this.is_select.node.active = this.isSelected();
    }
    protected onSelectionChanged(): void {
        super.onSelectionChanged();
        if (this.is_select) {
            this.is_select.node.active = this.isSelected();
        }
    }
}


