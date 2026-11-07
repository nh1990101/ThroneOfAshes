import { _decorator, Component, Node, tween } from 'cc';
import { Tools } from '../Common/Tools';
import { EventManager } from '../Common/EventManager';
import { EventData } from '../Common/BaseMgr';
import { BaseComp } from './BaseComp';
import { UIMananger } from './UIMananger';
import { child } from '../Common/Decorator';
const { ccclass, property } = _decorator;

@ccclass('BaseWin')
export class BaseWin extends BaseComp {

    @property(Node)
    winBg: Node = null;

    @child({ name: 'btn_mask' })
    mask_button: Node = null;

    /** 蒙版另有点击逻辑时设为 false，基类不再绑关闭 */
    protected close_on_mask = true;

    protected animTime = 0.2;
    //外部透传参数
    protected _winData: any = null;



    showWin(...param) {
        this.node.active = true;
        UIMananger.instance.SetOpeningWin(this, true);
        Tools.setNodeTopLayer(this.node)
        if (param.length > 0) {
            this._winData = param.length === 1 ? param[0] : param;
        }
        // this.node.setSiblingIndex(this.node.parent.children.length - 1);
        if (this.winBg) {
            this.winBg.setScale(0.1, 0.1, 1);
            tween(this.winBg).to(this.animTime, { x: 1, y: 1, z: 1 }).start();
        }
        this.OnCheckRefreshUI();
    }

    closeWin() {
        this.node.active = false;
        this._winData = null;
        UIMananger.instance.SetOpeningWin(this, false);
    }
    public initEvent(): void {
        super.initEvent();

        var btnClose = this["btn_close"];
        if (btnClose) {
            this.addNodeEvent(btnClose.node, Node.EventType.TOUCH_END, this.closeWin);
        }

        if (this.close_on_mask && this.mask_button) {
            this.addNodeEvent(this.mask_button, Node.EventType.TOUCH_END, this.closeWin);
        }
    }
    //是否全屏
    public get Is_FullScene() {
        return false;
    }
    

    /** 所属父面板。关掉本窗口时把父面板显示回来，父面板关掉时本窗口一起关 */
    public get parentWinName(): string | null {
        return null;
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


