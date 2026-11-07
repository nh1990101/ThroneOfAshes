# Proto 工具快速开始

完整配置与排错说明见 [proto/README.md](proto/README.md)。

1. 在 `proto/` 或其子目录放入 `.proto`，保留服务端源文件；生成的 TypeScript 统一使用 `pbType`。
2. 请求以 `Req` 结尾，响应以 `Resp` 结尾，通知以 `Ntf` 开头；其他名称在 routes.json 的 roles 中指定方向，`both` 表示双向消息。
3. 在 `proto/routes.json` 填写消息的 `commandId/moduleId`。
4. 双击 `proto/auto-compile.bat`，或在项目根目录运行：

```bash
npm run proto
```

自动生成 `ProtoDefined.ts`、`ProtoDefined.d.ts`、`ProtoMessageType.ts`、`ProtoRoutes.ts`。现有网络管理器通过生成的枚举注册请求，通过生成的路由匹配响应和通知。

当前 routes.json 使用 `moduleId = 1`，Hello 指令 ID 为 1001、GM 请求/响应为 1002、GM 通知为 1003、User 双向消息为 1004。它们全部是固定测试值，真实联调前应替换为服务端提供的 ID，并将 `testOnly` 改为 `false`。

新增消息未配置路由时会自动生成 `null` 并提示补充；不会自动分配 ID。

服务端返回统一包装为 `Result`：`code = 0` 时自动解开 `Any.value` 并将实际响应放入原消息事件的 `event.detail`，无 content 时为 `null`；非零错误码通过 `ProtoNetworkMgr.EventType.RESULT_ERROR` 分发，监听器从 `event.detail.code` 读取。业务成功事件额外包含 `event.code`、`event.typeUrl`。

服务端 `package com.message; message User` 的客户端类型统一为 `pbType.IUser`。当前已在 roles 中配置为 `both`，可使用 `network.send<pbType.IUser>(ProtoRequestType.User, { id: 1, name: 'test' })`；类型导入为 `import type { pbType } from './WebSocket/proto/ProtoDefined.d'`。登录消息使用 `pbType.IAccountLoginReq`。路由配置继续使用源文件中的完整名，例如 `com.message.User`。

```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';
import { ProtoRequestType, ProtoServerMessageType } from './WebSocket/ProtoMessageType';
import type { pbType } from './WebSocket/proto/ProtoDefined.d';
import { EventManager } from './Common/EventManager';

// 响应和通知通过 EventManager 接收；组件中优先使用 BaseComp.addEvent。
const onHello = (event) => console.log(event.detail, event.header);
const owner = {};
EventManager.Instance.addListener(ProtoServerMessageType.HelloResp, onHello, owner);

// connect 返回 Promise<boolean>；send 为单向发送，不返回响应 Promise。
const network = ProtoNetworkMgr.instance;
if (await network.connect('ws://your-server/websocket')) {
    network.send<pbType.IHelloReq>(ProtoRequestType.HelloReq, { content: 'Hello' });
}

// 离开业务页面时移除监听。
EventManager.Instance.removeListener(ProtoServerMessageType.HelloResp, onHello, owner);
```

常用命令：

```bash
npm run proto:watch   # 保存协议或路由后自动生成
npm run proto:check   # 只检查生成文件是否最新
npm run proto:test    # 生成器与本地模拟收发测试（Node.js 24+）
```

生成文件和对应 `.meta` 应随协议变更一起提交。不要手工修改生成文件，也不要在 `ProtoConfig.ts` 中维护路由；应编辑 `proto/routes.json` 后重新生成。
