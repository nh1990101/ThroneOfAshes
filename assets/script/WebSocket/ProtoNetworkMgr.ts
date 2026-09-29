import { _decorator, warn, log, director, Scheduler, macro, sys } from 'cc';
import { pb } from './proto/ProtoDefined';

const { ccclass } = _decorator;

/**
 * 消息回调接口
 */
interface IMessageCallback {
    resolve: (data: any) => void;
    reject: (error: any) => void;
    timeout?: number;
    timer?: any;
}

/**
 * 协议配置接口
 */
interface IProtoConfig {
    reqName: string;      // 请求消息名
    respName: string;     // 响应消息名
    reqType: any;         // 请求消息类型
    respType: any;        // 响应消息类型
}

/**
 * Protobuf网络管理类
 * 提供基于protobuf的WebSocket通信功能
 */
@ccclass('ProtoNetworkMgr')
export class ProtoNetworkMgr extends EventTarget {
    private static _instance: ProtoNetworkMgr;

    static get instance(): ProtoNetworkMgr {
        if (!this._instance) {
            this._instance = new ProtoNetworkMgr();
        }
        return this._instance;
    }

    // 事件类型
    static EventType = {
        CONNECTED: 'connected',
        DISCONNECTED: 'disconnected',
        ERROR: 'error',
        RECONNECTING: 'reconnecting',
    };

    // WebSocket连接
    private ws: WebSocket | null = null;

    // 连接配置
    private url: string = '';
    private token: string = '';

    // 连接状态
    private isConnected: boolean = false;
    private isReconnecting: boolean = false;
    private isManualDisconnect: boolean = false;

    // 重连配置
    private reconnectCount: number = 0;
    private maxReconnectCount: number = 5;
    private reconnectDelay: number = 3000; // 3秒

    // 心跳配置
    private heartbeatInterval: number = 30000; // 30秒
    private heartbeatTimer: any = null;
    private heartbeatTimeoutTimer: any = null;
    private heartbeatTimeout: number = 10000; // 10秒超时

    // 消息队列
    private messageCallbacks: Map<string, IMessageCallback[]> = new Map();
    private messageQueue: Array<{ data: Uint8Array }> = [];

    // 协议配置映射
    private protoConfig: Map<string, IProtoConfig> = new Map();

    // 请求超时时间
    private defaultTimeout: number = 30000; // 30秒

    private constructor() {
        super();
        this.initProtoConfig();
    }

    /**
     * 初始化协议配置
     * 在这里注册所有的请求-响应协议对
     */
    private initProtoConfig() {
        // 示例: 注册Hello协议
        this.registerProto('HelloReq', 'HelloResp', pb.HelloReq, pb.HelloResp);
        this.registerProto('UseGMCMDReq', 'UseGMCMDResp', pb.UseGMCMDReq, pb.UseGMCMDResp);

        // 注册通知类型消息(只有服务器推送,没有请求)
        this.registerNotify('NtfGMCMDInit', pb.NtfGMCMDInit);
    }

    /**
     * 注册请求-响应协议对
     */
    registerProto(reqName: string, respName: string, reqType: any, respType: any) {
        this.protoConfig.set(reqName, {
            reqName,
            respName,
            reqType,
            respType,
        });
    }

    /**
     * 注册服务器通知消息
     */
    registerNotify(notifyName: string, notifyType: any) {
        // 通知消息没有请求,只监听响应
        this.addEventListener(notifyName, (event: CustomEvent) => {
            log(`[ProtoNetwork] Received notify: ${notifyName}`, event.detail);
        });
    }

    /**
     * 连接服务器
     */
    connect(url: string, token?: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.isConnected && this.ws) {
                log('[ProtoNetwork] Already connected');
                resolve(true);
                return;
            }

            this.url = url;
            this.token = token || '';
            this.isManualDisconnect = false;

