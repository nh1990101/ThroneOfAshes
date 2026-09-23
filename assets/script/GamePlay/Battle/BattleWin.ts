import { _decorator, Component, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
const { ccclass, property } = _decorator;

@ccclass('BattleWin')
export class BattleWin extends BaseWin {
    showWin(...param: any[]): void {
        super.showWin();
    }
}


