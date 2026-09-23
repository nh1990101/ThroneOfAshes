import { _decorator, Component, Node } from 'cc';
import { BaseWin } from '../../Component/BaseWin';
import { BaseLabel } from '../../Component/BaseComp/BaseLabel';
import { BaseBtn } from '../../Component/BaseComp/BaseBtn';
const { ccclass, property } = _decorator;

@ccclass('MainCity')
export class MainCity extends BaseWin {

    @property(BaseLabel)
    lb_: BaseLabel = null!;

    @property(BaseBtn)
    BaseBtn: BaseBtn = null!;
    public initEvent(): void {
        super.initEvent();
    }

}


