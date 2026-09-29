# Protobuf网络管理使用教程

## 一、快速集成

### 1. 在Loading场景中初始化网络

修改 `assets/script/Loading/Loading.ts`:

```typescript
import { ProtoNetworkMgr } from '../WebSocket/ProtoNetworkMgr';
import { ProtoConfig } from '../WebSocket/ProtoConfig';

async start() {
    // ... 其他加载逻辑

    this.setPro(0.7, "正在连接服务器")
    await this.initNetwork();

    this.setPro(0.8, "正在进入游戏")
    // ... 跳转到主场景
}

async initNetwork() {
    const network = ProtoNetworkMgr.instance;
    
    // 应用配置
    const config = ProtoConfig.getConfig('test');
    network.setReconnectConfig(config.reconnectMaxCount, config.reconnectDelay);
    network.setHeartbeatConfig(config.heartbeatInterval, config.heartbeatTimeout);
    network.setTimeout(config.defaultTimeout);
    
    // 监听连接事件
    network.addEventListener(ProtoNetworkMgr.EventType.CONNECTED, () => {
        console.log('网络连接成功');
    });
    
    network.addEventListener(ProtoNetworkMgr.EventType.DISCONNECTED, () => {
        console.log('网络连接断开');
        // 可以显示断线提示UI
    });
    
    // 连接服务器
    const connected = await network.connect(config.serverUrl);
    
    if (connected) {
        // 连接成功后可以发送登录请求
        await this.login();
    } else {
        // 连接失败处理
        console.error('连接服务器失败');
    }
}

async login() {
    try {
        // 发送登录请求
        const loginReq = {
            username: 'player001',
            password: '123456'
        };
        
        // const loginResp = await ProtoNetworkMgr.instance.send('LoginReq', loginReq);
        // console.log('登录成功:', loginResp);
    } catch (error) {
        console.error('登录失败:', error);
    }
}
```

### 2. 在游戏中发送请求

```typescript
import { ProtoNetworkMgr } from '../WebSocket/ProtoNetworkMgr';
import { pb } from '../WebSocket/proto/ProtoDefined';

export class GameLogic {
    // 发送Hello请求
    async sendHello() {
        try {
            const req: pb.IHelloReq = {
                content: 'Hello from client'
            };
            
            const resp = await ProtoNetworkMgr.instance.send<pb.IHelloReq, pb.IHelloResp>(
                'HelloReq',
                req,
                5000  // 5秒超时
            );
            
            console.log('服务器回复:', resp.content);
            console.log('服务器时间:', resp.serverTime);
            
        } catch (error) {
            console.error('请求失败:', error);
        }
    }
    
    // 使用GM命令
    async useGMCommand(cmd: string, ...args: string[]) {
        try {
            const req: pb.IUseGMCMDReq = {
                cmd: cmd,
                args: args
            };
            
            const resp = await ProtoNetworkMgr.instance.send<pb.IUseGMCMDReq, pb.IUseGMCMDResp>(
                'UseGMCMDReq',
                req
            );
            
            console.log('GM命令结果:', resp.msg);
            return resp.msg;
            
        } catch (error) {
            console.error('GM命令失败:', error);
            throw error;
        }
    }
}
```

### 3. 监听服务器推送

```typescript
export class GameEventHandler {
    start() {
        const network = ProtoNetworkMgr.instance;
        
        // 监听GM命令初始化通知
        network.addEventListener('NtfGMCMDInit', (event: CustomEvent) => {
            const data = event.detail as pb.INtfGMCMDInit;
            this.onGMCMDInit(data);
        });
        
        // 监听其他服务器推送消息
        // network.addEventListener('NtfXXX', this.onXXX.bind(this));
    }
    
    onGMCMDInit(data: pb.INtfGMCMDInit) {
        console.log('收到GM命令列表:');
        if (data.cmds) {
            for (const cmd of data.cmds) {
                console.log(`  ${cmd.category} - ${cmd.cmd}: ${cmd.desc}`);
            }
        }
    }
}
```

## 二、添加新协议

### 1. 编写proto文件

在 `proto/` 目录下创建新的 `.proto` 文件，例如 `player.proto`:

```protobuf
syntax = "proto3";

package pb;

// 获取玩家信息请求
message GetPlayerInfoReq {
    int64 playerId = 1;
}

// 获取玩家信息响应
message GetPlayerInfoResp {
    int64 playerId = 1;
    string playerName = 2;
    int32 level = 3;
    int32 exp = 4;
}

// 玩家升级通知
message NtfPlayerLevelUp {
    int32 oldLevel = 1;
    int32 newLevel = 2;
    int32 reward = 3;
}
```

### 2. 编译proto文件

```bash
npm run proto
```

这会自动编译所有proto文件并生成TypeScript代码。

### 3. 注册协议

在 `ProtoNetworkMgr.ts` 的 `initProtoConfig()` 方法中注册:

```typescript
private initProtoConfig() {
    // 注册Hello协议
    this.registerProto('HelloReq', 'HelloResp', pb.HelloReq, pb.HelloResp);
    
    // 注册玩家信息协议
    this.registerProto('GetPlayerInfoReq', 'GetPlayerInfoResp', 
                      pb.GetPlayerInfoReq, pb.GetPlayerInfoResp);
    
    // 注册通知消息
    this.registerNotify('NtfPlayerLevelUp', pb.NtfPlayerLevelUp);
}
```

