# Protobuf网络管理系统

基于protobuf.js的WebSocket网络通信管理系统，提供完整的消息收发、心跳、重连等功能。

## 文件说明

- **ProtoNetworkMgr.ts** - Protobuf网络管理核心类
- **ProtoNetworkExample.ts** - 使用示例组件
- **GameWebSocket.ts** - 原有的JSON格式WebSocket实现（保留用于兼容）
- **proto/ProtoDefined.ts** - protobuf协议定义（自动生成）
- **proto/ProtoDefined.d.ts** - TypeScript类型定义（自动生成）

## 核心特性

### 1. 自动序列化/反序列化
- 使用protobuf编码，数据体积小，传输效率高
- 自动处理消息的编码和解码
- 支持类型安全的TypeScript接口

### 2. 请求-响应模式
- 基于Promise的异步API
- 自动匹配请求和响应消息
- 支持超时控制

### 3. 心跳机制
- 自动发送心跳保持连接
- 心跳超时自动重连
- 可配置心跳间隔和超时时间

### 4. 自动重连
- 断线自动重连
- 可配置重连次数和间隔
- 重连过程中消息队列保护

### 5. 消息队列
- 断线期间消息自动入队
- 重连后自动发送队列中的消息
- 防止消息丢失

### 6. 事件系统
- 连接状态事件通知
- 服务器推送消息监听
- 灵活的事件回调机制

## 快速开始

### 1. 注册协议

在`ProtoNetworkMgr.ts`的`initProtoConfig()`方法中注册协议：

```typescript
private initProtoConfig() {
    // 注册请求-响应协议对
    this.registerProto('HelloReq', 'HelloResp', pb.HelloReq, pb.HelloResp);
    this.registerProto('LoginReq', 'LoginResp', pb.LoginReq, pb.LoginResp);
    
    // 注册服务器通知消息
    this.registerNotify('NtfGMCMDInit', pb.NtfGMCMDInit);
}
```

### 2. 连接服务器

```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';

// 获取单例
const network = ProtoNetworkMgr.instance;

// 配置参数
network.setReconnectConfig(5, 3000);  // 最大重连5次，间隔3秒
network.setHeartbeatConfig(30000, 10000);  // 心跳30秒，超时10秒
network.setTimeout(30000);  // 请求超时30秒

// 监听连接事件
network.addEventListener(ProtoNetworkMgr.EventType.CONNECTED, () => {
    console.log('连接成功');
});

// 连接
const connected = await network.connect('ws://your-server-url');
```

### 3. 发送请求

```typescript
import { pb } from './WebSocket/proto/ProtoDefined';

try {
    // 构造请求
    const req: pb.IHelloReq = {
        content: 'Hello Server!'
    };
    
    // 发送并等待响应
    const resp = await network.send<pb.IHelloReq, pb.IHelloResp>('HelloReq', req);
    
    console.log('服务器响应:', resp.content);
    console.log('服务器时间:', resp.serverTime);
    
} catch (error) {
    console.error('请求失败:', error);
}
```

### 4. 监听服务器推送

```typescript
// 监听特定的通知消息
network.addEventListener('NtfGMCMDInit', (event: CustomEvent) => {
    const data = event.detail as pb.INtfGMCMDInit;
    console.log('收到GM命令列表:', data.cmds);
});

// 监听所有消息（调试用）
network.addEventListener('*', (event: CustomEvent) => {
    console.log('收到消息:', event.type, event.detail);
});
```

### 5. 断开连接

```typescript
// 主动断开
network.disconnect();

// 检查连接状态
const isOnline = network.isOnline();
```

## 消息格式

### 二进制消息格式

```
[消息名长度(2字节)][消息名(UTF-8)][消息体(Protobuf)]
```

- **消息名长度**: uint16，大端序
- **消息名**: UTF-8编码的字符串，如"HelloReq"
- **消息体**: Protobuf序列化后的二进制数据

### 示例

发送HelloReq消息：
1. 消息名"HelloReq"编码后长度为8字节
2. 长度字段: `[0x00, 0x08]`
3. 消息名: `[0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x52, 0x65, 0x71]`
4. 消息体: HelloReq的protobuf编码数据

## 协议定义

协议定义在`proto/`目录下的`.proto`文件中：

```protobuf
syntax = "proto3";

package pb;

// Hello请求
message HelloReq {
    string content = 1;
}

// Hello响应
message HelloResp {
    string content = 1;
    int64 serverTime = 2;
}
```

## 编译协议

项目已配置自动编译脚本：

```bash
# 编译所有proto文件
npm run proto

# 监听模式自动编译
npm run proto:watch
```

编译后会生成：
- `assets/script/WebSocket/proto/ProtoDefined.js` - JS实现
- `assets/script/WebSocket/proto/ProtoDefined.d.ts` - TypeScript类型定义

## 最佳实践

### 1. 错误处理

