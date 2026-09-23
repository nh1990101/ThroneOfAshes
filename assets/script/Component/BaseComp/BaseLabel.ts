import { _decorator, Color, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BaseLabel')
export class BaseLabel extends Label {

    /**
     * 只在编辑器中首次添加组件时调用，用于设置默认值
     * 之后用户修改属性后，不会再被覆盖
     */
    resetInEditor() {
        // 设置默认字体大小
        this.fontSize = 32;

        // 设置默认字体颜色（白色）
        this.color = new Color(255, 255, 255, 255);

        // 设置默认行高
        this.lineHeight = 28;

        // 设置默认文本内容
        this.string = 'Label';

        // 使用系统字体
        this.useSystemFont = true;

        // 设置水平对齐方式为居中
        // this.horizontalAlign = Label.HorizontalAlign.CENTER;

        // 设置垂直对齐方式为居中
        // this.verticalAlign = Label.VerticalAlign.CENTER;

        // 开启溢出模式为缩小
        // this.overflow = Label.Overflow.SHRINK;
    }
}


