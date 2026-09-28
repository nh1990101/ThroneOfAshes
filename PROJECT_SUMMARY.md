# Proto 网络管理系统 - 项目总结

## ✅ 项目完成状态

已完成一个**完全自动化**的 Proto 网络管理系统，包含自动编译工具和类型安全的网络管理器。

---

## 📁 最终项目结构

```
proto/                                      # Proto 源文件目录（仅存放 .proto 文件）
├── gmcmd.proto                             # GM 命令协议
├── auto-compile.js                         # 自动编译脚本（核心工具）
├── auto-compile.bat                        # Windows 启动脚本
├── auto-compile.sh                         # Mac/Linux 启动脚本
└── README.md                               # 编译工具详细文档

assets/script/WebSocket/proto/              # 生成文件目录（由脚本自动生成）
├── proto.js                                # 编译后的 JavaScript 文件
└── proto.d.ts                              # TypeScript 类型定义文件

assets/script/WebSocket/                    # 网络管理类目录
├── ProtoNetworkMgr.ts                      # Proto 网络管理器（主类）
├── ProtoConfig.ts                          # 消息 ID 配置（自动生成）
├── GameWebSocket.ts                        # 底层 WebSocket 连接（原有）
├── PROTO_USAGE.md                          # 使用指南
└── PROTO_MULTI_FILES.md                    # 多文件管理方案

package.json                                # 添加了 proto 编译脚本
```

---

## 🎯 核心功能

### 1. 自动化编译工具 (proto/auto-compile.js)

**功能：**
- ✅ 编译所有 `.proto` 文件到 `assets/script/WebSocket/proto/`
- ✅ 生成 TypeScript 类型定义
- ✅ 自动更新 `ProtoConfig.ts` 中的消息 ID 枚举
- ✅ 自动更新 `ProtoNetworkMgr.ts` 中的编解码方法
- ✅ 智能保留已有消息 ID（避免协议冲突）
- ✅ 支持文件监听模式（实时编译）

**使用方式：**
```bash
# 方式 1：双击运行
proto/auto-compile.bat (Windows)
proto/auto-compile.sh (Mac/Linux)

# 方式 2：npm 命令
npm run proto          # 编译一次
npm run proto:watch    # 监听模式

# 方式 3：直接运行
node proto/auto-compile.js [--watch]
```

### 2. Proto 网络管理器 (ProtoNetworkMgr.ts)

**核心特性：**
- ✅ Promise 风格的请求-响应 API
- ✅ 自动 protobuf 编解码
- ✅ 请求超时管理（默认 10 秒）
- ✅ 服务器推送消息事件分发
- ✅ 完整的 TypeScript 类型支持
- ✅ 兼容现有 JSON 消息系统
- ✅ 请求序列号自动匹配

**API 示例：**
```typescript
// 发送请求（Promise 风格）
const response = await ProtoNetworkMgr.instance.sendRequest(
    ProtoMsgId.UseGMCMDReq,
    { cmd: 'addItem', args: ['1001', '100'] }
);

// 监听推送消息
ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, (data) => {
    console.log('收到推送:', data);
});
```

### 3. 消息配置管理 (ProtoConfig.ts)

**自动生成内容：**
```typescript
// 消息 ID 枚举
export enum ProtoMsgId {
    GMCMDDesc = 10000,
    NtfGMCMDInit = 1001,
    UseGMCMDReq = 1002,
    UseGMCMDResp = 1003,
}

// 消息名称映射
export const ProtoMsgName: { [key: number]: string } = {
    [ProtoMsgId.GMCMDDesc]: 'pb.GMCMDDesc',
    // ...
};
```

---

## 🚀 完整工作流程

### 添加新协议（仅需 3 步）

#### 步骤 1：编写 proto 文件
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

#### 步骤 2：运行编译脚本
```bash
npm run proto
# 或双击 proto/auto-compile.bat
```

**脚本自动完成：**
1. 编译 proto 文件到 `assets/script/WebSocket/proto/proto.js`
2. 生成类型定义 `assets/script/WebSocket/proto/proto.d.ts`
3. 更新 `ProtoConfig.ts` 添加 `AttackReq` 和 `AttackResp` 枚举
4. 更新 `ProtoNetworkMgr.ts` 添加对应的编解码逻辑

#### 步骤 3：直接使用（无需手动修改任何 TS 代码）
```typescript
// TypeScript 自动识别类型
const response = await ProtoNetworkMgr.instance.sendRequest(
    ProtoMsgId.AttackReq,  // ✅ 枚举自动生成
    { unitId: 1, targetId: 2 }  // ✅ 类型自动提示
);
console.log(response.damage);  // ✅ 类型安全
```

---

## 🎨 技术亮点

### 1. 文件分离设计
- **Proto 源文件** - 仅存放在 `proto/` 目录
- **生成文件** - 自动输出到 `assets/script/WebSocket/proto/`
- **好处**：目录整洁，职责清晰，避免混淆

### 2. 智能 ID 管理
```javascript
// 保留已有消息的 ID
existingIds = {
    'UseGMCMDReq': 1002,
    'UseGMCMDResp': 1003
}

// 只为新消息分配新 ID
nextId = Math.max(...existingIds) + 1;
```