            try {
                this.ws = new WebSocket(url);
                this.ws.binaryType = 'arraybuffer';

                this.ws.onopen = () => {
                    log('[ProtoNetwork] Connected to', url);
                    this.isConnected = true;
                    this.reconnectCount = 0;
                    this.isReconnecting = false;

                    this.startHeartbeat();
                    this.dispatchEvent(new Event(ProtoNetworkMgr.EventType.CONNECTED));

                    // 发送排队的消息
                    this.flushMessageQueue();

                    resolve(true);
                };

                this.ws.onerror = (error) => {
                    warn('[ProtoNetwork] WebSocket error:', error);
                    this.dispatchEvent(new CustomEvent(ProtoNetworkMgr.EventType.ERROR, { detail: error }));
                };

                this.ws.onmessage = (event: MessageEvent) => {
                    this.handleMessage(event);
                };

                this.ws.onclose = (event) => {
                    log('[ProtoNetwork] Connection closed', event.code, event.reason);
                    this.handleDisconnect();
                    resolve(false);
                };

            } catch (error) {
                warn('[ProtoNetwork] Failed to connect:', error);
                this.dispatchEvent(new CustomEvent(ProtoNetworkMgr.EventType.ERROR, { detail: error }));
                resolve(false);
            }
        });
    }

    /**
     * 处理断开连接
     */
    private handleDisconnect() {
        this.isConnected = false;
        this.stopHeartbeat();

        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws = null;
        }

        this.dispatchEvent(new Event(ProtoNetworkMgr.EventType.DISCONNECTED));

        // 清理所有待处理的回调
        this.rejectAllPendingMessages('Connection closed');

        // 如果不是主动断开,尝试重连
        if (!this.isManualDisconnect && this.reconnectCount < this.maxReconnectCount) {
            this.reconnect();
        }
    }

    /**
     * 重连
     */
    private reconnect() {
        if (this.isReconnecting) {
            return;
        }

        this.isReconnecting = true;
        this.reconnectCount++;

        log(`[ProtoNetwork] Reconnecting... (${this.reconnectCount}/${this.maxReconnectCount})`);
        this.dispatchEvent(new CustomEvent(ProtoNetworkMgr.EventType.RECONNECTING, {
            detail: { count: this.reconnectCount, max: this.maxReconnectCount }
        }));

        setTimeout(() => {
            this.connect(this.url, this.token);
        }, this.reconnectDelay);
    }

    /**
     * 手动断开连接
     */
    disconnect() {
        this.isManualDisconnect = true;
        this.reconnectCount = 0;

        if (this.ws) {
            this.ws.close();
        }
    }

    /**
     * 发送协议消息
     */
    async send<TReq, TResp>(reqName: string, data: TReq, timeout?: number): Promise<TResp> {
        return new Promise((resolve, reject) => {
            const config = this.protoConfig.get(reqName);
            if (!config) {
                reject(new Error(`Unknown proto: ${reqName}`));
                return;
            }

            // 编码消息
            const message = config.reqType.create(data);
            const buffer = config.reqType.encode(message).finish();

            // 添加消息头: [消息名长度(2字节)][消息名][消息体]
            const nameBuffer = new TextEncoder().encode(reqName);
            const packet = new Uint8Array(2 + nameBuffer.length + buffer.length);

            // 写入消息名长度
            packet[0] = (nameBuffer.length >> 8) & 0xFF;
            packet[1] = nameBuffer.length & 0xFF;

            // 写入消息名
            packet.set(nameBuffer, 2);

            // 写入消息体
            packet.set(buffer, 2 + nameBuffer.length);

            // 如果未连接,加入队列
            if (!this.isConnected || !this.ws) {
                warn(`[ProtoNetwork] Not connected, message queued: ${reqName}`);
                this.messageQueue.push({ data: packet });
                reject(new Error('Not connected'));
                return;
            }

            // 注册回调
            const respName = config.respName;
            const callback: IMessageCallback = {
                resolve: (respData: any) => {
                    if (callback.timer) {
                        clearTimeout(callback.timer);
                    }
                    resolve(respData as TResp);
                },
                reject: (error: any) => {
                    if (callback.timer) {
                        clearTimeout(callback.timer);
                    }
                    reject(error);
                },
                timeout: timeout || this.defaultTimeout,
            };

            // 设置超时
            callback.timer = setTimeout(() => {
                this.removeMessageCallback(respName, callback);
                callback.reject(new Error(`Request timeout: ${reqName}`));
            }, callback.timeout);

            // 添加到回调列表
            if (!this.messageCallbacks.has(respName)) {
                this.messageCallbacks.set(respName, []);
            }
            this.messageCallbacks.get(respName)!.push(callback);

            // 发送消息
            try {
                this.ws.send(packet);
                log(`[ProtoNetwork] Sent message: ${reqName}`, data);
            } catch (error) {
                this.removeMessageCallback(respName, callback);
                callback.reject(error);
            }
        });
    }

    /**
     * 处理收到的消息
     */
    private handleMessage(event: MessageEvent) {
        try {
            const buffer = new Uint8Array(event.data);

            // 解析消息头
            const nameLength = (buffer[0] << 8) | buffer[1];
            const nameBuffer = buffer.slice(2, 2 + nameLength);
            const msgName = new TextDecoder().decode(nameBuffer);
            const msgBuffer = buffer.slice(2 + nameLength);

            log(`[ProtoNetwork] Received message: ${msgName}`);

            // 查找对应的协议配置
            let protoType: any = null;

            // 查找是否是响应消息
            for (const [reqName, config] of this.protoConfig.entries()) {
                if (config.respName === msgName) {
                    protoType = config.respType;
                    break;
                }
            }

            // 如果不是响应,可能是通知消息
            if (!protoType) {
                // 尝试直接从pb命名空间查找
                protoType = (pb as any)[msgName];
            }

            if (!protoType) {
                warn(`[ProtoNetwork] Unknown message type: ${msgName}`);
                return;
            }

            // 解码消息
            const message = protoType.decode(msgBuffer);
            const plainObject = protoType.toObject(message, {
                longs: String,
                enums: String,
                bytes: String,
                defaults: true,
            });

            // 触发回调
            this.triggerMessageCallback(msgName, plainObject);

            // 触发事件监听
            this.dispatchEvent(new CustomEvent(msgName, { detail: plainObject }));

        } catch (error) {
            warn('[ProtoNetwork] Failed to handle message:', error);
        }
    }

    /**
     * 触发消息回调
     */
    private triggerMessageCallback(msgName: string, data: any) {
        const callbacks = this.messageCallbacks.get(msgName);
        if (callbacks && callbacks.length > 0) {
            // 使用FIFO方式处理回调
            const callback = callbacks.shift()!;
            callback.resolve(data);

            // 如果没有更多回调,移除映射
            if (callbacks.length === 0) {
                this.messageCallbacks.delete(msgName);
            }
        }
    }

    /**
     * 移除消息回调
     */
    private removeMessageCallback(msgName: string, callback: IMessageCallback) {
        const callbacks = this.messageCallbacks.get(msgName);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
            if (callbacks.length === 0) {
                this.messageCallbacks.delete(msgName);
            }
        }
    }

    /**
     * 拒绝所有待处理的消息
     */
    private rejectAllPendingMessages(reason: string) {
        for (const [msgName, callbacks] of this.messageCallbacks.entries()) {
            for (const callback of callbacks) {
                if (callback.timer) {
                    clearTimeout(callback.timer);
                }
                callback.reject(new Error(reason));
            }
        }
        this.messageCallbacks.clear();
    }

    /**
     * 发送队列中的消息
     */
    private flushMessageQueue() {
        if (this.messageQueue.length === 0) {
            return;
        }

        log(`[ProtoNetwork] Flushing message queue: ${this.messageQueue.length} messages`);

        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift()!;
            if (this.ws && this.isConnected) {
                this.ws.send(msg.data);
            }
        }
    }

    /**
     * 开始心跳
     */
    private startHeartbeat() {
        this.stopHeartbeat();

        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
        }, this.heartbeatInterval);
    }

    /**
     * 停止心跳
     */
    private stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        if (this.heartbeatTimeoutTimer) {
            clearTimeout(this.heartbeatTimeoutTimer);
            this.heartbeatTimeoutTimer = null;
        }
    }

    /**
     * 发送心跳
     */
    private async sendHeartbeat() {
        // 这里发送心跳消息,需要根据实际协议修改
        // 示例: 使用HelloReq作为心跳
        try {
            log('[ProtoNetwork] Sending heartbeat...');

            // 设置心跳超时
            this.heartbeatTimeoutTimer = setTimeout(() => {
                warn('[ProtoNetwork] Heartbeat timeout, reconnecting...');
                this.handleDisconnect();
            }, this.heartbeatTimeout);

            // 发送心跳请求
            await this.send<pb.IHelloReq, pb.IHelloResp>('HelloReq', {
                content: 'heartbeat'
            });

            // 清除超时定时器
            if (this.heartbeatTimeoutTimer) {
                clearTimeout(this.heartbeatTimeoutTimer);
                this.heartbeatTimeoutTimer = null;
            }

            log('[ProtoNetwork] Heartbeat success');
        } catch (error) {
            warn('[ProtoNetwork] Heartbeat failed:', error);
        }
    }

    /**
     * 获取连接状态
     */
    isOnline(): boolean {
        return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * 获取重连状态
     */
    getReconnecting(): boolean {
        return this.isReconnecting;
    }

    /**
     * 设置重连配置
     */
    setReconnectConfig(maxCount: number, delay: number) {
        this.maxReconnectCount = maxCount;
        this.reconnectDelay = delay;
    }

    /**
     * 设置心跳配置
     */
    setHeartbeatConfig(interval: number, timeout: number) {
        this.heartbeatInterval = interval;
        this.heartbeatTimeout = timeout;

        if (this.isConnected) {
            this.startHeartbeat();
        }
    }

    /**
     * 设置默认超时时间
     */
    setTimeout(timeout: number) {
        this.defaultTimeout = timeout;
    }
}
