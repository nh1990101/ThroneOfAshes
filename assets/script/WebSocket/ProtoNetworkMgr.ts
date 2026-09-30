import { _decorator, warn, log, director, Scheduler, macro, sys } from 'cc';
import { pb } from './proto/ProtoDefined';
import type { pb as pbType } from './proto/ProtoDefined.d';
import { ProtoRequestType, ProtoServerMessageType } from './ProtoMessageType';
import { EventManager } from '../Common/EventManager';

const { ccclass } = _decorator;

/**
 * 协议配置接口
 */
interface IProtoConfig {
    reqName: string;      // 请求消息名
    reqType: any;         // 请求消息类型
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

    // 消息队列
    private messageQueue: Array<{ data: Uint8Array }> = [];

    // 协议配置映射
    private protoConfig: Map<string, IProtoConfig> = new Map();

    private constructor() {
        super();
        this.initProtoConfig();
    }

    /**
     * 初始化协议配置
     * 自动扫描并注册所有协议
     */
    private initProtoConfig() {
        // 自动注册所有请求协议
        for (const reqName in ProtoRequestType) {
            const reqType = (pb as any)[reqName];
            if (reqType) {
                this.registerProto(reqName, reqType);
                log(`[ProtoNetwork] Auto registered proto: ${reqName}`);
            } else {
                warn(`[ProtoNetwork] Request type not found: ${reqName}`);
            }
        }

        log('[ProtoNetwork] Protocol initialization completed');
    }

    /**
     * 注册请求协议
     */
    registerProto(reqName: string, reqType: any) {
        this.protoConfig.set(reqName, {
            reqName,
            reqType,
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
     * 发送协议消息（单向发送，不等待响应）
     * @param reqName 请求消息类型（使用枚举）
     * @param data 请求数据
     */
    send<TReq>(reqName: ProtoRequestType, data: TReq): void {
        const config = this.protoConfig.get(reqName);
        if (!config) {
            warn(`[ProtoNetwork] Unknown proto: ${reqName}`);
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
            return;
        }

        // 发送消息
        try {
            this.ws.send(packet);
            log(`[ProtoNetwork] Sent message: ${reqName}`, data);
        } catch (error) {
            warn('[ProtoNetwork] Failed to send message:', error);
        }
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

            // 直接从pb命名空间查找消息类型（响应和通知都在这里）
            const protoType = (pb as any)[msgName];

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

            // 触发事件监听（所有服务器消息都通过事件系统分发）
            EventManager.Instance.dispatch(msgName, { detail: plainObject });

        } catch (error) {
            warn('[ProtoNetwork] Failed to handle message:', error);
        }
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
                this.ws.send(msg.data.buffer as ArrayBuffer);
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
    }

    /**
     * 发送心跳
     */
    private sendHeartbeat() {
        // 这里发送心跳消息,需要根据实际协议修改
        // 示例: 使用HelloReq作为心跳
        log('[ProtoNetwork] Sending heartbeat...');

        // 发送心跳请求
        this.send<pbType.IHelloReq>(ProtoRequestType.HelloReq, {
            content: 'heartbeat'
        });
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
    setHeartbeatConfig(interval: number) {
        this.heartbeatInterval = interval;

        if (this.isConnected) {
            this.startHeartbeat();
        }
    }
}
