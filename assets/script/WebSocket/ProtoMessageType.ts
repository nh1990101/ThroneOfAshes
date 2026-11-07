/** 协议消息类型枚举，由 proto 工具自动生成，请勿手动修改。 */

/** 请求消息类型。 */
export enum ProtoRequestType {
    AccountLoginReq = 'com.game.hjwz.message.AccountLoginReq',
    User = 'com.message.User',
    HelloReq = 'HelloReq',
    UseGMCMDReq = 'UseGMCMDReq',
}

/** 服务器消息类型（响应和通知）。 */
export enum ProtoServerMessageType {
    AccountLoginResp = 'com.game.hjwz.message.AccountLoginResp',
    User = 'com.message.User',
    HelloResp = 'HelloResp',
    NtfGMCMDInit = 'NtfGMCMDInit',
    UseGMCMDResp = 'UseGMCMDResp',
}

/** 所有网络消息类型。 */
export type ProtoMessageType = ProtoRequestType | ProtoServerMessageType;
