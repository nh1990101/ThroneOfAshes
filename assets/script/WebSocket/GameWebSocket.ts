import { _decorator, Component, director, isValid, log, macro, Node, Scheduler, sys, warn } from 'cc';
import { getDeviceUUID } from '../Common/fn';
import { GlobalData } from '../Common/GlobalData';
import { EventManager } from '../Common/EventManager';
const { ccclass, property } = _decorator;

@ccclass('GameWebSocket')
export class GameWebSocket extends EventTarget {
    private static _instance: GameWebSocket;
    static get instance(): GameWebSocket {
        if (!this._instance) {
            this._instance = new GameWebSocket();
        }
        return this._instance
    }
    static EventType = {
        error: "error",
        onclose: "onclose"
    }

    /* 连接地址 */
    url = "ws://1.117.60.180:17001/ws"
    // url = `ws://117.50.201.88/38080`

    token = ""

    ws: WebSocket = null

    /**是否主动断开连接 */
    isDiscnnect: boolean = false;
    // 是否正重连中
    private isReconnecting: boolean = false;
    /**重连次数 */
    reconnectTimeoutCnt: number = 0;
    reconnectMaxCnt: number = 3;


    /* 定时器 */
    schedule(callback: (dt?: number) => void, interval: number, repeat?, delay?) {

        var scheduler = director.getScheduler();
        Scheduler.enableForTarget(scheduler)

        interval = interval || 0;
        repeat = isNaN(repeat) ? macro.REPEAT_FOREVER : repeat;
        delay = delay || 0;

        var paused = scheduler.isTargetPaused(scheduler);

        scheduler.schedule(callback, scheduler, interval, repeat, delay, paused);
    }
    /* 定时器 */
    scheduleOnce(callback: (dt?: number) => void, delay: number) {
        this.schedule(callback, 0, 0, delay);
    }
    /* 取消定时器 */
    unschedule(callback_fn: Function) {
        if (!callback_fn)
            return;
        var scheduler = director.getScheduler();
        Scheduler.enableForTarget(scheduler)
        scheduler.unschedule(callback_fn, scheduler);
    }

    /* 异步函数，定时检查, 直到满足条件 */
    until(until: Function, interval?: number, timeout?) {
        return new Promise(callback => {
            let ret = until()
            if (ret) {
                callback(ret)
                return
            }
            let begin = sys.now()
            let _callback = null
            _callback = () => {
                if (timeout) {
                    if (sys.now() - begin >= timeout * 1000) {
                        callback(false)
                        return
                    }
                }
                let ret = until()
                if (ret) {
                    this.unschedule(_callback)
                    callback(ret)
                }
            }
            this.schedule(_callback, interval || 0.3)
        })
    }

    /* 异步函数，一旦事件触发 */
    forOnce(target, evtName, timeout?) {
        return new Promise(callback => {
            if (timeout) {
                this.scheduleOnce(callback, timeout)
            }
            target.once(evtName, callback, this)
        })
    }

    /* 异步函数，延迟调用 */
    delay(interval) {
        return new Promise(callback => {
            this.scheduleOnce(callback, interval)
        })
    }

    // on<T extends EventListenerOrEventListenerObject>(event:any, callback:T, target?:any):EventListenerOrEventListenerObject{
    //     if (!target) {
    //         return super.addEventListener(event, callback, target)
    //     }
    //     super.on(event, (...args)=>{
    //         if (isValid(target)) {
    //             callback.apply(target, args)
    //         }
    //     }, target)
    //     return callback
    // }

    connect() {
        return new Promise(resolve => {
            let ws = new WebSocket(this.url)
            // }
            log("connect", this.url)
            ws.binaryType = 'arraybuffer';
            this.ws = ws
            ws.onopen = () => {
                log("onopen", this)
                this.schedule(this.keepHeart, 5)
                resolve(true)
            }
            ws.onerror = () => {
                log("error", this)
            }
            ws.onmessage = (event: MessageEvent) => {
                // cc.log("onmessage", data)
                this._onMessage(event)
            }
            ws.onclose = (ev) => {
                log("onclose", this)
                if (!this.isDiscnnect) {
                    this.dispatchEvent(new Event(GameWebSocket.EventType.onclose))
                }
                this.unschedule(this.keepHeart)
                if (this.ws) {
                    this.ws.onopen = null
                    this.ws.onclose = null
                    this.ws.onerror = null
                    this.ws.onmessage = null
                    this.ws = null
                }
                resolve(false)
            }
        })
    }
    async login(token = "") {
        if (this.ws) {
            var uiid = getDeviceUUID()
            if (token) {
                uiid = token;
            }
            console.log("uuid=" + uiid)
            // uiid = "96678587-7145-48c4-9075-b4b20edad690"
            // todo 对接后重新对接协议
            // let loginRet = await this.sendMsg(CmdLogin, <LoginReq>{ login_token: uiid, login_type: "guest" })
            // log("loginRet", loginRet)
        }
    }

    keepHeart() {
        // console.cc.log("keepHeart = ", this.url);
        // todo 对接后重新对接协议
        // this.sendMsg(CmdHeartbeat, { ts: GlobalData.serverDate.getTime() })
    }
    // 重连状态函数
    clearReconnectingState() {
        this.isReconnecting = false;
    }
    SetReconnectingState() {
        this.isReconnecting = true;
    }
    getReconnecting() {
        return this.isReconnecting;
    }
    // 手动断开网络
    discnnect() {
        if (this.ws) {
            this.reconnectTimeoutCnt = 0;
            this.isDiscnnect = true;
            this.ws.close();
        } else {
            console.log("---------- this.ws is null ---------");
        }
    }

    async sendMsg(msgName: string, msg: any, code: number | string = 0): Promise<any> {
        return new Promise((resolve, reject) => {
            // log("sendMsg", msgName, msg)
            let data = {
                cmd: msgName,
                data: msg,
                code: code,
            }
            this.ws.send(JSON.stringify(data));

            const handler = (event: Event) => {
                const customEvent = event as CustomEvent;
                const data = customEvent.detail?.data;
                const code = customEvent.detail?.code;
                let cmd = msgName
                if (data) {
                    if (resolve) {
                        resolve(data)
                    }
                } else {
                    warn("error", code, this.ws.url, msgName);
                    // app.showServiceTips(code, param);
                    if (reject) {
                        reject({ cmd, code });
                    }
                }
                this.removeEventListener(msgName, handler);
            };
            this.addEventListener(msgName, handler, { once: true });
        })
    }

    private _onMessage(event: MessageEvent) {
        let reply = JSON.parse(event.data);
        let cmd = reply.cmd
        let code = reply.code
        if (code != 0) {
            throw new Error(`cmd:${cmd} code:${code}`)
        }
        let data = reply.data
        this.dispatchEvent(new CustomEvent(cmd, { detail: { data, code } }))

        //todo 对接后重新对错误提示
        // if (code != CodeSuccess) {
        //     var serverNotice = LangManager.instance.getStringById(1000 + code)
        //     if (!serverNotice) {
        //         serverNotice = "错误码：" + code
        //     }
        //     // UIMananger.instance.showFlyNotice(serverNotice ? serverNotice : code)
        //     UIMananger.instance.showWin("NoticeWin", serverNotice)
        // }
        EventManager.Instance.dispatch(cmd, data, code)
    }

    isOnline() {
        return this.ws && this.ws.readyState
    }

}


