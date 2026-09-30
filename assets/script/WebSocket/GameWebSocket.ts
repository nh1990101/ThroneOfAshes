import { _decorator, Component } from 'cc';
import { ProtoNetworkMgr } from './ProtoNetworkMgr';
import { ProtoConfig } from './ProtoConfig';
import { pb } from './proto/ProtoDefined';
import type { pb as pbType } from './proto/ProtoDefined.d';
import { ProtoRequestType, ProtoServerMessageType } from './ProtoMessageType';
import { BaseMgr } from '../Common/BaseMgr';
import { EventManager } from '../Common/EventManager';




const { ccclass, property } = _decorator;

/**
 * Protobuf网络示例
 * 演示如何使用ProtoNetworkMgr进行网络通信
 */
@ccclass('GameWebSocket')
export class GameWebSocket extends BaseMgr {
    private network: ProtoNetworkMgr = null!;

    public initEvent(): void {
        super.initEvent();
        this.network = ProtoNetworkMgr.instance;
        // 监听连接事件

        this.addEvent(ProtoNetworkMgr.EventType.CONNECTED, this.onConnected, this);
        this.addEvent(ProtoNetworkMgr.EventType.DISCONNECTED, this.onDisconnected, this);
        this.addEvent(ProtoNetworkMgr.EventType.RECONNECTING, this.onReconnecting, this);
        this.addEvent(ProtoNetworkMgr.EventType.ERROR, this.onError, this);

        // 监听服务器推送消息
        this.network.addEventListener(ProtoServerMessageType.NtfGMCMDInit, this.onGMCMDInit.bind(this));
    }
    start() {
        // this.initNetwork();
    }

    /**
     * 初始化网络连接
     */
    async initNetwork() {

        // 应用配置
        const config = ProtoConfig.getConfig('test');
        this.network.setReconnectConfig(config.reconnectMaxCount, config.reconnectDelay);
        this.network.setHeartbeatConfig(config.heartbeatInterval);


        // 连接服务器
        console.log('正在连接服务器:', config.serverUrl);
        const connected = await this.network.connect(config.serverUrl);

        if (connected) {
            console.log('连接服务器成功');
            // 连接成功后可以发送消息
            this.testHelloMessage();
        } else {
            console.error('连接服务器失败');
        }
    }
  
    /**
     * 测试Hello消息
     */
    testHelloMessage() {
        console.log('发送Hello请求...');

        const req: pbType.IHelloReq = {
            content: 'Hello from Cocos Creator client!'
        };

        // 先监听响应
        EventManager.Instance.addListener(ProtoServerMessageType.HelloResp, (event: any) => {
            const resp = event.detail;
            console.log('收到服务器响应:');
            console.log('  内容:', resp.content);
            console.log('  服务器时间:', resp.serverTime);
        }, this);

        // 发送请求
        this.network.send<pbType.IHelloReq>(ProtoRequestType.HelloReq, req);
    }

    /**
     * 测试GM命令
     */
    testGMCommand(cmd: string, ...args: string[]): void {
        console.log(`发送GM命令: ${cmd}`, args);

        const req: pbType.IUseGMCMDReq = {
            cmd: cmd,
            args: args
        };

        // 先监听响应
        EventManager.Instance.addListener(ProtoServerMessageType.UseGMCMDResp, (event: any) => {
            const resp = event.detail;
            console.log('GM命令结果:', resp.msg);
        }, this);

        // 发送请求
        this.network.send<pbType.IUseGMCMDReq>(ProtoRequestType.UseGMCMDReq, req);
    }

    /**
     * 连接成功事件
     */
    private onConnected(event: CustomEvent) {
        console.log('[网络事件] 连接成功');
    }

    /**
     * 连接断开事件
     */
    private onDisconnected(event: CustomEvent) {
        console.log('[网络事件] 连接断开');
        // 可以显示断线提示UI
    }

    /**
     * 重连中事件
     */
    private onReconnecting(event: CustomEvent) {
        const data = event.detail as { attempt: number, maxAttempts: number };
        console.log(`[网络事件] 正在重连... (${data.attempt}/${data.maxAttempts})`);
        // 可以显示重连进度UI
    }

    /**
     * 错误事件
     */
    private onError(event: CustomEvent) {
        const error = event.detail;
        console.error('[网络事件] 发生错误:', error);
    }

    /**
     * GM命令初始化通知
     */
    private onGMCMDInit(event: CustomEvent) {
        const data = event.detail as pbType.INtfGMCMDInit;
        console.log('[服务器推送] 收到GM命令列表:');

        if (data.cmds && data.cmds.length > 0) {
            // 按分类整理命令
            const cmdsByCategory = new Map<string, pbType.IGMCMDDesc[]>();

            for (const cmd of data.cmds) {
                const category = cmd.category || '其他';
                if (!cmdsByCategory.has(category)) {
                    cmdsByCategory.set(category, []);
                }
                cmdsByCategory.get(category)!.push(cmd);
            }

            // 打印命令列表
            for (const [category, cmds] of cmdsByCategory.entries()) {
                console.log(`\n=== ${category} ===`);
                for (const cmd of cmds) {
                    console.log(`  ${cmd.cmd}: ${cmd.desc}`);
                }
            }
        }
    }

    /**
     * 清理
     */
    unRegistorEvent() {
        super.unRegistorEvent();
        // 断开连接
        this.network.disconnect();
    }

    // ==================== 以下是可以在其他地方调用的公开方法示例 ====================

    /**
     * 发送简单的Hello消息（可以在按钮点击等地方调用）
     * 如需接收响应，请监听 ProtoServerMessageType.HelloResp 事件
     */
    public sendHello(content: string): void {
        const req: pbType.IHelloReq = { content };
        this.network.send<pbType.IHelloReq>(ProtoRequestType.HelloReq, req);
    }

    /**
     * 执行GM命令（可以在调试界面调用）
     * 如需接收结果，请监听 ProtoServerMessageType.UseGMCMDResp 事件
     */
    public executeGM(command: string, ...params: string[]): void {
        this.testGMCommand(command, ...params);
    }

    /**
     * 获取网络连接状态
     */
    public isConnected(): boolean {
        return this.network && this.network.isOnline();
    }

    /**
     * 手动重连
     */
    public async reconnect(): Promise<boolean> {
        if (this.network) {
            const config = ProtoConfig.getConfig('test');
            return await this.network.connect(config.serverUrl);
        }
        return false;
    }

    /**
     * 断开连接
     */
    public disconnect() {
        if (this.network) {
            this.network.disconnect();
        }

    }
  
}
