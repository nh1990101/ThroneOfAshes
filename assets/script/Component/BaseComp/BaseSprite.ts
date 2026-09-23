import { _decorator, Color, Sprite, SpriteFrame, SpriteAtlas } from 'cc';
import { AssetMgr } from '../../Common/AssetMgr';
const { ccclass, property } = _decorator;

@ccclass('BaseSprite')
export class BaseSprite extends Sprite {
    private _currentResPath: string = '';
    private _currentAtlasPath: string = '';
    private _isFromAtlas: boolean = false;

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

    /**
     * 从图集中加载并设置sprite
     * @param resName sprite在图集中的名称
     * @param atlasName 图集路径，默认为 "ui/commonUI"
     * @returns Promise<void>
     */
    public async setSpriteFromAtlas(resName: string, atlasName: string = "ui/commonUI"): Promise<void> {
        try {
            // 释放之前的资源
            this.releaseSprite();

            const atlas = await AssetMgr.getRes(atlasName, SpriteAtlas);
            const frame = atlas.getSpriteFrame(resName);

            if (frame) {
                this.spriteFrame = frame;
                this._currentResPath = resName;
                this._currentAtlasPath = atlasName;
                this._isFromAtlas = true;
            } else {
                console.error(`从图集 ${atlasName} 中找不到 sprite: ${resName}`);
            }
        } catch (error) {
            console.error(`加载图集sprite失败: ${error}`);
        }
    }

    /**
     * 从单图加载并设置sprite
     * @param resPath 单图资源路径
     * @returns Promise<void>
     */
    public async setSpriteFromSingle(resPath: string): Promise<void> {
        try {
            // 释放之前的资源
            this.releaseSprite();

            const spriteFrame = await AssetMgr.getRes(resPath, SpriteFrame);

            if (spriteFrame) {
                this.spriteFrame = spriteFrame;
                this._currentResPath = resPath;
                this._currentAtlasPath = '';
                this._isFromAtlas = false;
            } else {
                console.error(`找不到单图资源: ${resPath}`);
            }
        } catch (error) {
            console.error(`加载单图sprite失败: ${error}`);
        }
    }

    /**
     * 设置sprite（自动判断是图集还是单图）
     * @param resName sprite名称或路径
     * @param atlasName 可选的图集路径，如果提供则从图集加载，否则从单图加载
     * @returns Promise<void>
     */
    public async setSprite(resName: string, atlasName?: string): Promise<void> {
        if (atlasName) {
            await this.setSpriteFromAtlas(resName, atlasName);
        } else {
            await this.setSpriteFromSingle(resName);
        }
    }

    /**
     * 释放当前sprite资源
     */
    public releaseSprite(): void {
        if (this.spriteFrame) {
            this.spriteFrame = null;
        }
        this._currentResPath = '';
        this._currentAtlasPath = '';
        this._isFromAtlas = false;
    }

    /**
     * 获取当前加载的资源信息
     * @returns 资源信息对象
     */
    public getSpriteInfo(): { resPath: string; atlasPath: string; isFromAtlas: boolean } {
        return {
            resPath: this._currentResPath,
            atlasPath: this._currentAtlasPath,
            isFromAtlas: this._isFromAtlas
        };
    }

    /**
     * 组件销毁时自动释放资源
     */
    public onDestroy(): void {
        super.onDestroy();
        this.releaseSprite();
    }
}
