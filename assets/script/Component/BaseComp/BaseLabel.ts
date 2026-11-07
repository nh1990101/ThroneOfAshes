import { _decorator, Color, Label } from 'cc';
import { EDITOR_NOT_IN_PREVIEW } from 'cc/env';
import { lang, LangMgr } from '../../Common/LangMgr';
const { ccclass, executeInEditMode } = _decorator;

@ccclass('BaseLabel')
@executeInEditMode
export class BaseLabel extends Label {

    /**
     * 只在编辑器中首次添加组件时调用，用于设置默认值
     * 之后用户修改属性后，不会再被覆盖
     */
    resetInEditor() {
        this.fontSize = 32;
        this.color = new Color(255, 255, 255, 255);
        this.lineHeight = 28;
        this.string = 'Label';
        this.useSystemFont = true;
        this.fontFamily = "SimHei";
        this.verticalAlign = Label.VerticalAlign.CENTER;
        this.isBold = true;
        this.enableOutline = false;
        this.outlineColor = new Color(0, 0, 0, 255);
        this.outlineWidth = 2;
    }

    onLoad() {
        if (EDITOR_NOT_IN_PREVIEW) {
            return;
        }
        this.applyPrefabLang();
    }

    /**
     * 设置显示文本。
     * 传入翻译表 id 时按当前语言取文案，args 用来替换 {name}。
     */
    public setText(content: string | number, args?: Record<string, string | number>) {
        if (typeof content === 'number') {
            this.string = lang(content, args);
            return;
        }
        this.string = content;
    }

    /** 预制体上直接写的 $Lang$原文。未播放时保留原文，避免存盘时被译文盖掉。 */
    private applyPrefabLang() {
        const current = this.string;
        if (!current.includes('$Lang$')) {
            return;
        }
        this.string = LangMgr.getInstance().translateText(current);
    }
}
