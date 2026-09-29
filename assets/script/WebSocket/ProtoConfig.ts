/**
 * Protobuf网络配置
 * 用于配置服务器地址、心跳、重连等参数
 */
export class ProtoConfig {
    /**
     * 服务器配置
     */
    static SERVER = {
        // 开发环境服务器地址
        DEV_URL: 'ws://127.0.0.1:8080/ws',

        // 测试环境服务器地址
        TEST_URL: 'ws://1.117.60.180:17001/ws',

        // 生产环境服务器地址
        PROD_URL: 'ws://your-production-server.com/ws',

        // 当前使用的服务器地址
        get CURRENT_URL(): string {
            // 根据环境自动选择
            if (typeof window !== 'undefined') {
                const hostname = window.location.hostname;
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    return this.DEV_URL;
                }
                // 可以根据域名判断环境
            }
            return this.TEST_URL;
        }
    };

    /**
     * 连接配置
     */
    static CONNECTION = {
        // 连接超时时间（毫秒）
        CONNECT_TIMEOUT: 10000,

        // 是否自动连接
        AUTO_CONNECT: true,

        // 是否使用二进制模式
        BINARY_TYPE: 'arraybuffer' as BinaryType,
    };

    /**
     * 重连配置
     */
    static RECONNECT = {
        // 最大重连次数
        MAX_COUNT: 5,

        // 重连延迟（毫秒）
        DELAY: 3000,

        // 重连延迟增长系数（指数退避）
        DELAY_MULTIPLIER: 1.5,

        // 最大重连延迟（毫秒）
        MAX_DELAY: 30000,
    };

    /**
     * 心跳配置
     */
    static HEARTBEAT = {
        // 是否启用心跳
        ENABLED: true,

        // 心跳间隔（毫秒）
        INTERVAL: 30000,

        // 心跳超时（毫秒）
        TIMEOUT: 10000,

        // 心跳消息名称
        MESSAGE_NAME: 'HelloReq',
    };

    /**
     * 消息配置
     */
    static MESSAGE = {
        // 默认超时时间（毫秒）
        DEFAULT_TIMEOUT: 30000,

        // 消息队列最大长度
        MAX_QUEUE_SIZE: 100,

        // 是否在断线时缓存消息
        CACHE_ON_DISCONNECT: true,
    };

    /**
     * 日志配置
     */
    static LOG = {
        // 是否启用日志
        ENABLED: true,

        // 是否打印发送的消息
        LOG_SEND: true,

        // 是否打印接收的消息
        LOG_RECEIVE: true,

        // 是否打印心跳消息
        LOG_HEARTBEAT: false,

        // 是否打印二进制数据
        LOG_BINARY: false,
    };

    /**
     * 协议配置
     */
    static PROTO = {
        // 消息头长度（字节）
        HEADER_LENGTH: 2,

        // 消息名最大长度
        MAX_NAME_LENGTH: 255,

        // 消息体最大长度
        MAX_BODY_LENGTH: 1024 * 1024, // 1MB
    };

    /**
     * 错误码配置
     */
    static ERROR_CODE = {
        SUCCESS: 0,
        UNKNOWN_ERROR: 1,
        INVALID_MESSAGE: 2,
        TIMEOUT: 3,
        NOT_CONNECTED: 4,
        CONNECTION_CLOSED: 5,
    };

    /**
     * 根据环境获取配置
     */
    static getConfig(env: 'dev' | 'test' | 'prod' = 'test') {
        return {
            serverUrl: env === 'dev' ? this.SERVER.DEV_URL :
                      env === 'prod' ? this.SERVER.PROD_URL :
                      this.SERVER.TEST_URL,
            reconnectMaxCount: this.RECONNECT.MAX_COUNT,
            reconnectDelay: this.RECONNECT.DELAY,
            heartbeatInterval: this.HEARTBEAT.INTERVAL,
            heartbeatTimeout: this.HEARTBEAT.TIMEOUT,
            defaultTimeout: this.MESSAGE.DEFAULT_TIMEOUT,
        };
    }

    /**
     * 开发环境配置
     */
    static getDevelopmentConfig() {
        return {
            ...this.getConfig('dev'),
            // 开发环境特殊配置
            reconnectMaxCount: 999, // 开发时无限重连
            logEnabled: true,
            logSend: true,
            logReceive: true,
        };
    }

    /**
     * 生产环境配置
     */
    static getProductionConfig() {
        return {
            ...this.getConfig('prod'),
            // 生产环境特殊配置
            logEnabled: false,
            logSend: false,
            logReceive: false,
            logHeartbeat: false,
        };
    }
}
