import { _decorator, Component, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { UIMananger } from '../../Component/UIMananger';
const { ccclass, property } = _decorator;

@ccclass('MainCity')
export class MainCity extends BaseWin {

    @property(BaseBtn)
    btn_battle: BaseBtn = null!;



    public initEvent(): void {
        super.initEvent();

        this.addNodeEvent(this.btn_battle.node, Node.EventType.TOUCH_END, this.OnClickBattle);
    }
    OnClickBattle() {
        UIMananger.instance.showWin("BattleWin");
    }
    OnRefreshUI(): void {
        super.OnRefreshUI();
    }
}


