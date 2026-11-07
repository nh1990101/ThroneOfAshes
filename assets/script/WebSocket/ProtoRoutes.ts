/** 协议路由，由 proto/routes.json 自动生成，请勿手动修改。 */
import type { ProtoMessageType } from './ProtoMessageType';

/** 指令 ID 为 int32，模块号为 0~255 的单字节整数。 */
export interface IProtoRoute {
    commandId: number;
    moduleId: number;
}

export const PROTO_ROUTES: Record<ProtoMessageType, IProtoRoute | null> = {
    'com.game.hjwz.message.AccountLoginReq': { commandId: 1, moduleId: 10 },
    'com.game.hjwz.message.AccountLoginResp': { commandId: 1, moduleId: 10 },
    'com.message.User': { commandId: 3, moduleId: 1 },
    'HelloReq': { commandId: 1001, moduleId: 1 },
    'HelloResp': { commandId: 1001, moduleId: 1 },
    'NtfGMCMDInit': { commandId: 1003, moduleId: 1 },
    'UseGMCMDReq': { commandId: 1002, moduleId: 1 },
    'UseGMCMDResp': { commandId: 1002, moduleId: 1 },
};

/** true 表示当前路由仅用于本地测试，尚未经服务端确认。 */
export const PROTO_ROUTES_TEST_ONLY = true;
