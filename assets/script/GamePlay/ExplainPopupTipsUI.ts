import { _decorator, Layout, UITransform, Widget } from 'cc';
import { BaseLabel } from '../Component/BaseComp/BaseLabel';
import { PointerPopupParam, PointerPopupWinBase } from './PointerPopupWinBase';
const { ccclass } = _decorator;

export interface ExplainPopupTipsParam extends PointerPopupParam {
    /** 说明正文 */
    desc: string;
    /** 有字才显示标题 */
    title?: string;
    /** 正文里的 {name} 换成这里的值 */
    desc_param?: Record<string, string | number>;
}

/** 跟着目标节点弹出的说明 */
@ccclass('ExplainPopupTipsUI')
export class ExplainPopupTipsUI extends PointerPopupWinBase {

    private tips: ExplainPopupTipsParam = null;

    public showWin(tips: ExplainPopupTipsParam): void {
        this.tips = tips;
        super.showWin(tips);
    }

    protected refreshPopup(): void {
        const floor = this.node.getChildByPath('FollowArea/Follow/HeightArea/Window/Floor');
        const title = this.tips.title ?? '';
        const title_node = floor.getChildByName('Title');
        title_node.active = title.length > 0;
        if (title.length > 0) {
            title_node.getChildByName('Text').getComponent(BaseLabel).setText(title);
        }
        const desc = fillDesc(this.tips.desc, this.tips.desc_param);
        const desc_text = floor.getChildByPath('Scroll/View/Content/Text');
        desc_text.getComponent(BaseLabel).setText(desc);
        const content = desc_text.parent;
        const view = content.parent;
        const text_height = desc_text.getComponent(UITransform).contentSize.height;
        const view_trans = view.getComponent(UITransform);
        content.getComponent(UITransform).setContentSize(
            view_trans.contentSize.width,
            Math.max(text_height, view_trans.contentSize.height),
        );
        content.getComponent(Widget).updateAlignment();
        floor.getComponent(Layout).updateLayout();
        const window = floor.parent;
        window.getComponent(UITransform).setContentSize(floor.getComponent(UITransform).contentSize);
    }
}

function fillDesc(desc: string, args?: Record<string, string | number>): string {
    if (!args) {
        return desc;
    }
    return desc.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name: string) => {
        const value = args[name];
        if (value === undefined || value === null) {
            return match;
        }
        return String(value);
    });
}
