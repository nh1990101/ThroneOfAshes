import { _decorator, Component, Node, tween } from 'cc';
import { Tools } from '../Common/Tools';
import { EventManager } from '../Common/EventManager';
import { EventData } from '../Common/BaseMgr';
import { BaseComp } from './BaseComp';
const { ccclass, property } = _decorator;

@ccclass('BaseWin')
export class BaseWin extends BaseComp {

    @property(Node)
    winBg: Node = null;


    protected animTime = 0.2;
    //外部透传参数
    protected _winData: any = null;

    showWin(...param) {
        this.node.active = true;
        Tools.setNodeTopLayer(this.node)
        if (param.length > 0) {
            this._winData = param.length === 1 ? param[0] : param;
        }
        // this.node.setSiblingIndex(this.node.parent.children.length - 1);
        if (this.winBg) {
            this.winBg.setScale(0.1, 0.1, 1);
            tween(this.winBg).to(this.animTime, { x: 1, y: 1, z: 1 }).start();
        }

        //第二次打开窗口才会执行这里的逻辑
        if (this.isInitComponent) {
            this.CheckAndRegister();
            this.OnRefreshUI();
        }
    }
    /**
     * 打开面板后界面的逻辑处理
     */
    OnRefreshUI() {

    }
    closeWin() {
        this.node.active = false;
        this.unRegisterEvent();
    }
    public initEvent(): void {
        super.initEvent();

        var btnClose = this["btn_close"];
        if (btnClose) {
            this.addNodeEvent(btnClose.node, Node.EventType.TOUCH_END, this.closeWin);
        }
        this.OnRefreshUI();
    }

    // 设置数据（不显示）
    setData(data: any) {
        this._winData = data;
    }

    //获取数据
    getData<T>(): T {
        return this._winData as T;
    }
}


