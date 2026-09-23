import { _decorator, Button, Color, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BaseBtn')
export class BaseBtn extends Button {

    /**
     * 只在编辑器中首次添加组件时调用，用于设置默认值
     * 之后用户修改属性后，不会再被覆盖
     */
    resetInEditor() {
        // 设置默认过渡效果为颜色过渡
        this.transition = Button.Transition.COLOR;

        // 设置默认正常状态颜色（白色）
        this.normalColor = new Color(255, 255, 255, 255);

        // 设置默认按下状态颜色（浅灰色）
        this.pressedColor = new Color(200, 200, 200, 255);

        // 设置默认悬停状态颜色（浅灰色）
        this.hoverColor = new Color(220, 220, 220, 255);

        // 设置默认禁用状态颜色（深灰色）
        this.disabledColor = new Color(124, 124, 124, 255);

        // 设置默认过渡时长
        this.duration = 0.1;

        // 设置默认可交互
        this.interactable = true;

        // 设置目标节点为自身
        this.target = this.node;
    }
}


