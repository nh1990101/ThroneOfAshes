# Proto 自动化工具

项目内 Node.js 工具，统一生成 protobuf 实现、类型、消息枚举和网络路由。CLI 与 Creator 菜单共用 `tools/generator.js`。

## 使用

在项目根目录安装已有依赖 `npm install`，然后运行：

```bash
npm run proto                  # 生成全部协议
npm run proto:watch            # 监听 .proto 和 routes.json（500ms 轮询）
npm run proto:check            # 检查产物是否最新，不写文件
npm run proto:check -- --strict # 额外要求全部网络消息已配置路由
npm run proto:test             # 生成器回归 + 客户端本地模拟收发
```

Windows 可双击 `proto/auto-compile.bat`；监听可执行 `proto/auto-compile.bat --watch`。
Mac/Linux 可运行 `sh proto/auto-compile.sh`。
生成工具使用 Node.js 18+；回归测试使用 Node.js 24+（测试通过 Node 的 TypeScript 转换能力加载真实运行时代码）。工具使用项目本地依赖，不会通过 npx 隐式下载编译器。

Creator 中使用“扩展 → protobufjs → 构建/强制构建”。更新工具后若编辑器已打开，先重新加载该扩展；自动监听以 `npm run proto:watch` 为准。CLI 不依赖编辑器运行。

## 协议与生成文件

输入为 `proto/**/*.proto`，支持子目录、import 和多个 package；源文件保留服务端定义，生成的 TypeScript 类型统一放在 `pbType`。例如 `package com.message; message User` 生成 `pbType.User` 和 `pbType.IUser`；登录协议直接使用 `pbType.IAccountLoginReq`，公共返回类型为 `pbType.IResult`、`pbType.IAny`。字段大小写保持原样，普通嵌套类型保留在所属类型下，例如 `pbType.Item.Stats`；嵌套 message 中的网络消息暂不支持。

生成文件：

- `assets/script/WebSocket/proto/ProtoDefined.ts`：Cocos 使用的静态编解码实现。
- `assets/script/WebSocket/proto/ProtoDefined.d.ts`：类型声明，包含正确的 protobufjs/Long 类型导入。
- `assets/script/WebSocket/ProtoMessageType.ts`：请求和服务器消息枚举。
- `assets/script/WebSocket/ProtoRoutes.ts`：完整路由表和测试配置标记。

以上文件不要手改，应随协议变更一起提交。既有 `.meta` 保持不变；文件内容相同不重复写入。工具先完成编译和校验再更新产物，失败不会先覆盖现有产物。工具不改写 `ProtoNetworkMgr.ts`，不修改服务器地址、心跳、重连等配置。

## 消息分类

默认按名称分类：`*Req` 为请求，`*Resp` 和 `Ntf*` 为服务器消息，其余只作为数据结构。例如 `GMCMDDesc` 没有网络路由。

例外在 `routes.json` 的可选 `roles` 对象中指定：

```json
"roles": {
    "CustomPush": "server",
    "LegacyReq": "data",
    "com.message.User": "both"
}
```

有效值为 `request`、`server`、`both`、`data`。`both` 表示同一个 message 用于发送和接收，会进入两个枚举，并在两个方向共用同一条路由。没有 Req/Resp/Ntf 标记的 User 默认是数据结构，须显式配置角色才能作为网络消息。

roles/routes 的键使用完整消息名，例如 `com.message.User`。旧 `pb` 包可继续使用 `HelloReq` 简名，也可使用 `pb.HelloReq`，但不能同时为同一条消息填写两份配置。其他包必须使用完整名，避免同名消息被误选。

旧 `pb` 的枚举值和事件名保持 `HelloReq`；其他包保留源消息标识，例如 `ProtoRequestType.User = 'com.message.User'`。这些字符串用于匹配现有路由和事件，客户端类型统一为 `pbType.User`。网络管理器根据消息名从 `pbType` 查找 codec。