```typescript
try {
    const resp = await network.send('HelloReq', req);
    // 处理响应
} catch (error) {
    if (error.message.includes('timeout')) {
        // 处理超时
        console.error('请求超时');
    } else if (error.message.includes('Connection closed')) {
        // 处理断线
        console.error('连接已断开');
    } else {
        // 其他错误
        console.error('未知错误:', error);
    }
}
```

### 2. 自定义超时

```typescript
// 为特定请求设置超时（单位：毫秒）
const resp = await network.send('LongTaskReq', req, 60000);  // 60秒超时
```

### 3. 连接状态管理

```typescript
// 在游戏启动时连接
async onGameStart() {
    await ProtoNetworkMgr.instance.connect(serverUrl);
}

// 在游戏暂停时断开
onGamePause() {
    ProtoNetworkMgr.instance.disconnect();
}

// 在游戏恢复时重连
async onGameResume() {
    if (!ProtoNetworkMgr.instance.isOnline()) {
        await ProtoNetworkMgr.instance.connect(serverUrl);
    }
}
```

### 4. 消息优先级

对于重要消息，可以在连接成功后立即发送：

```typescript
network.addEventListener(ProtoNetworkMgr.EventType.CONNECTED, async () => {
    // 连接成功后立即发送登录请求
    await this.sendLoginRequest();
});
```

## 调试

### 启用详细日志

在`ProtoNetworkMgr.ts`中，所有关键操作都有日志输出：
- `[ProtoNetwork] Connected to` - 连接成功
- `[ProtoNetwork] Sent message` - 发送消息
- `[ProtoNetwork] Received message` - 接收消息
- `[ProtoNetwork] Reconnecting...` - 正在重连

### 常见问题

1. **连接失败**
   - 检查服务器地址是否正确
   - 检查网络权限设置
   - 查看浏览器控制台的错误信息

2. **消息发送失败**
   - 确认协议已在`initProtoConfig()`中注册
   - 检查消息结构是否与proto定义一致
   - 查看是否有类型错误

3. **收不到响应**
   - 检查请求-响应名称是否匹配
   - 确认服务器已正确发送响应
   - 检查是否超时（默认30秒）

4. **重连失败**
   - 检查重连次数是否已用完
   - 确认服务器是否可用
   - 查看重连间隔是否合理

## 性能优化

### 1. 消息池

对于频繁创建的消息对象，可以使用对象池：

```typescript
class MessagePool {
    private pool: Map<string, any[]> = new Map();
    
    get<T>(type: any): T {
        const key = type.name;
        if (!this.pool.has(key)) {
            this.pool.set(key, []);
        }
        const pool = this.pool.get(key)!;
        return pool.pop() || type.create();
    }
    
    recycle(type: any, obj: any) {
        const key = type.name;
        const pool = this.pool.get(key) || [];
        pool.push(obj);
        this.pool.set(key, pool);
    }
}
```

### 2. 批量发送

将多个小消息合并为一个大消息发送：

```typescript
// 定义批量消息协议
message BatchReq {
    repeated Any requests = 1;
}

// 批量发送
const batch: pb.IBatchReq = {
    requests: [req1, req2, req3]
};
await network.send('BatchReq', batch);
```

### 3. 消息压缩

对于大消息，可以在发送前压缩：

```typescript
// 使用pako等库压缩
import pako from 'pako';

const compressed = pako.deflate(buffer);
// 发送压缩后的数据
```

## 与旧版本兼容

如果需要同时支持JSON和Protobuf格式：

```typescript
// 使用ProtoNetworkMgr处理protobuf消息
ProtoNetworkMgr.instance.connect('ws://proto-server');

// 使用GameWebSocket处理JSON消息
GameWebSocket.instance.connect('ws://json-server');
```

## 扩展功能

### 自定义心跳消息

修改`sendHeartbeat()`方法使用自定义的心跳协议：

```typescript
private async sendHeartbeat() {
    try {
        await this.send<pb.IPingReq, pb.IPongResp>('PingReq', {
            timestamp: Date.now()
        });
    } catch (error) {
        warn('[ProtoNetwork] Heartbeat failed:', error);
    }
}
```

### 消息加密

在发送前加密消息体：

```typescript
// 在send()方法中，编码后加密
const encrypted = this.encrypt(buffer);
packet.set(encrypted, 2 + nameBuffer.length);
```

### 消息统计

添加消息发送/接收统计：

```typescript
private messageStats = {
    sent: 0,
    received: 0,
    bytes: { sent: 0, received: 0 }
};

// 在发送/接收时更新统计
this.messageStats.sent++;
this.messageStats.bytes.sent += packet.length;
```

## 更新日志

### v1.0.0 (2024-09-29)
- 初始版本发布
- 支持protobuf消息序列化
- 实现心跳和自动重连机制
- 提供完整的TypeScript类型支持

## 许可证

MIT License
