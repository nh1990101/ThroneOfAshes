import { _decorator, Component, Node } from 'cc';
import { BaseComp } from './BaseComp';
import { Tools } from '../Common/Tools';
const { ccclass, property } = _decorator;

@ccclass('BasePage')
export class BasePage extends BaseComp {
    //外部透传参数
    protected _winData: any = null;
    public showPage(...param) {
        this.node.active = true;
        Tools.setNodeTopLayer(this.node);
        if (param.length > 0) {
            this._winData = param.length === 1 ? param[0] : param;
        }
        this.OnCheckRefreshUI();
    }
    public closePage() {
        this.node.active = false;
        this._winData = null;
    }
}


