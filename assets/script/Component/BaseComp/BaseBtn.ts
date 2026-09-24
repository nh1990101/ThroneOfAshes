import { _decorator, Button, Color, Sprite, Node } from 'cc';
import { BaseSprite } from './BaseSprite';
import { BaseLabel } from './BaseLabel';
const { ccclass, property } = _decorator;

@ccclass('BaseBtn')
export class BaseBtn extends Button {
    /**
     * 按钮图片
     */
    private _btnBg: BaseSprite;
    /**
     * 按钮文本
     */
    private _lb_text: BaseLabel;
    /**
     * 只在编辑器中首次添加组件时调用，用于设置默认值
     * 之后用户修改属性后，不会再被覆盖
     */
    resetInEditor() {
        // 自动添加 BaseSprite 组件到按钮节点（如果没有）
        this._btnBg = this.node.getComponent(BaseSprite)
        if (!this._btnBg) {
            this._btnBg = this.node.addComponent(BaseSprite);
        }

        // 查找或创建 Label 子节点
        let labelNode = this.node.getChildByName('Label');
        if (!labelNode) {
            labelNode = new Node('Label');
            this.node.addChild(labelNode);
        }


        // 自动添加 BaseLabel 组件到子节点（如果没有）
        if (!labelNode.getComponent(BaseLabel)) {
            this._lb_text = labelNode.addComponent(BaseLabel);
        }


        // 设置默认按钮点击缩放
        this.transition = Button.Transition.SCALE;


        // 设置默认可交互
        this.interactable = true;

        // 设置目标节点为自身
        this.target = this.node;
    }
    SetText(content: string) {
        if (this._lb_text) {
            this._lb_text.string = content;
        }
    }
    SetSprite(resName: string, atlasName?: string) {
        if (this._btnBg) {
            this._btnBg.setSprite(resName, atlasName);
        }
    }

    /**
     * 设置按钮置灰状态
     * @param isGray 是否置灰，true 为置灰不可用，false 为正常可用
     */
    SetGray(isGray: boolean): void {
        // 设置按钮可交互状态
        this.interactable = !isGray;

        // 设置背景 Sprite 灰度
        if (this._btnBg) {
            this._btnBg.grayscale = isGray;
        }

        // 设置文字 Label 颜色（模拟置灰效果）
        if (this._lb_text) {
            if (isGray) {
                // 置灰时设置为灰色
                this._lb_text.color = new Color(150, 150, 150, 255);
            } else {
                // 恢复时设置为白色
                this._lb_text.color = new Color(255, 255, 255, 255);
            }
        }
    }

    /**
     * 获取当前按钮是否为置灰状态
     * @returns 是否置灰
     */
    IsGray(): boolean {
        return !this.interactable;
    }
}


