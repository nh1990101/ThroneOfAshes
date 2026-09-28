# Proto 自动编译工具

这是一个用于自动编译 proto 文件并更新相关 TypeScript 代码的工具脚本。

## 📁 目录结构

```
proto/                              # Proto 源文件目录
├── *.proto                         # 所有协议定义文件
├── auto-compile.js                 # 自动编译脚本
├── auto-compile.bat                # Windows 启动脚本
├── auto-compile.sh                 # Mac/Linux 启动脚本
└── README.md                       # 本文档

assets/script/WebSocket/proto/      # 生成文件目录
├── proto.js                        # 编译后的 JS 文件（自动生成）
└── proto.d.ts                      # TypeScript 类型定义（自动生成）

assets/script/WebSocket/            # 网络管理类目录
├── ProtoConfig.ts                  # 消息 ID 配置（自动生成）
└── ProtoNetworkMgr.ts              # 网络管理器（自动更新）
```

## 功能特性

✨ **自动编译 proto 文件** - 将所有 `.proto` 文件编译为 `proto.js` 和 `proto.d.ts`

✨ **自动生成消息配置** - 扫描所有消息类型，自动更新 `ProtoConfig.ts` 中的枚举和映射

✨ **自动更新编解码逻辑** - 自动更新 `ProtoNetworkMgr.ts` 中的 `encode` 和 `decode` 方法

✨ **监听模式** - 实时监听 proto 文件变化，自动重新编译

✨ **智能 ID 管理** - 保留已有消息的 ID，只为新消息分配 ID

✨ **文件分离** - Proto 源文件与生成文件分离，保持目录整洁

## 使用方法

### 方法一：直接运行脚本（推荐 Windows 用户）

**Windows:**
```bash
# 双击运行
proto/auto-compile.bat

# 或命令行运行
cd proto
auto-compile.bat
```

**Mac/Linux:**
```bash
cd proto
./auto-compile.sh
```

运行后会提示选择模式：
- **[1] 编译一次后退出** - 适合手动触发编译
- **[2] 监听模式** - 自动检测 proto 文件变化，实时编译

### 方法二：使用 npm 脚本（推荐开发时）

```bash
# 编译一次
npm run proto

# 监听模式
npm run proto:watch
```

### 方法三：直接用 node 运行

```bash
# 编译一次
node proto/auto-compile.js

# 监听模式
node proto/auto-compile.js --watch
```

## 工作流程

1. **编译 proto 文件**
   - 读取 `proto/` 目录下的所有 `.proto` 文件
   - 使用 `protobufjs` 编译为 `proto.js`
   - 生成 TypeScript 类型定义 `proto.d.ts`
   - 输出到 `assets/script/WebSocket/proto/` 目录

2. **更新 ProtoConfig.ts**
   - 解析所有 message 定义
   - 生成 `ProtoMsgId` 枚举
   - 生成 `ProtoMsgName` 映射表
   - 智能保留已有消息的 ID

3. **更新 ProtoNetworkMgr.ts**
   - 自动生成 `encodeProtoMessage` 方法的所有 case 分支
   - 自动生成 `decodeProtoMessage` 方法的所有 case 分支
   - 保持其他代码不变

## 添加新协议的流程

1. **编写 proto 文件**
   ```protobuf
   // proto/battle.proto
   syntax = "proto3";
   package pb;
   
   message AttackReq {
       int32 unitId = 1;
       int32 targetId = 2;
   }
   
   message AttackResp {
       bool success = 1;
       int32 damage = 2;
   }
   ```

2. **运行编译脚本**
   ```bash
   npm run proto
   # 或双击 auto-compile.bat
   ```

3. **直接使用**
   ```typescript
   // 自动生成的代码已包含所有类型
   const response = await ProtoNetworkMgr.instance.sendRequest(
       ProtoMsgId.AttackReq,
       { unitId: 1, targetId: 2 }
   );
   ```

## 注意事项

⚠️ **不要手动修改以下文件：**
- `assets/script/WebSocket/proto/proto.js`
- `assets/script/WebSocket/proto/proto.d.ts`
- `assets/script/WebSocket/ProtoConfig.ts` 的枚举和映射部分
- `assets/script/WebSocket/ProtoNetworkMgr.ts` 的 encode/decode 方法内部

⚠️ **消息 ID 管理：**
- 首次编译时，消息 ID 从 1001 开始自动分配
- 已分配的 ID 会被记住，删除消息后 ID 不会被复用
- 如需手动指定 ID，请在首次编译前手动编辑 ProtoConfig.ts

⚠️ **Proto 文件规范：**
- 所有 proto 文件必须放在 `proto/` 目录
- 包名统一使用 `package pb;`
- message 名称使用大驼峰命名

## 故障排查

### 编译失败
```bash
# 检查 protobufjs 是否安装
npm list protobufjs

# 重新安装依赖
npm install protobufjs protobufjs-cli
```

### 类型提示不工作
```bash
# 确保 proto.d.ts 已生成
ls assets/script/WebSocket/proto/proto.d.ts

# 重启 TypeScript 服务（VSCode 中按 Ctrl+Shift+P）
> TypeScript: Restart TS Server
```

### 监听模式不响应
- 确保 proto 文件保存成功
- 检查控制台是否有错误信息
- 尝试手动编译一次排查问题

## 相关文档

- **使用指南** - `assets/script/WebSocket/PROTO_USAGE.md`
- **多文件方案** - `assets/script/WebSocket/PROTO_MULTI_FILES.md`

## 技术栈

- **protobufjs** - Proto 编译和运行时
- **chokidar** - 文件监听
- **Node.js** - 脚本运行环境
