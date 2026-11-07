# Proto 自动化管理工具

本项目使用 protobufjs 生成 Cocos Creator 3.8.8 使用的 TypeScript 协议实现和声明。协议、消息枚举和路由采用统一生成流程，CLI 与现有 Creator 插件共用一个核心。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `proto/**/*.proto` | 协议源文件 |
| `proto/routes.json` | 手动维护服务端指令 ID、模块号和可选消息分类例外 |
| `proto/auto-compile.js` | CLI、监听与检查入口 |
| `proto/auto-compile.bat/.sh` | Windows 和 shell 启动入口 |
| `proto/tools/generator.js` | 编译、Cocos 兼容处理、产物检查和写入 |
| `proto/tools/schema.js` | 解析消息角色、校验路由、生成枚举和路由表 |
| `proto/tools/namespace.js` | 将服务端类型及跨包引用统一到客户端 pbType |
| `.protobufjs.js` | Creator 插件调用共享核心的适配配置 |
| `assets/script/WebSocket/proto/ProtoDefined.ts/.d.ts` | 自动生成的 codec 和类型 |
| `assets/script/WebSocket/ProtoMessageType.ts` | 自动生成的字符串消息枚举 |
| `assets/script/WebSocket/ProtoRoutes.ts` | 自动生成的完整路由表 |
| `assets/script/WebSocket/ProtoConfig.ts` | 服务器、心跳、重连等运行配置，并引用生成路由 |
| `assets/script/WebSocket/ProtoNetworkMgr.ts` | 实际网络收发、请求注册和事件分发 |

## 行为约定

- 支持多个源 package，服务端 `.proto` 不变，生成的 TypeScript 统一为 `pbType`（例如 `pbType.IUser`、`pbType.IAccountLoginReq`）。跨包字段和枚举引用会重写，同名顶层类型明确报错；原始 Any 类型标识保留。路由配置和事件仍使用源消息标识，旧 pb 简名保持兼容。
- `Req` 后缀为请求，`Resp` 后缀或 `Ntf` 前缀为服务器消息；其他 message 默认作为数据结构，可在 routes.json 中声明角色（含双向 `both`）。
- 路由为 `{ commandId, moduleId }`。工具不为新增协议自动发号；缺路由生成为 `null` 并提示，严格模式会报错。
- 当前固定测试模块为 1，测试指令为 1001（Hello）、1002（GM 请求/响应）、1003（GM 通知）、1004（com.message.User 双向消息）。`testOnly: true` 表示尚未经服务端确认。
- 生成器保留 proto 字段大小写和 Long 类型；先编译校验再写产物，无变化不重写，保留已有 `.meta`。
- 生成器不重写网络管理器或整份运行配置。请求和响应可复用路由，服务器接收方向的重复路由会报错。
- 服务端信息体统一为 `Result`：成功时解开 `Any.value` 并派发原业务事件，非零错误码通过独立 `RESULT_ERROR` 事件分发。无 content 的成功事件 detail 为 null；Any 完整类型名与对应路由校验，客户端发送仍为原始请求。
- 当前网络包为 8 字节 mjg 包头 + 14 字节信息头 + protobuf 信息体 + 4 字节 int32 BPHash，全部 int32 为大端序。长度字段记录包体总长度（14 + protobuf长度 + 4），不含 8 字节包头；解码时减去信息头和哈希长度。BPHash 输入为偏移 8 开始的信息头和 protobuf，长度为包体长度减 4，逐字节按服务端有符号 byte（-128~127）规则计算；User 示例输入长度为 35。接收哈希通过 event.header.hashCode 提供且不参与 protobuf 解码。

## 命令与验证

```bash
npm run proto
npm run proto:watch
npm run proto:check
npm run proto:check -- --strict
npm run proto:test
```

工具无需打开 Creator；Creator 菜单“扩展 → protobufjs → 构建/强制构建”也调用相同核心。监听协议及路由请运行 `proto:watch`。测试使用 Node.js 24+，涵盖生成器、故障保护、元数据及真实客户端代码的模拟收发；远程服务器联调和 Creator 预览/构建仍需在对应环境验证。

使用步骤见 [QUICK_START.md](QUICK_START.md)，详细约定见 [proto/README.md](proto/README.md)。
