import { _decorator, Component, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
const { ccclass, property } = _decorator;

@ccclass('BattleWin')
export class BattleWin extends BaseWin {

    @property(BaseBtn)
    btn_close: BaseBtn = null!;


    showWin(...param: any[]): void {
        super.showWin();
    }
}


