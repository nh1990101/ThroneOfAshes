/**
 * Proto 消息配置
 * 自动生成，请勿手动修改
 * 生成时间: 2026/9/28 16:03:57
 */

// 消息ID枚举
export enum ProtoMsgId {
    // ========== gmcmd.proto ==========
    GMCMDDesc = 10000,
    NtfGMCMDInit = 1001,
    UseGMCMDReq = 1002,
    UseGMCMDResp = 1003,

    // ========== hello.proto ==========
    HelloReq = 10001,
    HelloResp = 10002,
}

// 消息ID到消息名称的映射（用于日志输出）
export const ProtoMsgName: { [key: number]: string } = {
    [ProtoMsgId.GMCMDDesc]: 'pb.GMCMDDesc',
    [ProtoMsgId.NtfGMCMDInit]: 'pb.NtfGMCMDInit',
    [ProtoMsgId.UseGMCMDReq]: 'pb.UseGMCMDReq',
    [ProtoMsgId.UseGMCMDResp]: 'pb.UseGMCMDResp',
    [ProtoMsgId.HelloReq]: 'pb.HelloReq',
    [ProtoMsgId.HelloResp]: 'pb.HelloResp',
};
