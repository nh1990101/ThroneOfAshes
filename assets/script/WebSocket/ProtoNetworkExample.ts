/**
 * ProtoNetworkMgr 使用示例
 */

import { _decorator, Component } from 'cc';
import { ProtoNetworkMgr } from './ProtoNetworkMgr';
import { ProtoMsgId } from './ProtoConfig';
import { pb } from 'db://assets/libs/proto';


const { ccclass } = _decorator;

@ccclass('ProtoNetworkExample')
export class ProtoNetworkExample extends Component {

    async onLoad() {
        // 1. 初始化网络管理器
        ProtoNetworkMgr.instance.init();

        // 2. 连接服务器
        const connected = await ProtoNetworkMgr.instance.connect();
        if (!connected) {
            console.error('连接服务器失败');
            return;
        }

        // 3. 注册推送消息监听（服务器主动推送的消息）
        this.registerPushHandlers();

        // 4. 发送请求示例
        await this.testGMCommand();
    }

    /**
     * 注册推送消息监听
     */
    private registerPushHandlers() {
        // 监听GM初始化推送
        ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, (data: pb.NtfGMCMDInit.$Properties) => {
            console.log('=== 收到GM初始化推送 ===');
            console.log('GM是否开启:', data.enabled);
            console.log('可用指令列表:');
            data.cmds?.forEach((cmd: pb.GMCMDDesc.$Properties) => {
                console.log(`  [${cmd.category}] ${cmd.cmd} - ${cmd.desc}`);
                console.log(`    参数:`, cmd.args);
            });
        }, this);
    }

    /**
     * 测试GM指令
     */
    private async testGMCommand() {
        try {
            console.log('=== 发送GM指令请求 ===');

            // 发送GM指令请求
            const response = await ProtoNetworkMgr.instance.sendRequest<pb.UseGMCMDResp>(
                ProtoMsgId.UseGMCMDReq,
                {
                    cmd: 'addItem',
                    args: ['1001', '100']
                }
            );

            console.log('=== GM指令响应 ===');
            console.log('提示信息:', response.msg);

        } catch (error) {
            console.error('GM指令执行失败:', error);
        }
    }

    /**
     * 组件销毁时的清理
     */
    onDestroy() {
        // 移除推送监听（如果需要）
        // ProtoNetworkMgr.instance.off(ProtoMsgId.NtfGMCMDInit, handler);

        // 断开连接
        // ProtoNetworkMgr.instance.disconnect();
    }
}
