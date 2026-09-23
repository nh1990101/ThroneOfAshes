import { _decorator, Component, Node, Sprite, SpriteFrame, SpriteAtlas } from 'cc';
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
    protected aniObj: BaseSprite;

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

    start(): void {
        super.start();
        if (this.aniObj == null) {
            this.aniObj = this.getComponent(BaseSprite);
            if (!this.aniObj) {
                this.aniObj = this.node.addComponent(BaseSprite);
            }
        }
    }

    update(dt: number): void {
        if (!this._isPlaying || this._isPaused || this._frames.length === 0) {
            return;
        }

        this._timer += dt;
        if (this._timer >= this._frameInterval) {
            this._timer = 0;
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
    public play(startFrame: number = 0,endFrame: number = -1,loop: boolean = true, onComplete?: Function,target?: any): void {
        if (this._frames.length === 0) {
            console.warn('没有可播放的帧');
            return;
        }

        this._startFrame = Math.max(0, startFrame);
        this._endFrame = endFrame < 0 ? this._frames.length - 1 : Math.min(endFrame, this._frames.length - 1);
        this._loop = loop;
        this._onComplete = onComplete || null;
        this._onCompleteTarget = target || null;

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
            this.play(frameIndex, this._endFrame, this._loop, this._onComplete, this._onCompleteTarget);
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

        if (this.aniObj) {
            this.aniObj.releaseSprite();
        }
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

                if (this._onComplete) {
                    if (this._onCompleteTarget) {
                        this._onComplete.call(this._onCompleteTarget);
                    } else {
                        this._onComplete();
                    }
                }
                return;
            }
        }

        this.setFrame(this._currentFrameIndex);
    }

    /**
     * 设置显示的帧
     * @param frameIndex 帧索引
     */
    private setFrame(frameIndex: number): void {
        if (frameIndex >= 0 && frameIndex < this._frames.length && this.aniObj) {
            this.aniObj.spriteFrame = this._frames[frameIndex];
        }
    }

    /**
     * 组件销毁时释放资源
     */
    protected onDestroy(): void {
        this.releaseFrames();
    }
}


