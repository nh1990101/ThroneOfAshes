import { _decorator, log, warn } from 'cc';
import { GameWebSocket } from './GameWebSocket';
import { ProtoMsgId, ProtoMsgName } from './ProtoConfig';
import { pb } from '../../libs/proto';
// import { pb } from 'db://assets/libs/proto';

const { ccclass } = _decorator;

/**
 * Proto网络管理器
 * 负责处理proto数据的编解码、请求响应管理、推送消息分发
 */
@ccclass('ProtoNetworkMgr')
export class ProtoNetworkMgr {
    private static _instance: ProtoNetworkMgr;

    static get instance(): ProtoNetworkMgr {
        if (!this._instance) {
            this._instance = new ProtoNetworkMgr();
        }
        return this._instance;
    }

    private ws: GameWebSocket;

    /** 请求映射表：序列号 -> Promise回调 */
    private requestMap: Map<number, {
        resolve: Function,
        reject: Function,
        timer: any,
        msgId: number
    }> = new Map();

    /** 消息序列号 */
    private msgSeq: number = 0;

    /** 请求超时时间（毫秒） */
    private requestTimeout: number = 10000;

    /** 推送消息处理器：消息ID -> 回调函数列表 */
    private pushHandlers: Map<number, Function[]> = new Map();

    /** 是否已初始化 */
    private initialized: boolean = false;

    private constructor() {
        this.ws = GameWebSocket.instance;
    }

    /**
     * 初始化网络管理器
     */
    init() {
        if (this.initialized) {
            return;
        }

        // 拦截WebSocket的消息处理
        this.bindWebSocketEvents();
        this.initialized = true;

        log('[ProtoNetworkMgr] 初始化完成');
    }

    /**
     * 绑定WebSocket事件
     */
    private bindWebSocketEvents() {
        // 保存原始的onmessage处理
        const originalOnMessage = this.ws['_onMessage'].bind(this.ws);

        // 重写WebSocket消息处理
        this.ws['_onMessage'] = (event: MessageEvent) => {
            // 判断是二进制数据还是文本数据
            if (event.data instanceof ArrayBuffer) {
                // Proto二进制消息
                this.onProtoMessage(event.data);
            } else {
                // 原始JSON消息，使用原来的处理逻辑
                originalOnMessage(event);
            }
        };
    }

    /**
     * 连接服务器
     */
    async connect(): Promise<boolean> {
        return await this.ws.connect() as boolean;
    }

    /**
     * 断开连接
     */
    disconnect() {
        // 清理所有待处理的请求
        this.requestMap.forEach((request) => {
            clearTimeout(request.timer);
            request.reject(new Error('连接已断开'));
        });
        this.requestMap.clear();

        this.ws.discnnect();
    }

    /**
     * 检查是否在线
     */
    isOnline() {
        return this.ws.isOnline();
    }

    /**
     * 发送Proto请求（返回Promise）
     * @param msgId 消息ID
     * @param data Proto消息数据
     * @param timeoutMs 超时时间（毫秒），不传则使用默认值
     * @returns Promise<响应数据>
     */
    sendRequest<T = any>(msgId: number, data: any, timeoutMs?: number): Promise<T> {
        return new Promise((resolve, reject) => {
            try {
                // 检查连接状态
                if (!this.isOnline()) {
                    reject(new Error('网络未连接'));
                    return;
                }

                // 生成序列号
                const seq = ++this.msgSeq;

                // 编码Proto数据
                const protoData = this.encodeProtoMessage(msgId, data);
                if (!protoData) {
                    reject(new Error(`消息编码失败: MsgId=${msgId}`));
                    return;
                }

                // 封装消息：[4字节总长度] + [4字节消息ID] + [4字节序列号] + [Proto数据]
                const totalLen = 4 + 4 + 4 + protoData.length;
                const buffer = new ArrayBuffer(totalLen);
                const view = new DataView(buffer);

                // 写入总长度（大端字节序）
                view.setUint32(0, totalLen - 4, false);
                // 写入消息ID
                view.setUint32(4, msgId, false);
                // 写入序列号
                view.setUint32(8, seq, false);
                // 写入Proto数据
                const uint8View = new Uint8Array(buffer);
                uint8View.set(protoData, 12);

                // 发送
                this.ws.ws.send(buffer);

                log(`[ProtoNetworkMgr] 发送请求: ${ProtoMsgName[msgId] || msgId}, Seq=${seq}`);

                // 设置超时定时器
                const timeout = timeoutMs || this.requestTimeout;
                const timer = setTimeout(() => {
                    this.requestMap.delete(seq);
                    reject(new Error(`请求超时: ${ProtoMsgName[msgId] || msgId}, Seq=${seq}`));
                }, timeout);

                // 保存回调
                this.requestMap.set(seq, { resolve, reject, timer, msgId });

            } catch (error) {
                warn('[ProtoNetworkMgr] 发送请求失败:', error);
                reject(error);
            }
        });
    }