统一命名空间中的顶层消息、枚举和服务名必须唯一；不同源包有同名类型时，生成器会列出冲突并保留旧产物，不能静默覆盖。跨包字段引用会重写到 `pbType`，字段编号、二进制编码以及 `getTypeUrl()` 返回的服务端原始类型标识保持一致，支持 `Result.content` 的 Any 数据。

## 路由与测试 ID

唯一手动维护入口是 `proto/routes.json`：

```json
{
    "testOnly": true,
    "defaultModuleId": 1,
    "roles": {
        "com.message.User": "both"
    },
    "routes": {
        "HelloReq": { "commandId": 1001 },
        "HelloResp": { "commandId": 1001 },
        "UseGMCMDReq": { "commandId": 1002 },
        "UseGMCMDResp": { "commandId": 1002 },
        "NtfGMCMDInit": { "commandId": 1003 },
        "com.message.User": { "commandId": 1004 }
    }
}
```

这些 moduleId/commandId 是固定测试值，尚未经服务端确认。工具会打印测试路由提示，但不会主动连接服务器。请求与对应响应可以使用相同二元组；不同请求之间、服务器响应和通知之间分别要求二元组唯一。

模块号缺省使用 `defaultModuleId`，每条路由也可显式填写 `moduleId`。指令 ID 必须是 int32，模块号必须为 0~255。服务端提供真实配置后，替换这些值并将 `testOnly` 改为 `false`，再运行 `npm run proto`。

新增网络消息时会生成枚举及 `null` 路由，并提示补充配置；工具不会自行分配或变更 ID。`null` 路由对应的请求不会发送、服务器消息不会解码。普通生成/检查允许此待配置状态，`--strict` 将其视为错误。

删除或重命名消息后，需同步清理或调整 routes/roles 中旧名称；未知名称会报错，避免遗留配置被静默忽略。

## 使用服务端 User 协议

`user.proto` 保持服务端定义；当前将 User 显式标记为 `both`，并沿用测试模块号 1、测试指令 1004。真实 ID 未确定时也可将 `"com.message.User": null`，工具仍会生成类型与枚举，但网络管理器会拒绝未配置路由的发送/接收。

```typescript
import type { pbType } from './proto/ProtoDefined.d';
import { ProtoRequestType, ProtoServerMessageType } from './ProtoMessageType';

const user: pbType.IUser = { id: 1, name: 'test' };
network.send<pbType.IUser>(ProtoRequestType.User, user);
// 响应/推送事件监听 ProtoServerMessageType.User，其值为 com.message.User。
```

`IUser` 仅为 TypeScript 类型；运行时编解码类从 `ProtoDefined` 导入 `pbType` 后使用 `pbType.User`。同时需要类型与运行时类的模块，可分别使用 `import type { pbType } from './proto/ProtoDefined.d'` 和 `import { pbType as protoCodecs } from './proto/ProtoDefined'`。`int64` 超过 JavaScript 安全整数范围时使用 `Long` 值，不要先转成 number。

## 日常流程

1. 修改或新增 `.proto`。
2. 在 `routes.json` 配置服务端路由；开发中暂未确定的消息可保持缺省或 `null`。
3. 执行 `npm run proto`，或保持监听运行。
4. 在代码中使用生成的枚举和 `ProtoDefined.d` 中的类型。
5. 提交前运行 `npm run proto:check`；修改工具时运行 `npm run proto:test`。

监听模式串行生成，编译期间的后续变更会在下一轮补跑。CLI/Creator 同时构建会通过锁拒绝重叠执行，监听模式会自动重试。进程异常退出遗留的锁会在错误信息中显示路径，确认没有编译进程后可删除该锁文件并重试。

## 验证范围

`proto:test` 在临时目录验证真实生成的 codec、增删协议、配置错误、旧产物保护、检查模式及元数据保留；本地收发测试加载真实 `ProtoNetworkMgr` 和 `EventManager`，经模拟 WebSocket 完成请求封包、模拟服务端解码、响应和通知派发。该测试未连接远程服务器，不能替代真实协议联调及 Creator 预览/构建。
