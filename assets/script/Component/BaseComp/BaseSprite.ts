import { _decorator, Color, Sprite, SpriteFrame, SpriteAtlas, Material, Vec2, UITransform, Rect, isValid } from 'cc';
import { AssetMgr } from '../../Common/AssetMgr';
import { GameUrl } from '../../Common/GameUrl';
import { ConfigMgr } from '../../Config/ConfigMgr';
import { Tools } from '../../Common/Tools';
const { ccclass, property } = _decorator;

@ccclass('BaseSprite')
export class BaseSprite extends Sprite {
    private _currentResPath: string = '';
    private _currentAtlasPath: string = '';
    private _isFromAtlas: boolean = false;
    private load_request_id = 0;
    private strokMaterial: Material | null = null;
    onLoad(): void {
        super.onLoad();
        // 缓存材质资源，避免普通图片在初始化时创建独立材质实例。
        this.strokMaterial = this.customMaterial;
    }
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
        this.sizeMode = Sprite.SizeMode.TRIMMED;

        // 设置默认不裁剪
        this.trim = false;
    }

    /**
     * 从图集中加载并设置sprite
     * @param resName sprite在图集中的名称
     * @param atlasName 图集路径，默认为 "ui/commonUI"
     * @returns Promise<void>
     */
    public async setSpriteFromAtlas(resName: string, atlasName: string = GameUrl.Atlas_Common): Promise<void> {
        if (this._currentResPath == resName && this._currentAtlasPath == atlasName) {
            return;
        }
        this.releaseSprite();
        const request_id = this.load_request_id;

        try {
            const atlas = await AssetMgr.getRes(atlasName, SpriteAtlas);
            if (request_id !== this.load_request_id || !isValid(this, true)) {
                return;
            }
            const frame = atlas.getSpriteFrame(resName);

            if (frame) {
                this.spriteAtlas = atlas;
                this.spriteFrame = frame;
                this._currentResPath = resName;
                this._currentAtlasPath = atlasName;
                this._isFromAtlas = true;
            } else {
                console.error(`从图集 ${atlasName} 中找不到 sprite: ${resName}`);
                this.setSpriteFromSingle(GameUrl.Single_Image_Url.format("noneImg"));
            }
        } catch (error) {
            if (request_id !== this.load_request_id || !isValid(this, true)) {
                return;
            }
            console.error(`加载图集sprite失败: ${error}`);
            this.setSpriteFromSingle(GameUrl.Single_Image_Url.format("noneImg"));
        }
    }

    /**
     * 从单图加载并设置sprite
     * @param resPath 单图资源路径
     * @returns Promise<void>
     */
    public async setSpriteFromSingle(resPath: string): Promise<void> {
        if (this._currentResPath == resPath) {
            return;
        }
        this.releaseSprite();
        const request_id = this.load_request_id;

        try {
            const spriteFrame = await AssetMgr.getRes(resPath, SpriteFrame);
            if (request_id !== this.load_request_id || !isValid(this, true)) {
                return;
            }

            if (spriteFrame) {
                this.spriteFrame = spriteFrame;
                this._currentResPath = resPath;
                this._currentAtlasPath = '';
                this._isFromAtlas = false;
            } else {
                console.error(`找不到单图资源: ${resPath}`);
                this.setSpriteFromSingle(GameUrl.Single_Image_Url.format("noneImg"));
            }
        } catch (error) {
            if (request_id !== this.load_request_id || !isValid(this, true)) {
                return;
            }
            console.error(`加载单图sprite失败: ${error}`);
            this.setSpriteFromSingle(GameUrl.Single_Image_Url.format("noneImg"));
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
    /**设置图标ID 对应IconData的id。没有图标资源时用问号 */
    public async setIconData(id: number) {
        const icon = id != null ? ConfigMgr.instance.IconData.get(id) : undefined;
        if (icon && icon.res_path && icon.res_name) {
            var isAtlas = icon.res_path.includes("Atlas");
            if (isAtlas) {
                this.setSpriteFromAtlas(icon.res_name, icon.res_path);
            } else {
                this.setSpriteFromSingle(Tools.formatIconResUrl(icon.res_path, icon.res_name));
            }
        } else {
            this.setSpriteFromSingle(GameUrl.Single_Image_Url.format("noneImg"));
        }
    }
    /**
     * 释放当前sprite资源
     */
    public releaseSprite(): void {
        // 清空图标时让尚未完成的加载失效，避免旧图在清空后重新出现。
        this.load_request_id++;
        if (this.spriteFrame) {
            this.spriteFrame = null;
        }
        this.spriteAtlas = null;
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
    /**描边 */
    setStoken(bol: boolean) {
        if (!this.strokMaterial) return
        if (bol) {
            this.customMaterial = this.strokMaterial;
            const enableStrokeOut = this.strokMaterial.getProperty('enableStrokeOut')
            if (enableStrokeOut) {
                const sp = this.getComponent(Sprite)
                if (!sp) return
                const material = this.getMaterialInstance(0)
                if (!material) return
                const imgSize = new Vec2(this.node.getComponent(UITransform).width, this.node.getComponent(UITransform).height)
                // const newSf = new SpriteFrame('strokeOut')
                // newSf.texture = sp.spriteFrame.texture
                const strokeOutPixelNew = material.getProperty('strokeOutPixel') as number
                const sfRect = new Rect(-strokeOutPixelNew, -strokeOutPixelNew, imgSize.x + strokeOutPixelNew * 2, imgSize.y + strokeOutPixelNew * 2)
                sp.spriteFrame.rect = sfRect
                material.setProperty('imgSize', imgSize)
            }
        } else {
            this.customMaterial = null;
        }
    }

}
