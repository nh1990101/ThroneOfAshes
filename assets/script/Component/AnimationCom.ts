import { _decorator, Color, Mat4, Material, SpriteAtlas, SpriteFrame, UITransform, Vec2, Vec4 } from 'cc';
import { BaseComp } from '../Component/BaseComp';
import { BaseSprite } from './BaseComp/BaseSprite';
import { AssetMgr } from '../Common/AssetMgr';
const { ccclass, property } = _decorator;

/**
 * 帧动画播放组件
 * 支持图集帧动画播放、速度控制、范围播放、播放回调等功能
 */
@ccclass('AnimationCom')
export class AnimationCom extends BaseComp {
    private static readonly DEFAULT_OUTLINE_MATERIAL = 'Res/Material/animationOutline';

    protected aniObj: BaseSprite;

    @property({ type: Material, displayName: '描边材质', tooltip: '留空时加载默认序列帧描边材质' })
    public outlineMaterial: Material | null = null;

    @property({ type: Color, displayName: '描边颜色' })
    public outlineColor: Color = new Color(255, 255, 255, 255);

    @property({ displayName: '描边宽度', min: 0, max: 20, step: 1 })
    public outlineWidth: number = 2;

    // 描边状态。材质实例按组件创建，避免不同动画之间互相修改参数。
    private _outlineEnabled: boolean = false;
    private _outlineMaterialInstance: Material | null = null;
    private _outlineLoadPromise: Promise<Material | null> | null = null;
    private _outlineRequestId: number = 0;
    private _defaultMaterial: Material | null = null;
    private _uiTransform: UITransform | null = null;
    private readonly _outlineUV: Vec4 = new Vec4();
    private readonly _outlineFrameSize: Vec2 = new Vec2();
    private readonly _outlineFrameCenter: Vec2 = new Vec2();
    private readonly _outlineUVStep: Vec2 = new Vec2();
    private readonly _outlineTexelSize: Vec2 = new Vec2();
    private readonly _outlineWorld: Mat4 = new Mat4();
    private readonly _outlineWorldInv: Mat4 = new Mat4();

    // 帧数据
    private _frames: SpriteFrame[] = [];
    private _currentFrameIndex: number = 0;

    // 播放控制
    private _isPlaying: boolean = false;
    private _isPaused: boolean = false;
    private _frameRate: number = 30; // 默认30帧每秒
    private _frameInterval: number = 1 / 30; // 帧间隔时间（秒）
    private _timer: number = 0;

    // 播放范围
    private _startFrame: number = 0;
    private _endFrame: number = 0;
    private _loop: boolean = true;

    // 回调
    private _onComplete: Function | null = null;
    private _onCompleteTarget: any = null;

    // 资源信息
    private _atlasPath: string = '';
    private _framePrefix: string = '';
    // 播放完是否自动回收
    private _isAutoRemove: boolean;

    onLoad(): void {
        // super.onLoad();
        if (this.aniObj == null) {
            this.aniObj = this.getComponent(BaseSprite);
            if (!this.aniObj) {
                this.aniObj = this.node.addComponent(BaseSprite);
            }
        }
        this._uiTransform = this.aniObj.getComponent(UITransform);
        this._defaultMaterial = this.aniObj.customMaterial;
    }

    update(dt: number): void {
        if (!this._isPlaying || this._isPaused || this._frames.length === 0) {
            return;
        }

        this._timer += dt;
        // 保留不足一帧的余量，高倍速或低渲染帧率时补齐应推进的动画帧。
        while (this._isPlaying && !this._isPaused && this._timer >= this._frameInterval) {
            this._timer -= this._frameInterval;
            this.nextFrame();
        }
    }

