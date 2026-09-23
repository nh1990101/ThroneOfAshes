import { _decorator, Color, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BaseSprite')
export class BaseSprite extends Sprite {

    /**
     * 只在编辑器中首次添加组件时调用，用于设置默认值
     * 之后用户修改属性后，不会再被覆盖
     */
    resetInEditor() {
        // 设置默认颜色（白色）
        this.color = new Color(255, 255, 255, 255);

        // 设置默认类型为简单模式
        this.type = Sprite.Type.SIMPLE;

        // 设置默认尺寸模式为自定义
        this.sizeMode = Sprite.SizeMode.CUSTOM;

        // 设置默认不裁剪
        this.trim = false;
    }
}
