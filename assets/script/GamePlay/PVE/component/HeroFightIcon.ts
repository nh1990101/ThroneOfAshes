import { _decorator, Component, Node, NodeEventType } from 'cc';
import { HeroIcon } from './HeroIcon';
import { child } from '../../../Common/Decorator';
import { UIMananger } from '../../../Component/UIMananger';
import { HeroFightSelectWin } from '../HeroFightSelectWin';
const { ccclass, property } = _decorator;

@ccclass('HeroFightIcon')
export class HeroFightIcon extends HeroIcon {
    @child()
    grid: Node = null!;
    @child()
    touchArea: Node = null!;


    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.touchArea, NodeEventType.TOUCH_END, this.onClickAdd, this)
    }
    public OnRefreshUI(): void {

        this.grid.active = this.getData() == null;
        if (!this.grid.active) {
            this.star_list.node.active = true;
            this.base_icon.active = true;
            super.OnRefreshUI();
        } else {
            this.star_list.node.active = false;
            this.base_icon.active = false;
        }
    }
    onClickAdd() {
        UIMananger.instance.showWin(HeroFightSelectWin)
    }
}