    /**
     * 编码Proto消息
     */
    private encodeProtoMessage(msgId: number, data: any): Uint8Array | null {
        try {
            switch (msgId) {
            case ProtoMsgId.GMCMDDesc:
                return pb.GMCMDDesc.encode(data).finish();

            case ProtoMsgId.NtfGMCMDInit:
                return pb.NtfGMCMDInit.encode(data).finish();

            case ProtoMsgId.UseGMCMDReq:
                return pb.UseGMCMDReq.encode(data).finish();

            case ProtoMsgId.UseGMCMDResp:
                return pb.UseGMCMDResp.encode(data).finish();

            case ProtoMsgId.HelloReq:
                return pb.HelloReq.encode(data).finish();

            case ProtoMsgId.HelloResp:
                return pb.HelloResp.encode(data).finish();

                default:
                    warn(`未知的消息ID: ${msgId}`);
                    return null;
            }
        } catch (error) {
            warn(`Proto编码失败: MsgId=${msgId}`, error);
            return null;
        }
    }
     


    /**
     * 解码Proto消息
     */
    private decodeProtoMessage(msgId: number, protoData: Uint8Array): any | null {
        try {
            switch (msgId) {
            case ProtoMsgId.GMCMDDesc:
                return pb.GMCMDDesc.decode(protoData);

            case ProtoMsgId.NtfGMCMDInit:
                return pb.NtfGMCMDInit.decode(protoData);

            case ProtoMsgId.UseGMCMDReq:
                return pb.UseGMCMDReq.decode(protoData);

            case ProtoMsgId.UseGMCMDResp:
                return pb.UseGMCMDResp.decode(protoData);

            case ProtoMsgId.HelloReq:
                return pb.HelloReq.decode(protoData);

            case ProtoMsgId.HelloResp:
                return pb.HelloResp.decode(protoData);

                default:
                    warn(`未知的消息ID: ${msgId}`);
                    return null;
            }
        } catch (error) {
            warn(`Proto解码失败: MsgId=${msgId}`, error);
            return null;
        }
    }
     



    /**
     * 处理接收到的Proto消息
     */
    private onProtoMessage(data: ArrayBuffer) {
        try {
            // 检查消息最小长度
            if (data.byteLength < 12) {
                warn('[ProtoNetworkMgr] 消息长度不足');
                return;
            }

            const view = new DataView(data);

            // 解析消息头
            const totalLen = view.getUint32(0, false);  // 总长度
            const msgId = view.getUint32(4, false);     // 消息ID
            const seq = view.getUint32(8, false);       // 序列号

            // 验证长度
            if (totalLen + 4 !== data.byteLength) {
                warn('[ProtoNetworkMgr] 消息长度不匹配');
                return;
            }

            // 提取Proto数据
            const protoData = new Uint8Array(data, 12);

            // 解码Proto
            const decodedData = this.decodeProtoMessage(msgId, protoData);
            if (!decodedData) {
                return;
            }

            log(`[ProtoNetworkMgr] 收到消息: ${ProtoMsgName[msgId] || msgId}, Seq=${seq}`);

            // 判断是响应消息还是推送消息
            if (seq > 0 && this.requestMap.has(seq)) {
                // 响应消息：匹配请求
                const request = this.requestMap.get(seq);
                clearTimeout(request.timer);
                this.requestMap.delete(seq);
                request.resolve(decodedData);
            } else {
                // 推送消息：触发事件（seq=0表示服务器主动推送）
                this.dispatchPushMessage(msgId, decodedData);
            }

        } catch (error) {
            warn('[ProtoNetworkMgr] Proto消息处理失败:', error);
        }
    }

    /**
     * 注册推送消息处理器
     * @param msgId 消息ID
     * @param handler 处理函数
     * @param target 函数绑定的对象（可选）
     */
    on(msgId: number, handler: Function, target?: any) {
        if (!this.pushHandlers.has(msgId)) {
            this.pushHandlers.set(msgId, []);
        }

        const wrappedHandler = target ? handler.bind(target) : handler;
        this.pushHandlers.get(msgId).push(wrappedHandler);

        log(`[ProtoNetworkMgr] 注册推送监听: ${ProtoMsgName[msgId] || msgId}`);
    }

    /**
     * 移除推送消息处理器
     * @param msgId 消息ID
     * @param handler 处理函数
     */
    off(msgId: number, handler: Function) {
        if (!this.pushHandlers.has(msgId)) return;

        const handlers = this.pushHandlers.get(msgId);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
            log(`[ProtoNetworkMgr] 移除推送监听: ${ProtoMsgName[msgId] || msgId}`);
        }
    }

    /**
     * 派发推送消息
     */
    private dispatchPushMessage(msgId: number, data: any) {
        if (this.pushHandlers.has(msgId)) {
            const handlers = this.pushHandlers.get(msgId);
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    warn(`[ProtoNetworkMgr] 推送消息处理器执行失败: ${ProtoMsgName[msgId] || msgId}`, error);
                }
            });
        } else {
            log(`[ProtoNetworkMgr] 收到未处理的推送消息: ${ProtoMsgName[msgId] || msgId}`);
        }
    }

    /**
     * 获取当前待处理的请求数量
     */
    getPendingRequestCount(): number {
        return this.requestMap.size;
    }

    /**
     * 清理所有推送监听器
     */
    clearAllHandlers() {
        this.pushHandlers.clear();
        log('[ProtoNetworkMgr] 已清理所有推送监听器');
    }
}
