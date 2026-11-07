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

### 2. 请求发送与响应事件
- 使用消息枚举发送 protobuf 请求
- 成功响应解开 `Result.content` 后通过 `EventManager` 派发
- 服务端错误码通过独立的 `RESULT_ERROR` 事件派发

### 3. 心跳接口
- 保留以 `HelloReq` 发送心跳的示例方法
- 可通过 `setHeartbeatConfig(interval)` 设置心跳间隔
- 当前 `startHeartbeat()` 的定时调度已注释，启用前需与服务端确认心跳协议

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

请求的 protobuf 类型通过自动生成的 `ProtoRequestType` 注册。

在 `proto/routes.json` 中，为每个请求、响应和通知分别填写服务端分配的
`{ commandId, moduleId }`，运行 `npm run proto` 生成路由。指令 ID 是有符号 int32，模块号范围为 0~255；
接收时按“模块号 + 指令 ID”定位消息，同一指令 ID 可用于不同模块。

当前配置统一使用测试模块号 1 和测试指令 1001~1003，`testOnly: true`；真实联调前替换为服务端值。
服务端尚未分配的新消息可保留 `null`。未配置或配置非法的请求会告警并停止发送，
未配置或存在重复路由的服务器消息会告警并停止解码。

### 2. 连接服务器

```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';

// 获取单例
const network = ProtoNetworkMgr.instance;

// 配置参数
network.setReconnectConfig(5, 3000);  // 最大重连5次，间隔3秒
network.setHeartbeatConfig(30000);  // 设置心跳间隔；当前定时调度未启用

// 监听连接事件
network.addEventListener(ProtoNetworkMgr.EventType.CONNECTED, () => {
    console.log('连接成功');
});

// 连接
const connected = await network.connect('ws://your-server-url');
```

### 3. 发送请求

```typescript
import { EventManager } from './Common/EventManager';
import { ProtoRequestType, ProtoServerMessageType } from './WebSocket/ProtoMessageType';
import type { pbType } from './WebSocket/proto/ProtoDefined.d';

const helloOwner = {};
const onHelloResp = (event: { detail: pbType.IHelloResp | null }) => {
    // 本例只处理一次响应，收到后移除监听。
    stopHelloListener();
    const resp = event.detail;
    if (!resp) {
        console.log('请求成功，服务端未返回业务数据');
        return;
    }
    console.log('服务器响应:', resp.content);
    console.log('服务器时间:', resp.serverTime);
};
function stopHelloListener(): void {
    EventManager.Instance.removeListener(ProtoServerMessageType.HelloResp, onHelloResp, helloOwner);
}

// 先监听响应，再发送请求；send 返回 void，响应通过回调处理。
EventManager.Instance.addListener(ProtoServerMessageType.HelloResp, onHelloResp, helloOwner);
network.send<pbType.IHelloReq>(ProtoRequestType.HelloReq, { content: 'Hello Server!' });

// 页面关闭或请求结束时调用 stopHelloListener()，包括收到 RESULT_ERROR 的情况。
```

### 4. 监听服务器推送

```typescript
const notificationOwner = {};
const onGMCMDInit = (event: { detail: pbType.INtfGMCMDInit | null }) => {
    const data = event.detail;
    if (!data) return;
    console.log('收到GM命令列表:', data.cmds);
};
EventManager.Instance.addListener(ProtoServerMessageType.NtfGMCMDInit, onGMCMDInit, notificationOwner);

// 页面关闭时调用，使用同一个回调和所属对象移除监听。
function stopNotificationListener(): void {
    EventManager.Instance.removeListener(ProtoServerMessageType.NtfGMCMDInit, onGMCMDInit, notificationOwner);
}
```

### 服务端统一 Result 返回

所有服务端 protobuf 信息体先按 `pbType.Result` 解码。`code = 0` 表示成功，`content` 是 `Any`：其 `value` 存放实际响应或通知的 protobuf 字节，`type_url` 保留服务端原始完整类型名。网络管理器按路由解包后，原业务监听仍从 `event.detail` 取得 `AccountLoginResp` 等实际业务数据，同时可读取 `event.code`、`event.typeUrl` 和 `event.header`。

`content` 未设置时，成功事件的 `detail` 为 `null`；`content` 已设置但 `value` 是空字节时，按合法空业务消息解码。`type_url` 可使用自定义 URL 前缀，完整类型名必须与路由对应响应类型一致；没有 `type_url` 时按路由选择类型。

`code !== 0` 不调用业务成功监听，也不解码 `Any.value`；错误码通过 `ProtoNetworkMgr.EventType.RESULT_ERROR` 分发。BaseMgr/BaseComp 可使用现有事件登记接口，普通调用示例如下：

```typescript
const owner = {};
const onResultError = (event) => {
    const { code, messageName, header, typeUrl } = event.detail;
    console.warn('服务端错误码:', code, '消息:', messageName, header, typeUrl);
};
EventManager.Instance.addListener(ProtoNetworkMgr.EventType.RESULT_ERROR, onResultError, owner);
// 生命周期结束时移除。
EventManager.Instance.removeListener(ProtoNetworkMgr.EventType.RESULT_ERROR, onResultError, owner);
```