    /**
     * 从图集加载帧序列
     * @param atlasPath 图集路径
     * @param framePrefix 帧名称前缀（例如："frame_"）
     * @param frameCount 帧数量（默认-1表示加载所有匹配前缀的帧）
     * @param startIndex 起始索引（默认0）
     * @returns Promise<void>
     */
    public async loadFramesFromAtlas(atlasPath: string, framePrefix: string, frameCount: number = -1, startIndex: number = 0): Promise<void> {
        try {
            this.releaseFrames();

            const atlas = await AssetMgr.getRes(atlasPath, SpriteAtlas);
            this._frames = [];

            if (frameCount === -1) {
                // 加载所有序列帧，直到找不到为止
                let index = startIndex;
                let consecutiveMissCount = 0;
                const maxConsecutiveMiss = 5; // 连续5次找不到就停止

                while (consecutiveMissCount < maxConsecutiveMiss) {
                    const frameName = `${framePrefix}${index}`;
                    const frame = atlas.getSpriteFrame(frameName);

                    if (frame) {
                        this._frames.push(frame);
                        consecutiveMissCount = 0; // 重置连续未找到计数
                    } else {
                        consecutiveMissCount++;
                    }

                    index++;

                    // 防止无限循环，最多尝试1000帧
                    if (index - startIndex > 1000) {
                        console.warn(`已尝试加载1000帧，停止加载`);
                        break;
                    }
                }
            } else {
                // 加载指定数量的帧
                for (let i = 0; i < frameCount; i++) {
                    const frameName = `${framePrefix}${startIndex + i}`;
                    const frame = atlas.getSpriteFrame(frameName);

                    if (frame) {
                        this._frames.push(frame);
                    } else {
                        console.warn(`找不到帧: ${frameName}`);
                    }
                }
            }

            this._atlasPath = atlasPath;
            this._framePrefix = framePrefix;
            this._startFrame = 0;
            this._endFrame = this._frames.length - 1;

            if (this._frames.length > 0) {
                this.setFrame(0);
            }

            console.log(`加载帧动画成功，共 ${this._frames.length} 帧`);
        } catch (error) {
            console.error(`加载帧动画失败: ${error}`);
        }
    }

    /**
     * 直接设置帧序列
     * @param frames SpriteFrame数组
     */
    public setFrames(frames: SpriteFrame[]): void {
        this.releaseFrames();
        this._frames = frames;
        this._startFrame = 0;
        this._endFrame = this._frames.length - 1;

        if (this._frames.length > 0) {
            this.setFrame(0);
        }
    }

    /**
     * 播放动画
     * @param startFrame 起始帧（默认0）
     * @param endFrame 结束帧（默认为最后一帧）
     * @param loop 是否循环（默认true）
     * @param onComplete 播放完成回调
     * @param target 回调目标对象
     */
    public play(startFrame: number = 0, endFrame: number = -1, loop: boolean = true, isAutoRemove?: boolean, onComplete?: Function, target?: any): void {
        if (this._frames.length === 0) {
            console.warn('没有可播放的帧');
            return;
        }

        this._startFrame = Math.max(0, startFrame);
        this._endFrame = endFrame < 0 ? this._frames.length - 1 : Math.min(endFrame, this._frames.length - 1);
        this._loop = loop;
        this._onComplete = onComplete || null;
        this._onCompleteTarget = target || null;
        this._isAutoRemove = isAutoRemove || false;
        this._currentFrameIndex = this._startFrame;
        this.setFrame(this._currentFrameIndex);

        this._isPlaying = true;
        this._isPaused = false;
        this._timer = 0;
    }

    /**
     * 停止播放
     * @param resetToStart 是否重置到起始帧（默认true）
     */
    public stop(resetToStart: boolean = true): void {
        this._isPlaying = false;
        this._isPaused = false;
        this._timer = 0;

        if (resetToStart) {
            this._currentFrameIndex = this._startFrame;
            this.setFrame(this._currentFrameIndex);
        }
    }

    /**
     * 暂停播放
     */
    public pause(): void {
        if (this._isPlaying) {
            this._isPaused = true;
        }
    }

    /**
     * 恢复播放
     */
    public resume(): void {
        if (this._isPlaying && this._isPaused) {
            this._isPaused = false;
        }
    }

    /**
     * 设置播放速度（帧率）
     * @param frameRate 每秒帧数
     */
    public setFrameRate(frameRate: number): void {
        this._frameRate = Math.max(1, frameRate);
        this._frameInterval = 1 / this._frameRate;
    }

    /**
     * 获取当前帧率
     */
    public getFrameRate(): number {
        return this._frameRate;
    }

    /**
     * 跳转到指定帧
     * @param frameIndex 帧索引
     */
    public gotoFrame(frameIndex: number): void {
        if (frameIndex >= 0 && frameIndex < this._frames.length) {
            this._currentFrameIndex = frameIndex;
            this.setFrame(this._currentFrameIndex);
        }
    }

    /**
     * 跳转到指定帧并播放
     * @param frameIndex 帧索引
     */
    public gotoAndPlay(frameIndex: number): void {
        this.gotoFrame(frameIndex);
        if (!this._isPlaying) {
            this.play(frameIndex, this._endFrame, this._loop, this._isAutoRemove, this._onComplete, this._onCompleteTarget);
        }
    }

