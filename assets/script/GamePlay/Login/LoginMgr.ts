import { _decorator, sys, warn } from 'cc';
import { BaseMgr } from '../../Common/BaseMgr';
import { ProtoRequestType, ProtoServerMessageType } from '../../WebSocket/ProtoMessageType';
import { GameWebSocket } from '../../WebSocket/GameWebSocket';
import { ProtoNetworkMgr } from '../../WebSocket/ProtoNetworkMgr';
import type { pbType } from '../../WebSocket/proto/ProtoDefined.d';

const { ccclass } = _decorator;

/** 由登录服或 SDK 提供的字段；账号始终使用 sendLoginReq 的第一个参数。 */
export type LoginRequestOptions = Omit<pbType.IAccountLoginReq, 'account_name'>;

@ccclass('LoginMgr')
export class LoginMgr extends BaseMgr {
    public loginInfo: pbType.Account;
    public initEvent(): void {
        super.initEvent();
        this.addEvent(ProtoServerMessageType.AccountLoginResp, this.OnLoginResp, this);
    }
    OnLoginResp(event: any) {
        this.loginInfo = event.detail;

    }
    /** 时间戳默认使用毫秒；服务端或 SDK 有其他约定时，可通过 options 覆盖。 */
    public sendLoginReq(userName: string, options: LoginRequestOptions = {}): void {
        const accountName = typeof userName === 'string' ? userName.trim() : '';
        if (!accountName) {
            warn('[Login] 登录账号不能为空');
            return;
        }

        const req: pbType.IAccountLoginReq = {
            device_model: '',
            os_name: sys.os,
            os_ver: sys.osVersion || '',
            channel: '',
            client_ver: '',
            token: '',
            network: sys.NetworkType[sys.getNetworkType()] || '',
            sdk_ver: '',
            login_addr: '',
            timestamp: Date.now(),
            reg_channel: '',
            login_channel: '',
        };
        if (sys.os === sys.OS.IOS) {
            req.os_type = 0;
        } else if (sys.os === sys.OS.ANDROID) {
            req.os_type = 1;
        }
        Object.assign(req, options);
        req.account_name = accountName;

        // 两条路径都是同一网络单例；尚未连接时沿用网络管理器的发送队列。
        const network = GameWebSocket.getInstance().NetWork || ProtoNetworkMgr.instance;
        network.send<pbType.IAccountLoginReq>(ProtoRequestType.AccountLoginReq, req);
    }
}