网络对象的 `addEventListener(ProtoNetworkMgr.EventType.RESULT_ERROR, handler)` 也能收到相同结构的 `event.detail`。该事件与连接错误 `EventType.ERROR` 分开；未知路由的服务端错误仍可收到，`messageName` 为 `null`。

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
包头（8字节）：[标识长度(1)][mjg(3)][包体长度(int32)]
包体：信息头（14字节）+ 信息体 + 哈希码（4字节）
信息头：[format(1)][state(int32)][sn(int32)][指令ID(int32)][模块号(1)]
信息体：Protobuf 序列化数据
哈希码：int32，大端序；BPHash(信息头与protobuf的原始字节, 14 + protobuf字节长度)
```

- 所有 int32 使用大端序，包标识固定为 `03 6D 6A 67`。
- 客户端发送的信息体仍为原始请求；服务端返回的信息体为 `Result`（成功内容位于 `Any.value`）。接收包长度和哈希计算范围中的 protobuf 字节指外层 Result 的实际序列化字节。
- 长度字段表示包体总长度 `14 + protobuf长度 + 4`，不包含 8 字节包头；完整数据包长度为 `8 + 长度字段`。解码时 protobuf 长度为 `长度字段 - 14 - 4`；空信息体的长度字段为 18，完整数据包为 26 字节。
- 当前发送时 `format = 0`、`state = 0`，`sn` 从 1 递增；重连不重置，队列保留原序号。
- 每条 WebSocket 二进制消息承载一个完整数据包，protobuf 数据位于字节偏移 22；最后 4 字节为哈希，不参与 protobuf 解码。
- BPHash 从 0 开始，逐字节执行 `(hash << 7) ^ signedByte`，按 int32 溢出。为与服务端一致，原始字节大于等于 128 时，仅在哈希运算中减去 256，按 `-128~127` 的有符号 byte 解释；实际发送字节保持不变。哈希输入从偏移 8 的包体开始，包含 14 字节信息头和 protobuf，排除 8 字节包头与末尾 4 字节哈希。第二参数为 `包体长度 - 4`，随消息内容动态计算；空 protobuf 的输入长度为 14。
- 接收数据仍通过 `EventManager` 按消息名分发，`event.detail` 为 protobuf 对象，
  `event.header` 包含 `format`、`state`、`sn`、`commandId`、`moduleId` 和收到的 `hashCode`。接收端目前单独读取哈希值，未启用 BPHash 一致性校验。

服务端校验向量：`User { id: 1, name: 'Proto测试用户' }` 的 protobuf 为 21 字节，包体长度字段为 39，完整包为 47 字节；哈希输入从偏移 8 开始，共 `14 + 21 = 35` 字节。计算哈希为 `1257880503`，包尾为 `4A F9 BB B7`。按无符号 byte 直接异或会得到旧值 `1429849271`，两端须使用相同的有符号解释。

### 示例

假设 `HelloReq` 的指令 ID 为 `0x01020304`、模块号为 `0x11`（仅用于展示，
实际数值由服务端分配），首条消息 `{ content: 'A' }` 的 protobuf 信息体为 3 字节，完整数据包为 29 字节：

```text
03 6D 6A 67 00 00 00 15
00 00 00 00 00 00 00 00 01 01 02 03 04 11
0A 01 41
42 22 80 C1
```

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

项目已配置自动编译脚本，详细说明见项目根目录的 `proto/README.md`：

```bash
# 编译所有proto文件
npm run proto

# 监听模式自动编译
npm run proto:watch

# 只检查生成文件是否最新
npm run proto:check

# 生成器和客户端本地模拟收发测试（Node.js 24+）
npm run proto:test
```

编译后会生成：
- `assets/script/WebSocket/proto/ProtoDefined.ts` - Cocos 使用的实现
- `assets/script/WebSocket/proto/ProtoDefined.d.ts` - TypeScript类型定义
- `assets/script/WebSocket/ProtoMessageType.ts` - 消息枚举
- `assets/script/WebSocket/ProtoRoutes.ts` - 路由表

## 最佳实践

### 1. 错误处理

```typescript
const resultErrorOwner = {};
const onServerResultError = (event: {
    detail: { code: number; messageName: string | null };
}) => {
    const { code, messageName } = event.detail;
    console.error('服务端业务错误:', code, '消息:', messageName);
    // 按服务端约定处理错误码，并结束对应界面的等待状态。
};
EventManager.Instance.addListener(ProtoNetworkMgr.EventType.RESULT_ERROR, onServerResultError, resultErrorOwner);

// 页面关闭时释放。
function stopResultErrorListener(): void {
    EventManager.Instance.removeListener(ProtoNetworkMgr.EventType.RESULT_ERROR, onServerResultError, resultErrorOwner);
}
```

连接错误单独通过网络对象的 `EventType.ERROR` 通知；服务端业务错误通过上面的 `RESULT_ERROR` 回调处理。

### 2. 请求监听的生命周期

发送和响应分别由 `send()` 与 `EventManager` 负责。请求结束或页面关闭时释放对应的响应监听和错误监听；继承 `BaseMgr`、`BaseComp` 的代码可使用项目现有的 `addEvent` 登记接口，随生命周期注销。

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
   - 检查响应路由的模块号和指令 ID 是否与服务端一致
   - 确认业务消息通过 `EventManager` 监听
   - 确认服务器已正确发送响应
   - 检查 `Result.code` 和 `Any.type_url`，非零错误码走 `RESULT_ERROR`

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
const batch: pbType.IBatchReq = {
    requests: [req1, req2, req3]
};
// 先新增 BatchReq、配置服务端路由并运行 npm run proto，再使用生成的类型和枚举。
network.send<pbType.IBatchReq>(ProtoRequestType.BatchReq, batch);
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

当前 `sendHeartbeat()` 使用已有的 `HelloReq`；服务端支持这一约定时，可使用下面的实现。`startHeartbeat()` 的定时调度当前处于注释状态，启用后才会自动发送。

```typescript
private sendHeartbeat(): void {
    this.send<pbType.IHelloReq>(ProtoRequestType.HelloReq, {
        content: 'heartbeat',
    });
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
