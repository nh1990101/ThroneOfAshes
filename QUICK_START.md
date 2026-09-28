# Proto 网络管理系统 - 快速开始

## 🎯 5 分钟上手指南

### 步骤 1：添加新协议

在 `proto/` 目录下创建或编辑 `.proto` 文件：

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

### 步骤 2：运行编译脚本

**Windows 用户（推荐）：**
```bash
双击运行：proto/auto-compile.bat
```

**或使用 npm 命令：**
```bash
npm run proto
```

**脚本会自动完成：**
- ✅ 编译 proto 到 `assets/script/WebSocket/proto/proto.js`
- ✅ 生成类型定义 `proto.d.ts`
- ✅ 更新 `ProtoConfig.ts` 添加消息 ID
- ✅ 更新 `ProtoNetworkMgr.ts` 添加编解码逻辑

### 步骤 3：在代码中使用

```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';
import { ProtoMsgId } from './WebSocket/ProtoConfig';

// 游戏启动时初始化（只需一次）
ProtoNetworkMgr.instance.init();
await ProtoNetworkMgr.instance.connect();

// 监听服务器推送
ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, (data) => {
    console.log('收到推送:', data);
});

// 发送请求（Promise 风格）
const response = await ProtoNetworkMgr.instance.sendRequest(
    ProtoMsgId.AttackReq,
    { unitId: 1, targetId: 2 }
);
console.log('攻击结果:', response.success, '伤害:', response.damage);
```

---

## 📁 项目结构说明

```
proto/                              ← 只放 .proto 协议文件
├── gmcmd.proto
├── battle.proto
└── auto-compile.bat                ← 双击运行编译

assets/script/WebSocket/proto/      ← 自动生成的文件（不要手动修改）
├── proto.js
└── proto.d.ts

assets/script/WebSocket/
├── ProtoNetworkMgr.ts              ← 网络管理器
└── ProtoConfig.ts                  ← 消息 ID 配置（自动生成）
```

---

## 🚀 常用命令

```bash
# 编译一次
npm run proto

# 监听模式（自动编译）
npm run proto:watch

# Windows 双击运行
proto/auto-compile.bat
```

---

## 💡 核心 API

### 发送请求
```typescript
// 基础用法
const response = await ProtoNetworkMgr.instance.sendRequest(
    ProtoMsgId.UseGMCMDReq,
    { cmd: 'test', args: [] }
);

// 自定义超时时间
const response = await ProtoNetworkMgr.instance.sendRequest(
    ProtoMsgId.UseGMCMDReq,
    { cmd: 'test', args: [] },
    15000  // 15 秒超时
);

// 错误处理
try {
    const response = await ProtoNetworkMgr.instance.sendRequest(...);
} catch (error) {
    console.error('请求失败:', error.message);
}
```

### 监听推送消息
```typescript
// 注册监听器
ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, (data) => {
    console.log('GM 初始化数据:', data);
});

// 移除监听器
const handler = (data) => { /* ... */ };
ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, handler);
ProtoNetworkMgr.instance.off(ProtoMsgId.NtfGMCMDInit, handler);

// 监听一次
ProtoNetworkMgr.instance.once(ProtoMsgId.NtfGMCMDInit, (data) => {
    console.log('只触发一次');
});
```

### 连接管理
```typescript
// 初始化
ProtoNetworkMgr.instance.init();

// 连接服务器
await ProtoNetworkMgr.instance.connect();

// 断开连接
ProtoNetworkMgr.instance.close();
```

---

## ⚠️ 重要提示

### ✅ 应该做的
- ✅ 所有 `.proto` 文件放在 `proto/` 目录
- ✅ 修改 proto 后立即运行编译脚本
- ✅ 使用 `ProtoMsgId` 枚举引用消息 ID
- ✅ 使用 `await` 处理异步请求

### ❌ 不应该做的
- ❌ 不要手动修改 `proto.js` 和 `proto.d.ts`
- ❌ 不要手动修改 `ProtoConfig.ts` 的枚举部分
- ❌ 不要手动修改 `ProtoNetworkMgr.ts` 的 encode/decode 方法
- ❌ 不要把生成的文件提交到 git（建议加入 .gitignore）

---

## 📚 详细文档

- **编译工具详细说明** → `proto/README.md`
- **网络管理器完整 API** → `assets/script/WebSocket/PROTO_USAGE.md`
- **多文件管理方案** → `assets/script/WebSocket/PROTO_MULTI_FILES.md`
- **完整项目总结** → `PROJECT_SUMMARY.md`

---

## 🎉 完成！

现在你已经掌握了 Proto 网络管理系统的基本用法！

**工作流程总结：**
1. 编辑 proto 文件
2. 双击运行 `auto-compile.bat`
3. 直接在代码中使用，享受完整类型提示

祝开发顺利！🚀