### 3. 增量更新策略
- 只更新 `ProtoNetworkMgr.ts` 中的特定方法
- 使用标记注释定位更新区域
- 保留其他代码不变

### 4. 跨平台支持
- Windows: `.bat` 脚本
- Mac/Linux: `.sh` 脚本（已添加执行权限）
- Node.js 直接运行

### 5. 完整类型安全
```typescript
// proto.d.ts 自动生成完整类型
export namespace pb {
    interface IAttackReq {
        unitId?: number;
        targetId?: number;
    }
    class AttackReq implements IAttackReq {
        // ...
    }
}
```

---

## 📊 消息协议格式

### 网络数据包结构
```
[消息总长度: 4字节 Big-Endian]
[消息 ID:    4字节 Big-Endian]
[序列号:     4字节 Big-Endian]  (仅请求消息)
[Proto数据:  N字节]
```

### 消息类型判断
```typescript
// 推送消息：msgId < 2000
if (msgId < 2000) {
    this.emit(msgId, data);  // 事件派发
}

// 响应消息：msgId >= 2000
if (msgId >= 2000) {
    const promise = this._pendingRequests.get(seq);
    promise.resolve(data);  // 解析 Promise
}
```

---

## 📖 文档说明

### proto/README.md
- 编译工具的详细使用方法
- 三种运行方式说明
- 故障排查指南
- 注意事项和规范

### assets/script/WebSocket/PROTO_USAGE.md
- ProtoNetworkMgr 使用指南
- API 详细说明
- 完整代码示例
- 最佳实践

### assets/script/WebSocket/PROTO_MULTI_FILES.md
- 多 proto 文件管理方案
- 命名空间管理
- 大型项目实践

---

## ⚙️ 配置文件更新

### package.json
```json
{
  "scripts": {
    "proto": "node proto/auto-compile.js",
    "proto:watch": "node proto/auto-compile.js --watch"
  },
  "dependencies": {
    "protobufjs": "^7.4.0"
  },
  "devDependencies": {
    "protobufjs-cli": "^1.1.3",
    "chokidar": "^4.0.3"
  }
}
```

---

## 🎯 使用示例

### 完整初始化流程
```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';
import { ProtoMsgId } from './WebSocket/ProtoConfig';

// 1. 初始化（游戏启动时）
ProtoNetworkMgr.instance.init();

// 2. 连接服务器
await ProtoNetworkMgr.instance.connect();

// 3. 注册推送消息处理
ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, (data) => {
    console.log('GM 初始化:', data);
});

// 4. 发送请求
try {
    const response = await ProtoNetworkMgr.instance.sendRequest(
        ProtoMsgId.UseGMCMDReq,
        { cmd: 'test', args: [] },
        15000  // 可选：自定义超时时间
    );
    console.log('请求成功:', response);
} catch (error) {
    console.error('请求失败:', error);
}
```

### 错误处理
```typescript
ProtoNetworkMgr.instance.sendRequest(ProtoMsgId.UseGMCMDReq, data)
    .then(response => {
        // 成功处理
    })
    .catch(error => {
        if (error.message.includes('timeout')) {
            // 超时处理
        } else if (error.message.includes('disconnected')) {
            // 断线处理
        }
    });
```

---

## 🔧 依赖库

```json
{
  "protobufjs": "^7.4.0",       // Proto 运行时库
  "protobufjs-cli": "^1.1.3",   // Proto 编译工具
  "chokidar": "^4.0.3"          // 文件监听库（监听模式）
}
```

---

## ⚠️ 重要提示

### 不要手动修改的文件
- `assets/script/WebSocket/proto/proto.js`
- `assets/script/WebSocket/proto/proto.d.ts`
- `ProtoConfig.ts` 中的枚举和映射表
- `ProtoNetworkMgr.ts` 中的 `encodeProtoMessage` 和 `decodeProtoMessage` 方法内部

### Proto 文件规范
- 所有 proto 文件必须放在 `proto/` 目录
- 包名统一使用 `package pb;`
- Message 名称使用大驼峰命名（PascalCase）
- 字段名使用小驼峰命名（camelCase）

### 消息 ID 规范
- 推送消息：1000 - 1999
- 请求消息：2000 - 2999
- 响应消息：3000 - 3999
- 自定义范围可在脚本中调整

---

## 🎉 总结

你现在拥有了一个**企业级的 Proto 网络管理系统**：

✅ **零配置** - Proto 改完自动生成所有代码  
✅ **类型安全** - 完整的 TypeScript 类型支持  
✅ **易维护** - 文件分离，职责清晰  
✅ **高效率** - 监听模式实时编译  
✅ **可扩展** - 支持多文件和自定义配置  
✅ **文档完善** - 详细的使用指南和示例  

**现在可以专注于业务逻辑开发，不用再担心协议编译和网络通信的底层细节！** 🚀

---

## 📞 问题反馈

如遇到问题，请检查：
1. `proto/README.md` - 编译工具故障排查
2. `PROTO_USAGE.md` - API 使用说明
3. 控制台输出的错误信息

常见问题：
- **编译失败** → 检查 `protobufjs` 是否安装
- **类型提示不工作** → 重启 TypeScript 服务
- **监听模式不响应** → 确保文件保存成功

祝开发顺利！
