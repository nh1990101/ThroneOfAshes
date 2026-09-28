# Proto 网络管理器使用文档

## 文件结构

```
WebSocket/
├── GameWebSocket.ts          (原有 - WebSocket连接管理)
├── ProtoNetworkMgr.ts        (新增 - Proto消息管理)
├── ProtoConfig.ts            (新增 - 消息ID配置)
└── ProtoNetworkExample.ts    (新增 - 使用示例)

proto/
├── gmcmd.proto               (Proto定义文件)
├── gmcmd.js                  (编译后的JS文件)
└── gmcmd.d.ts                (TypeScript类型定义)
```

## 快速开始

### 1. 初始化和连接

```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';
import { ProtoMsgId } from './WebSocket/ProtoConfig';

// 初始化
ProtoNetworkMgr.instance.init();

// 连接服务器
const connected = await ProtoNetworkMgr.instance.connect();
if (connected) {
    console.log('连接成功');
}
```

### 2. 发送请求

```typescript
// 使用GM指令示例
try {
    const response = await ProtoNetworkMgr.instance.sendRequest(
        ProtoMsgId.UseGMCMDReq,
        {
            cmd: 'addItem',
            args: ['1001', '100']
        }
    );
    console.log('响应:', response.msg);
} catch (error) {
    console.error('请求失败:', error);
}

// 设置自定义超时时间（毫秒）
const response = await ProtoNetworkMgr.instance.sendRequest(
    ProtoMsgId.UseGMCMDReq,
    data,
    5000  // 5秒超时
);
```

### 3. 监听推送消息

```typescript
// 注册推送消息处理器
ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, (data) => {
    console.log('收到GM初始化:', data);
}, this);

// 移除推送监听
ProtoNetworkMgr.instance.off(ProtoMsgId.NtfGMCMDInit, handler);
```

### 4. 断开连接

```typescript
ProtoNetworkMgr.instance.disconnect();
```

## 协议格式

### 消息结构

```
[4字节] 总长度（不包括自身）
[4字节] 消息ID
[4字节] 序列号（请求>0，推送=0）
[N字节] Proto二进制数据
```

- **总长度**: 后续所有字节的长度
- **消息ID**: 标识消息类型（见 ProtoConfig.ts）
- **序列号**: 
  - 客户端请求: 自增序列号（>0）
  - 服务器响应: 与请求的序列号相同
  - 服务器推送: 0
- **字节序**: 大端（Big-Endian）

### 消息流程

**请求-响应模式：**
```
客户端: Seq=1, MsgId=UseGMCMDReq  →  服务器
客户端: ← Seq=1, MsgId=UseGMCMDResp  服务器
```

**推送模式：**
```
客户端: ← Seq=0, MsgId=NtfGMCMDInit  服务器
```

## 添加新的Proto消息

### 步骤1: 定义Proto消息

在 `proto/gmcmd.proto` 中添加新消息：

```protobuf
message LoginReq {
    string username = 1;
    string password = 2;
}

message LoginResp {
    int32 uid = 1;
    string token = 2;
}
```

### 步骤2: 重新编译Proto

```bash
npm run proto
```

### 步骤3: 添加消息ID

在 `ProtoConfig.ts` 中添加：

```typescript
export enum ProtoMsgId {
    // 新增
    LoginReq = 2001,
    LoginResp = 2002,
}

export const ProtoMsgName = {
    [ProtoMsgId.LoginReq]: 'LoginReq',
    [ProtoMsgId.LoginResp]: 'LoginResp',
}
```

### 步骤4: 添加编解码逻辑

在 `ProtoNetworkMgr.ts` 中添加：

```typescript
// encodeProtoMessage 方法中添加
case ProtoMsgId.LoginReq:
    return pb.LoginReq.encode(data).finish();

// decodeProtoMessage 方法中添加
case ProtoMsgId.LoginResp:
    return pb.LoginResp.decode(buffer);
```

### 步骤5: 使用新消息

```typescript
const response = await ProtoNetworkMgr.instance.sendRequest(
    ProtoMsgId.LoginReq,
    {
        username: 'test',
        password: '123456'
    }
);
console.log('登录成功, UID:', response.uid);
```

## API 参考

### ProtoNetworkMgr

**静态属性**
- `instance: ProtoNetworkMgr` - 单例实例

**方法**
- `init(): void` - 初始化网络管理器
- `connect(): Promise<boolean>` - 连接服务器
- `disconnect(): void` - 断开连接
- `isOnline(): boolean` - 检查是否在线
- `sendRequest<T>(msgId, data, timeout?): Promise<T>` - 发送请求
- `on(msgId, handler, target?)` - 注册推送监听
- `off(msgId, handler)` - 移除推送监听
- `getPendingRequestCount(): number` - 获取待处理请求数
- `clearAllHandlers(): void` - 清理所有推送监听器

## 注意事项

1. **初始化顺序**: 必须先调用 `init()` 再调用 `connect()`
2. **编解码**: 每添加新消息都需要在 `encodeProtoMessage` 和 `decodeProtoMessage` 中添加对应的编解码逻辑
3. **超时处理**: 默认请求超时10秒，可通过第三个参数自定义
4. **错误处理**: 所有请求都返回Promise，建议使用 try-catch 捕获错误
5. **内存泄漏**: 组件销毁时记得移除推送监听器
6. **混合模式**: 支持Proto和JSON消息混用，自动判断消息类型

## 与原有WebSocket的兼容性

- `ProtoNetworkMgr` 基于 `GameWebSocket` 封装，不影响原有功能
- 自动判断消息类型：
  - `ArrayBuffer` → Proto消息处理
  - `String` → 原有JSON消息处理
- 可以同时使用两种消息格式

## 常见问题

**Q: 如何调试Proto消息？**
A: 打开浏览器控制台，所有消息的收发都会有日志输出

**Q: 如何处理请求超时？**
A: 请求返回的Promise会reject，捕获错误即可
```typescript
try {
    await ProtoNetworkMgr.instance.sendRequest(...)
} catch (error) {
    if (error.message.includes('超时')) {
        // 处理超时
    }
}
```

**Q: 服务器推送的消息没有被处理？**
A: 确保：
1. 推送消息的序列号为0
2. 已注册对应的消息ID监听器
3. 在 `decodeProtoMessage` 中添加了解码逻辑

**Q: Proto文件更新后没生效？**
A: 运行 `npm run proto` 重新编译
