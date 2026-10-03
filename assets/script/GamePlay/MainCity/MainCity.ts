import { _decorator, Component, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
import { UIMananger } from '../../Component/UIMananger';
import { comp } from '../../Common/Decorator';
import { BattleWin } from '../Battle/BattleWin';
import { WildMapWin } from '../WildMap/WildMapWin';
const { ccclass, property } = _decorator;

@ccclass('MainCity')
export class MainCity extends BaseWin {


    @comp(BaseBtn)
    btn_wild: BaseBtn = null!;

    @comp(BaseBtn)
    btn_battle: BaseBtn = null!;


    public initEvent(): void {
        super.initEvent();

        this.addNodeEvent(this.btn_battle.node, Node.EventType.TOUCH_END, this.OnClickBattle);
        this.addNodeEvent(this.btn_wild.node, Node.EventType.TOUCH_END, this.OnClickWild);
    }
    OnClickBattle() {
        UIMananger.instance.showWin(BattleWin);
    }
    OnClickWild() {
        UIMananger.instance.showWin(WildMapWin, 1);
    }
    OnRefreshUI(): void {
        super.OnRefreshUI();
    }
}


