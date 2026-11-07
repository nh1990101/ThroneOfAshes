import { _decorator, Component, Node, NodeEventType } from 'cc';
import { BaseWin } from '../Component/BaseWin';
import { BaseLabel } from '../Component/BaseComp/BaseLabel';
import { comp } from './Decorator';
import { BaseBtn } from '../Component/BaseComp/BaseBtn';
import { CHECK_TYPE } from './GameEnum';
import { BaseSprite } from '../Component/BaseComp/BaseSprite';
const { ccclass, property } = _decorator;



export interface ICheckBoxData {
    tittle: string;
    content: string;
    showType: CHECK_TYPE;

    /**确认回调 */
    confirmFunc?: Function;
    /**取消回调 */
    cancleFunc?: Function;
}
@ccclass('CheckBox')
export class CheckBox extends BaseWin {
    @comp(BaseLabel)
    lb_content: BaseLabel = null!;

    @comp(BaseBtn)
    btn_ok: BaseBtn = null!;

    @comp(BaseBtn)
    btn_cancle: BaseBtn = null!;

    @comp(BaseLabel)
    text: BaseLabel = null!;
    @comp(BaseSprite)
    btn_mask: BaseSprite = null!;

    @comp(BaseBtn)
    btn_close: BaseBtn = null!;


    public OnRefreshUI(): void {
        super.OnRefreshUI();
        const data: ICheckBoxData = this.getData();
        this.text.string = data.tittle;
        this.lb_content.string = data.content;

        this.btn_cancle.node.active = data.showType == CHECK_TYPE.CHECK;
    }
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.btn_ok.node, NodeEventType.TOUCH_END, this.onClickOk, this);
        this.addNodeEvent(this.btn_cancle.node, NodeEventType.TOUCH_END, this.onClickCancle, this);
        // this.addNodeEvent(this.btn_close.node, NodeEventType.TOUCH_END, this.onClickCancle, this);
        this.addNodeEvent(this.btn_mask.node, NodeEventType.TOUCH_END, this.onClickCancle, this);
    }
    private onClickOk() {
        const data: ICheckBoxData = this.getData();
        if (data.confirmFunc) {
            data.confirmFunc();
        }
        this.closeWin();
    }
    private onClickCancle() {
        const data: ICheckBoxData = this.getData();
        if (data.cancleFunc) {
            data.cancleFunc();
        }
        this.closeWin();
    }
}


