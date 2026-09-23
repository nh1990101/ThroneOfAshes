import { _decorator } from 'cc';
import { BaseMgr } from './BaseMgr';

const { ccclass } = _decorator;

/**
 * 定时器回调接口
 */
export interface TimerCallback {
    callback: Function;
    thisArg: any;
    delay: number;
    repeat: number; // -1表示无限循环，0表示立即执行一次，>0表示重复次数
    elapsed: number;
    timerId: number;
    paused: boolean;
}

/**
 * 倒计时回调接口
 */
export interface CountdownCallback {
    callback: Function;
    thisArg: any;
    duration: number; // 倒计时总时长
    remaining: number; // 剩余时间
    countdownId: number;
    paused: boolean;
    onUpdate?: Function; // 每帧更新回调
}

@ccclass('TimerMgr')
export class TimerMgr extends BaseMgr {
    private static _instance: TimerMgr = null;

    // 时间缩放比例，1为正常速度，>1为加速，<1为减速
    private _timeScale: number = 1;

    // 定时器列表
    private _timers: Map<number, TimerCallback> = new Map();

    // 倒计时列表
    private _countdowns: Map<number, CountdownCallback> = new Map();

    // 定时器ID生成器
    private _timerIdCounter: number = 0;

    // 倒计时ID生成器
    private _countdownIdCounter: number = 0;

    // 是否暂停所有定时器
    private _globalPaused: boolean = false;

    public static get Instance(): TimerMgr {
        if (!this._instance) {
            this._instance = new TimerMgr();
        }
        return this._instance;
    }

    /**
     * 更新函数，需要在游戏主循环中调用
     * @param dt 帧间隔时间（秒）
     */
    public update(dt: number): void {
        if (this._globalPaused) {
            return;
        }

        const scaledDt = dt * this._timeScale;

        // 更新定时器
        this._updateTimers(scaledDt);

        // 更新倒计时
        this._updateCountdowns(scaledDt);
    }

    /**
     * 更新定时器
     */
    private _updateTimers(dt: number): void {
        const timersToRemove: number[] = [];

        this._timers.forEach((timer, timerId) => {
            if (timer.paused) {
                return;
            }

            timer.elapsed += dt;

            if (timer.elapsed >= timer.delay) {
                // 执行回调
                if (timer.callback) {
                    timer.callback.call(timer.thisArg);
                }

                if (timer.repeat === -1) {
                    // 无限循环，重置elapsed
                    timer.elapsed = 0;
                } else if (timer.repeat > 0) {
                    // 减少重复次数
                    timer.repeat--;
                    timer.elapsed = 0;
                } else {
                    // 完成，标记删除
                    timersToRemove.push(timerId);
                }
            }
        });

        // 删除已完成的定时器
        timersToRemove.forEach(timerId => {
            this._timers.delete(timerId);
        });
    }

    /**
     * 更新倒计时
     */
    private _updateCountdowns(dt: number): void {
        const countdownsToRemove: number[] = [];

        this._countdowns.forEach((countdown, countdownId) => {
            if (countdown.paused) {
                return;
            }

            countdown.remaining -= dt;

            // 执行更新回调
            if (countdown.onUpdate) {
                countdown.onUpdate.call(countdown.thisArg, countdown.remaining, countdown.duration);
            }

            if (countdown.remaining <= 0) {
                countdown.remaining = 0;

                // 执行完成回调
                if (countdown.callback) {
                    countdown.callback.call(countdown.thisArg);
                }

                // 标记删除
                countdownsToRemove.push(countdownId);
            }
        });

        // 删除已完成的倒计时
        countdownsToRemove.forEach(countdownId => {
            this._countdowns.delete(countdownId);
        });
    }

    /**
     * 添加定时器
     * @param callback 回调函数
     * @param delay 延迟时间（秒）
     * @param repeat 重复次数，-1为无限循环，0为立即执行一次
     * @param thisArg 回调函数的this指向
     * @returns 定时器ID
     */
    public addTimer(callback: Function, delay: number, repeat: number = 0, thisArg: any = null): number {
        const timerId = ++this._timerIdCounter;

        this._timers.set(timerId, {
            callback: callback,
            thisArg: thisArg,
            delay: delay,
            repeat: repeat,
            elapsed: 0,
            timerId: timerId,
            paused: false
        });

        return timerId;
    }