    /**
     * 跳转到指定帧并停止
     * @param frameIndex 帧索引
     */
    public gotoAndStop(frameIndex: number): void {
        this.gotoFrame(frameIndex);
        this.stop(false);
    }

    /**
     * 获取当前帧索引
     */
    public getCurrentFrame(): number {
        return this._currentFrameIndex;
    }

    /**
     * 获取总帧数
     */
    public getTotalFrames(): number {
        return this._frames.length;
    }

    /**
     * 是否正在播放
     */
    public isPlaying(): boolean {
        return this._isPlaying && !this._isPaused;
    }

    /**
     * 是否已暂停
     */
    public isPaused(): boolean {
        return this._isPaused;
    }

    /**
     * 释放帧动画资源
     */
    public releaseFrames(): void {
        this.stop();
        this._frames = [];
        this._currentFrameIndex = 0;
        this._startFrame = 0;
        this._endFrame = 0;
        this._onComplete = null;
        this._onCompleteTarget = null;
        this._atlasPath = '';
        this._framePrefix = '';
        this.SetFlipX(false);
        if (this.aniObj) {
            this.aniObj.releaseSprite();
        }
    }

    /**
     * 设置序列帧描边。首次启用时会加载并复制描边材质。
     * @param enabled 是否启用
     * @param color 可选描边颜色
     * @param width 可选描边宽度（UI 本地像素）
     */
    public async setOutline(enabled: boolean, color?: Color, width?: number): Promise<void> {
        const requestId = ++this._outlineRequestId;
        this._outlineEnabled = enabled;

        if (color) {
            this.outlineColor.set(color);
        }
        if (width !== undefined) {
            this.outlineWidth = Math.max(0, width);
        }

        if (!enabled) {
            this.restoreOutlineMaterial();
            return;
        }

        try {
            if (!this._outlineLoadPromise) {
                this._outlineLoadPromise = this.createOutlineMaterial();
            }
            const material = await this._outlineLoadPromise;

            // 忽略加载期间关闭描边、重复切换或组件销毁产生的迟到回调。
            if (!material || requestId !== this._outlineRequestId || !this._outlineEnabled || !this.isValid || !this.aniObj) {
                return;
            }

            this.aniObj.customMaterial = material;
            this.updateOutlineMaterial();
        } catch (error) {
            this._outlineLoadPromise = null;
            if (requestId === this._outlineRequestId) {
                this._outlineEnabled = false;
                this.restoreOutlineMaterial();
                console.error(`设置序列帧描边失败: ${error}`);
            }
        }
    }

    private async createOutlineMaterial(): Promise<Material | null> {
        const materialAsset = this.outlineMaterial || await AssetMgr.getRes(AnimationCom.DEFAULT_OUTLINE_MATERIAL, Material);
        if (!this.isValid) {
            return null;
        }

        const material = new Material();
        material.copy(materialAsset);
        this._outlineMaterialInstance = material;
        return material;
    }

    private restoreOutlineMaterial(): void {
        if (this.aniObj && this.aniObj.customMaterial === this._outlineMaterialInstance) {
            this.aniObj.customMaterial = this._defaultMaterial;
        }
    }

    /** 每帧同步图集 UV、尺寸和采样步长，不修改共享 SpriteFrame。 */
    private updateOutlineMaterial(): void {
        const material = this._outlineMaterialInstance;
        const frame = this.aniObj && this.aniObj.spriteFrame;
        const transform = this._uiTransform;
        if (!this._outlineEnabled || !material || !frame || !transform || this.aniObj.customMaterial !== material) {
            return;
        }

        const texture = frame.texture;
        const uv = frame.uv;
        if (!texture || !uv || uv.length < 8) {
            return;
        }

        let minU = Number.POSITIVE_INFINITY;
        let minV = Number.POSITIVE_INFINITY;
        let maxU = Number.NEGATIVE_INFINITY;
        let maxV = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < uv.length; i += 2) {
            minU = Math.min(minU, uv[i]);
            minV = Math.min(minV, uv[i + 1]);
            maxU = Math.max(maxU, uv[i]);
            maxV = Math.max(maxV, uv[i + 1]);
        }

        const contentWidth = Math.abs(transform.width);
        const contentHeight = Math.abs(transform.height);
        if (contentWidth <= 0 || contentHeight <= 0 || maxU <= minU || maxV <= minV) {
            return;
        }

