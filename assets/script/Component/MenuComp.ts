import { _decorator, Component, Node, NodeEventType, UITransform } from 'cc';
import { BaseComp } from './BaseComp';
import { BaseBtn } from './BaseComp/BaseBtn';
import { ScrollList } from './BaseComp/ScrollList';
import { child, comp } from '../Common/Decorator';
import { MenuCell } from './MenuCell';
import { BaseLabel } from './BaseComp/BaseLabel';
const { ccclass, property } = _decorator;

@ccclass('MenuComp')
export class MenuComp extends BaseComp {
    @comp(BaseLabel)
    lb_select: BaseLabel = null!;
    @comp(BaseBtn)
    select: BaseBtn = null!;


    @comp(ScrollList)
    MenuList: ScrollList = null!;

    @child()
    cancleTouch: Node = null!;

    private callBack: Function;
    public initEvent(): void {
        super.initEvent();
        this.addNodeEvent(this.select.node, NodeEventType.TOUCH_END, this.OpenMenu, this);
        this.addNodeEvent(this.cancleTouch, NodeEventType.TOUCH_END, this.CloseMenu, this);
        this.MenuList.node.active = false;
    }
    private OpenMenu() {
        this.MenuList.node.active = true;
        this.cancleTouch.active = true;
    }
    private CloseMenu() {
        this.MenuList.node.active = false;
        this.cancleTouch.active = false;
    }
    public setSelectCallBack(callBack: Function) {
        this.callBack = callBack;
    }
    public updateList(content: string[], callBack?: Function) {
        this.MenuList.autoScrollToSelected = true;
        this.MenuList.autoSelectIndex = 0;
        // 必须在 updateList 之前设置：ScrollList 只在创建 cell 时、且已有 selectFunc 才给 cell 绑定点击
        this.MenuList.setSelectFunc(this.selectFunc.bind(this));
        this.MenuList.updateList(content, MenuCell);
        // ScrollView 的点击区域是 MenuList 自身尺寸，和内容高度对齐，避免选项下方多出一片把点击吃掉的空白
        const contentUIT = this.MenuList.content?.getComponent(UITransform);
        if (contentUIT) {
            this.MenuList.node.getComponent(UITransform)!.height = contentUIT.height;
        }
        if (callBack) {
            this.setSelectCallBack(callBack);
        }
    }
    protected selectFunc() {
        if (this.callBack) {
            this.callBack();
        }
        this.lb_select.string = this.MenuList.selectedData;
        this.CloseMenu();
    }
    public get selectIndex() {
        return this.MenuList.selectIndex;
    }

}


