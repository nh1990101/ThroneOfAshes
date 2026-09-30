/**
 * 协议消息类型枚举
 * 自动生成，避免使用魔法字符串
 */

/**
 * 请求消息类型
 */
export enum ProtoRequestType {
    /** Hello请求 */
    HelloReq = 'HelloReq',
    /** GM命令请求 */
    UseGMCMDReq = 'UseGMCMDReq',
}

/**
 * 服务器消息类型（响应和通知）
 */
export enum ProtoServerMessageType {
    /** Hello响应 */
    HelloResp = 'HelloResp',
    /** GM命令响应 */
    UseGMCMDResp = 'UseGMCMDResp',
    /** GM命令初始化通知 */
    NtfGMCMDInit = 'NtfGMCMDInit',
}

/**
 * 所有消息类型（包含请求、响应、通知）
 */
export type ProtoMessageType = ProtoRequestType | ProtoServerMessageType;