    /**
     * 延迟执行（只执行一次）
     * @param callback 回调函数
     * @param delay 延迟时间（秒）
     * @param thisArg 回调函数的this指向
     * @returns 定时器ID
     */
    public delayCall(callback: Function, delay: number, thisArg: any = null): number {
        return this.addTimer(callback, delay, 0, thisArg);
    }

    /**
     * 循环执行
     * @param callback 回调函数
     * @param interval 间隔时间（秒）
     * @param thisArg 回调函数的this指向
     * @returns 定时器ID
     */
    public loopCall(callback: Function, interval: number, thisArg: any = null): number {
        return this.addTimer(callback, interval, -1, thisArg);
    }

    /**
     * 移除定时器
     * @param timerId 定时器ID
     */
    public removeTimer(timerId: number): void {
        this._timers.delete(timerId);
    }

    /**
     * 暂停定时器
     * @param timerId 定时器ID
     */
    public pauseTimer(timerId: number): void {
        const timer = this._timers.get(timerId);
        if (timer) {
            timer.paused = true;
        }
    }

    /**
     * 恢复定时器
     * @param timerId 定时器ID
     */
    public resumeTimer(timerId: number): void {
        const timer = this._timers.get(timerId);
        if (timer) {
            timer.paused = false;
        }
    }

    /**
     * 添加倒计时
     * @param duration 倒计时时长（秒）
     * @param callback 倒计时结束回调
     * @param thisArg 回调函数的this指向
     * @param onUpdate 每帧更新回调，参数为(剩余时间, 总时长)
     * @returns 倒计时ID
     */
    public addCountdown(duration: number, callback: Function, thisArg: any = null, onUpdate?: Function): number {
        const countdownId = ++this._countdownIdCounter;

        this._countdowns.set(countdownId, {
            callback: callback,
            thisArg: thisArg,
            duration: duration,
            remaining: duration,
            countdownId: countdownId,
            paused: false,
            onUpdate: onUpdate
        });

        return countdownId;
    }

    /**
     * 移除倒计时
     * @param countdownId 倒计时ID
     */
    public removeCountdown(countdownId: number): void {
        this._countdowns.delete(countdownId);
    }

    /**
     * 暂停倒计时
     * @param countdownId 倒计时ID
     */
    public pauseCountdown(countdownId: number): void {
        const countdown = this._countdowns.get(countdownId);
        if (countdown) {
            countdown.paused = true;
        }
    }

    /**
     * 恢复倒计时
     * @param countdownId 倒计时ID
     */
    public resumeCountdown(countdownId: number): void {
        const countdown = this._countdowns.get(countdownId);
        if (countdown) {
            countdown.paused = false;
        }
    }

    /**
     * 获取倒计时剩余时间
     * @param countdownId 倒计时ID
     * @returns 剩余时间（秒），如果倒计时不存在则返回-1
     */
    public getCountdownRemaining(countdownId: number): number {
        const countdown = this._countdowns.get(countdownId);
        return countdown ? countdown.remaining : -1;
    }

    /**
     * 设置时间缩放
     * @param scale 时间缩放比例，1为正常速度，>1为加速，<1为减速，0为暂停
     */
    public setTimeScale(scale: number): void {
        this._timeScale = Math.max(0, scale);
    }

    /**
     * 获取时间缩放
     * @returns 当前时间缩放比例
     */
    public getTimeScale(): number {
        return this._timeScale;
    }

    /**
     * 暂停所有定时器和倒计时
     */
    public pauseAll(): void {
        this._globalPaused = true;
    }

    /**
     * 恢复所有定时器和倒计时
     */
    public resumeAll(): void {
        this._globalPaused = false;
    }

    /**
     * 清空所有定时器
     */
    public clearAllTimers(): void {
        this._timers.clear();
    }

    /**
     * 清空所有倒计时
     */
    public clearAllCountdowns(): void {
        this._countdowns.clear();
    }

    /**
     * 清空所有定时器和倒计时
     */
    public clearAll(): void {
        this.clearAllTimers();
        this.clearAllCountdowns();
    }

    /**
     * 获取当前定时器数量
     */
    public getTimerCount(): number {
        return this._timers.size;
    }

    /**
     * 获取当前倒计时数量
     */
    public getCountdownCount(): number {
        return this._countdowns.size;
    }
}
