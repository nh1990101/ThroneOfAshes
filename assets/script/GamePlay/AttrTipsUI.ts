import { _decorator, UITransform } from 'cc';
import { BaseLabel } from '../Component/BaseComp/BaseLabel';
import { PointerPopupParam, PointerPopupWinBase } from './PointerPopupWinBase';
const { ccclass } = _decorator;

const TEXT_PAD_X = 24;
const TEXT_PAD_Y = 16;

export interface AttrTipsParam extends PointerPopupParam {
    /** 属性名 */
    desc: string;
}

/** 属性名小提示。跟随和遮罩走基类，框只包住名字 */
@ccclass('AttrTipsUI')
export class AttrTipsUI extends PointerPopupWinBase {

    private tips: AttrTipsParam = null;

    public showWin(tips: AttrTipsParam): void {
        this.tips = tips;
        super.showWin(tips);
    }

    protected refreshPopup(): void {
        const floor = this.node.getChildByPath('FollowArea/Follow/HeightArea/Window/Floor');
        const text_node = floor.getChildByName('Text');
        text_node.getComponent(BaseLabel).setText(this.tips.desc);
        const text_size = text_node.getComponent(UITransform).contentSize;
        const width = text_size.width + TEXT_PAD_X;
        const height = text_size.height + TEXT_PAD_Y;
        floor.getComponent(UITransform).setContentSize(width, height);
        floor.parent.getComponent(UITransform).setContentSize(width, height);
    }
}
