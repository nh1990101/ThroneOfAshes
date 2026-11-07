import { _decorator, warn, log } from 'cc';
import { pbType as protoCodecs } from './proto/ProtoDefined';
import type { pbType } from './proto/ProtoDefined.d';
import { ProtoRequestType, ProtoServerMessageType } from './ProtoMessageType';
import { ProtoConfig } from './ProtoConfig';
import type { IProtoRoute } from './ProtoConfig';
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
        RESULT_ERROR: 'result-error',
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

    // 消息序号从 1 开始递增，断线重连不重置，队列消息保留原序号。
    private messageSN: number = 0;

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
        for (const reqName of Object.values(ProtoRequestType)) {
            const reqType = this.findProtoType(reqName);
            if (reqType) {
                this.registerProto(reqName, reqType);
                log(`[ProtoNetwork] Auto registered proto: ${reqName}`);
            } else {
                warn(`[ProtoNetwork] Request type not found: ${reqName}`);
            }
        }

        log('[ProtoNetwork] Protocol initialization completed');
    }

    /** 路由保留源消息标识，编解码类型统一从 pbType 命名空间查找。 */
    private findProtoType(messageName: string): any {
        const typeName = messageName.split('.').filter(Boolean).pop();
        if (!typeName || !Object.prototype.hasOwnProperty.call(protoCodecs, typeName)) return null;
        const protoType = (protoCodecs as any)[typeName];
        return protoType && typeof protoType.create === 'function'
            && typeof protoType.encode === 'function' && typeof protoType.decode === 'function'
            ? protoType : null;
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

    /** 检查路由是否能完整写入 int32 指令 ID 和 byte 模块号。 */
    private isValidRoute(route: IProtoRoute | null | undefined): route is IProtoRoute {
        return !!route && Number.isInteger(route.commandId)
            && route.commandId >= -0x80000000 && route.commandId <= 0x7FFFFFFF
            && Number.isInteger(route.moduleId) && route.moduleId >= 0 && route.moduleId <= 0xFF;
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

                    // 先发送旧队列，再允许连接监听者发送新消息，保持 SN 顺序。
                    this.flushMessageQueue();
                    this.dispatchEvent(new Event(ProtoNetworkMgr.EventType.CONNECTED));

                    resolve(true);
                };

                this.ws.onerror = (error) => {
                    warn('[ProtoNetwork] WebSocket error:', error);
                    this.dispatchEvent(new CustomEvent(ProtoNetworkMgr.EventType.ERROR, { detail: error }));
                };

                this.ws.onmessage = (event: MessageEvent) => {
                    log('[ProtoNetwork] 服务器返回:', event.data);
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

        const route = ProtoConfig.PROTO_ROUTES[reqName];
        if (!this.isValidRoute(route)) {
            warn(`[ProtoNetwork] Missing or invalid route for ${reqName}, configure ProtoConfig.PROTO_ROUTES`);
            return;
        }
        if (this.messageSN >= 0x7FFFFFFF) {
            warn('[ProtoNetwork] Message SN exceeded int32 range');
            return;
        }

        // 编码消息
        const message = config.reqType.create(data);
        const buffer = config.reqType.encode(message).finish();

        const { HEADER_LENGTH, MESSAGE_HEADER_LENGTH, HASH_LENGTH, IDENTIFIER, FORMAT, STATE } = ProtoConfig.PROTO;
        const bodyOffset = HEADER_LENGTH + MESSAGE_HEADER_LENGTH;
        const bodyLength = MESSAGE_HEADER_LENGTH + buffer.length + HASH_LENGTH;
        const packet = new Uint8Array(HEADER_LENGTH + bodyLength);
        const view = new DataView(packet.buffer);

        // 8 字节包头，长度字段包含信息头、protobuf 和尾部哈希，不包含包头自身。
        view.setUint8(0, IDENTIFIER.length);
        for (let i = 0; i < IDENTIFIER.length; i++) {
            view.setUint8(1 + i, IDENTIFIER.charCodeAt(i));
        }
        view.setInt32(4, bodyLength, false);

        // 14 字节信息头，protobuf 数据从偏移 22 开始。
        view.setUint8(HEADER_LENGTH, FORMAT);
        view.setInt32(HEADER_LENGTH + 1, STATE, false);
        view.setInt32(HEADER_LENGTH + 5, ++this.messageSN, false);
        view.setInt32(HEADER_LENGTH + 9, route.commandId, false);
        view.setUint8(HEADER_LENGTH + 13, route.moduleId);
        packet.set(buffer, bodyOffset);
        // BPHash 输入为服务端包体去掉哈希：14 字节信息头 + protobuf。
        const hashContent = packet.subarray(HEADER_LENGTH, packet.length - HASH_LENGTH);
        const hashCode = this.BPHash(hashContent, hashContent.length);
        view.setInt32(bodyOffset + buffer.length, hashCode, false);

        // 如果未连接,加入队列
        if (!this.isConnected || !this.ws) {
            warn(`[ProtoNetwork] Not connected, message queued: ${reqName}`);
            this.messageQueue.push({ data: packet });
            return;
        }

        // 发送消息
        try {
            this.ws.send(packet);
            // packetLen=${packet.length},bodyLength=${bodyLength},protobufLength=${buffer.length},hashCode=${hashCode}
            log(`%c[ProtoNetwork] Sent message: ${reqName}(${route.moduleId}-${route.commandId})`, 'color: #ffd000', data);
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
            const { HEADER_LENGTH, MESSAGE_HEADER_LENGTH, HASH_LENGTH, IDENTIFIER, FORMAT } = ProtoConfig.PROTO;
            const bodyOffset = HEADER_LENGTH + MESSAGE_HEADER_LENGTH;
            if (buffer.length < bodyOffset + HASH_LENGTH) {
                warn(`[ProtoNetwork] Packet too short: ${buffer.length}`);
                return;
            }
            const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

            // 校验包标识和完整包体长度（信息头 + protobuf + 哈希）。
            if (view.getUint8(0) !== IDENTIFIER.length) {
                warn('[ProtoNetwork] Invalid packet identifier length');
                return;
            }
            for (let i = 0; i < IDENTIFIER.length; i++) {
                if (view.getUint8(1 + i) !== IDENTIFIER.charCodeAt(i)) {
                    warn('[ProtoNetwork] Invalid packet identifier');
                    return;
                }
            }
            const bodyLength = view.getInt32(4, false);
            if (bodyLength < MESSAGE_HEADER_LENGTH + HASH_LENGTH || HEADER_LENGTH + bodyLength !== buffer.length) {
                warn(`[ProtoNetwork] Body length mismatch: ${bodyLength}, received: ${buffer.length - HEADER_LENGTH}`);
                return;
            }
            const payloadLength = bodyLength - MESSAGE_HEADER_LENGTH - HASH_LENGTH;

            const header = {
                format: view.getUint8(HEADER_LENGTH),
                state: view.getInt32(HEADER_LENGTH + 1, false),
                sn: view.getInt32(HEADER_LENGTH + 5, false),
                commandId: view.getInt32(HEADER_LENGTH + 9, false),
                moduleId: view.getUint8(HEADER_LENGTH + 13),
                hashCode: view.getInt32(bodyOffset + payloadLength, false),
            };
            if (header.format !== FORMAT) {
                warn(`[ProtoNetwork] Unsupported message format: ${header.format}`);
                return;
            }

            // 所有服务端信息体统一为 Result；Any.value 内才是实际业务协议。
            const msgBuffer = buffer.subarray(bodyOffset, bodyOffset + payloadLength);
            const result = protoCodecs.Result.decode(msgBuffer);
            const typeUrl = result.content?.type_url || '';

            // 按模块号和指令 ID 匹配响应/通知，区分不同模块的相同指令 ID。
            let msgName: ProtoServerMessageType | undefined;
            let duplicateRoute = false;
            for (const name of Object.values(ProtoServerMessageType)) {
                const route = ProtoConfig.PROTO_ROUTES[name];
                if (route && route.commandId === header.commandId && route.moduleId === header.moduleId) {
                    if (msgName) {
                        duplicateRoute = true;
                        msgName = undefined;
                        break;
                    }
                    msgName = name;
                }
            }
            if (result.code !== 0) {
                const error = { code: result.code, messageName: msgName || null, header, typeUrl };
                warn(`[ProtoNetwork] Server result error: ${result.code}`, error);
                EventManager.Instance.dispatch(ProtoNetworkMgr.EventType.RESULT_ERROR, { detail: error });
                this.dispatchEvent(new CustomEvent(ProtoNetworkMgr.EventType.RESULT_ERROR, { detail: error }));
                return;
            }
            if (duplicateRoute) {
                warn(`[ProtoNetwork] Duplicate server message route: ${header.moduleId}/${header.commandId}`);
                return;
            }
            if (!msgName) {
                warn(`[ProtoNetwork] Unknown server message route: ${header.moduleId}/${header.commandId}`);
                return;
            }
            let plainObject: unknown = null;
            if (result.content) {
                const protoType = this.findProtoType(msgName);
                if (!protoType) {
                    warn(`[ProtoNetwork] Unknown message type: ${msgName}`);
                    return;
                }
                if (typeUrl) {
                    const actualType = typeUrl.substring(typeUrl.lastIndexOf('/') + 1);
                    const expectedUrl: string = protoType.getTypeUrl();
                    const expectedType = expectedUrl.substring(expectedUrl.lastIndexOf('/') + 1);
                    if (actualType !== expectedType) {
                        warn(`[ProtoNetwork] Result content type mismatch: ${actualType}, expected: ${expectedType}`);
                        return;
                    }
                }
                // value 为空是合法的空业务消息；content 缺失则保留 detail = null。
                const message = protoType.decode(result.content.value);
                plainObject = protoType.toObject(message, {
                    longs: String,
                    enums: String,
                    bytes: String,
                    defaults: true,
                });
            }
            log(`%c[ProtoNetwork] Received message: ${msgName}`, 'color: #0bf132', plainObject);

            // 触发事件监听（所有服务器消息都通过事件系统分发）
            EventManager.Instance.dispatch(msgName, { detail: plainObject, header, code: result.code, typeUrl });

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
        // this.stopHeartbeat();

        // this.heartbeatTimer = setInterval(() => {
        //     this.sendHeartbeat();
        // }, this.heartbeatInterval);
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
    /** 按服务端有符号 byte 规则计算 BPHash，保留 int32 溢出结果。 */
    public BPHash(bytes: Uint8Array, len: number): number {
        let hash = 0;

        for (let i = 0; i < len; i++) {
            // Uint8Array 是 0~255；服务端 byte 在提升为 int 时会保留符号。
            const signedByte = bytes[i] >= 128 ? bytes[i] - 256 : bytes[i];
            hash = (hash << 7) ^ signedByte;
        }

        return hash;
    }
}