### 4. 使用新协议

```typescript
async getPlayerInfo(playerId: number) {
    try {
        const req: pb.IGetPlayerInfoReq = {
            playerId: playerId
        };
        
        const resp = await ProtoNetworkMgr.instance.send<
            pb.IGetPlayerInfoReq, 
            pb.IGetPlayerInfoResp
        >('GetPlayerInfoReq', req);
        
        console.log('玩家信息:', resp);
        return resp;
        
    } catch (error) {
        console.error('获取玩家信息失败:', error);
        throw error;
    }
}

// 监听升级通知
ProtoNetworkMgr.instance.addEventListener('NtfPlayerLevelUp', (event: CustomEvent) => {
    const data = event.detail as pb.INtfPlayerLevelUp;
    console.log(`玩家从${data.oldLevel}级升到${data.newLevel}级，获得${data.reward}奖励`);
});
```

## 三、高级用法

### 1. 批量请求

```typescript
async batchRequest() {
    try {
        // 并发发送多个请求
        const [info1, info2, info3] = await Promise.all([
            this.getPlayerInfo(1001),
            this.getPlayerInfo(1002),
            this.getPlayerInfo(1003)
        ]);
        
        console.log('批量获取成功:', info1, info2, info3);
        
    } catch (error) {
        console.error('批量请求失败:', error);
    }
}
```

### 2. 请求重试

```typescript
async sendWithRetry<TReq, TResp>(
    msgName: string, 
    data: TReq, 
    maxRetry: number = 3
): Promise<TResp> {
    let lastError: any;
    
    for (let i = 0; i < maxRetry; i++) {
        try {
            return await ProtoNetworkMgr.instance.send<TReq, TResp>(msgName, data);
        } catch (error) {
            lastError = error;
            console.warn(`请求失败，重试 ${i + 1}/${maxRetry}`, error);
            
            // 等待一段时间后重试
            await this.delay(1000 * (i + 1));
        }
    }
    
    throw lastError;
}

private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 3. 消息拦截器

```typescript
class MessageInterceptor {
    // 请求前拦截
    beforeSend(msgName: string, data: any): any {
        console.log('发送前:', msgName, data);
        
        // 可以修改数据
        // data.timestamp = Date.now();
        
        return data;
    }
    
    // 响应后拦截
    afterReceive(msgName: string, data: any): any {
        console.log('收到响应:', msgName, data);
        
        // 可以处理通用错误
        if (data.code !== 0) {
            console.error('服务器返回错误:', data.code);
        }
        
        return data;
    }
}
```

### 4. 自定义事件总线

```typescript
export class NetworkEventBus {
    private static handlers: Map<string, Function[]> = new Map();
    
    static on(event: string, handler: Function) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event)!.push(handler);
        
        // 同时监听网络消息
        ProtoNetworkMgr.instance.addEventListener(event, (e: CustomEvent) => {
            handler(e.detail);
        });
    }
    
    static off(event: string, handler: Function) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    static emit(event: string, data: any) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                handler(data);
            }
        }
    }
}

// 使用
NetworkEventBus.on('NtfPlayerLevelUp', (data) => {
    console.log('玩家升级了:', data);
});
```

## 四、调试技巧

### 1. 启用详细日志

```typescript
// 在开发环境启用所有日志
const config = ProtoConfig.getDevelopmentConfig();
ProtoConfig.LOG.ENABLED = true;
ProtoConfig.LOG.LOG_SEND = true;
ProtoConfig.LOG.LOG_RECEIVE = true;
ProtoConfig.LOG.LOG_HEARTBEAT = true;
```

### 2. 模拟网络延迟

```typescript
class NetworkSimulator {
    static delay: number = 0; // 模拟延迟（毫秒）
    
    static async send<TReq, TResp>(msgName: string, data: TReq): Promise<TResp> {
        if (this.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.delay));
        }
        return ProtoNetworkMgr.instance.send<TReq, TResp>(msgName, data);
    }
}

// 使用
NetworkSimulator.delay = 1000; // 模拟1秒延迟
await NetworkSimulator.send('HelloReq', { content: 'test' });
```

### 3. 消息统计

```typescript
class MessageStats {
    private static stats: Map<string, { count: number, bytes: number }> = new Map();
    
    static record(msgName: string, bytes: number) {
        if (!this.stats.has(msgName)) {
            this.stats.set(msgName, { count: 0, bytes: 0 });
        }
        const stat = this.stats.get(msgName)!;
        stat.count++;
        stat.bytes += bytes;
    }
    
    static report() {
        console.log('=== 消息统计 ===');
        for (const [name, stat] of this.stats.entries()) {
            console.log(`${name}: ${stat.count}次, ${stat.bytes}字节`);
        }
    }
}
```

## 五、常见问题

### Q1: 连接失败怎么办？
A: 检查服务器地址是否正确，查看控制台错误信息，确认网络权限。

### Q2: 如何处理断线重连？
A: 系统已自动处理重连，你只需要监听DISCONNECTED和CONNECTED事件更新UI。

### Q3: 消息超时怎么处理？
A: 可以在send()时指定超时时间，或者使用重试机制。

### Q4: 如何优化性能？
A: 使用批量请求、消息压缩、对象池等技术。

### Q5: 如何调试协议问题？
A: 启用详细日志，使用Wireshark抓包分析。