        // 与 Cocos SIMPLE assembler 保持一致。trim=false 时，实际顶点会被
        // trimmedBorder 偏移，不能直接使用 UITransform 的中心和尺寸。
        const anchorX = transform.anchorX * contentWidth;
        const anchorY = transform.anchorY * contentHeight;
        let left = -anchorX;
        let bottom = -anchorY;
        let right = contentWidth - anchorX;
        let top = contentHeight - anchorY;
        if (!this.aniObj.trim) {
            const originalSize = frame.originalSize;
            if (originalSize.width <= 0 || originalSize.height <= 0) {
                return;
            }
            const scaleX = contentWidth / originalSize.width;
            const scaleY = contentHeight / originalSize.height;
            const border = frame.trimmedBorder;
            left = border.x * scaleX - anchorX;
            bottom = border.z * scaleY - anchorY;
            right = contentWidth + border.y * scaleX - anchorX;
            top = contentHeight + border.w * scaleY - anchorY;
        }

        const width = right - left;
        const height = top - bottom;
        if (width <= 0 || height <= 0) {
            return;
        }

        const rotated = frame.rotated ? 1 : 0;
        const outlineWidth = Math.max(0, this.outlineWidth);
        const localWidthForU = rotated ? height : width;
        const localHeightForV = rotated ? width : height;

        this._outlineUV.set(minU, minV, maxU, maxV);
        this._outlineFrameSize.set(width, height);
        this._outlineFrameCenter.set((left + right) * 0.5, (bottom + top) * 0.5);
        this._outlineUVStep.set(
            (maxU - minU) * outlineWidth / localWidthForU,
            (maxV - minV) * outlineWidth / localHeightForV
        );
        this._outlineTexelSize.set(1 / Math.max(1, texture.width), 1 / Math.max(1, texture.height));
        Mat4.copy(this._outlineWorld, this.aniObj.node.worldMatrix);
        Mat4.invert(this._outlineWorldInv, this._outlineWorld);

        material.setProperty('outlineColor', this.outlineColor);
        material.setProperty('outlineWidth', outlineWidth);
        material.setProperty('outlineWorld', this._outlineWorld);
        material.setProperty('outlineWorldInv', this._outlineWorldInv);
        material.setProperty('frameUV', this._outlineUV);
        material.setProperty('frameSize', this._outlineFrameSize);
        material.setProperty('frameCenter', this._outlineFrameCenter);
        material.setProperty('uvStep', this._outlineUVStep);
        material.setProperty('texelSize', this._outlineTexelSize);
        material.setProperty('frameRotated', rotated);
    }

    /**
     * 切换到下一帧
     */
    private nextFrame(): void {
        this._currentFrameIndex++;

        // 检查是否播放到结束帧
        if (this._currentFrameIndex > this._endFrame) {
            if (this._loop) {
                // 循环播放，回到起始帧
                this._currentFrameIndex = this._startFrame;
            } else {
                // 不循环，停止播放并触发回调
                this._currentFrameIndex = this._endFrame;
                this._isPlaying = false;

                this.CompleteCallFunc();
                if (this._isAutoRemove) {
                    AssetMgr.removeNode(this.node);
                }
                return;
            }
        }

        this.setFrame(this._currentFrameIndex);
    }

    /**马上触发播放结束回调 */
    public CompleteCallFunc() {
        if (this._onComplete) {
            if (this._onCompleteTarget) {
                this._onComplete.call(this._onCompleteTarget);
            } else {
                this._onComplete();
            }
        }
    }

    /**
     * 设置显示的帧
     * @param frameIndex 帧索引
     */
    private setFrame(frameIndex: number): void {
        if (frameIndex >= 0 && frameIndex < this._frames.length && this.aniObj) {
            this.aniObj.spriteFrame = this._frames[frameIndex];
            this.updateOutlineMaterial();
        }
    }
    public get aniImg() {
        return this.aniObj;
    }

    public clear(): void {
        this._onCompleteTarget = null;
        this._onComplete = null;
        this._outlineRequestId++;
        this._outlineEnabled = false;
        this.restoreOutlineMaterial();
        this.releaseFrames();
        this._outlineLoadPromise = null;
        if (this._outlineMaterialInstance) {
            this._outlineMaterialInstance.destroy();
            this._outlineMaterialInstance = null;
        }
        super.clear();
    }
    public SetFlipX(bol: boolean) {
        if (this.aniObj) {
            var flixDir = bol ? -1 : 1;
            var scale = this.aniObj.node.scale;
            this.aniObj.node.setScale(flixDir * Math.abs(scale.x), scale.y);
        }
    }
    public GetFlipX() {
        return this.aniObj.node.scale.x < 0;
    }
}


