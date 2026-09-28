# 多 Proto 文件管理方案

## 方案一：编译成一个 JS 文件（推荐⭐）

### 目录结构
```
proto/
├── gmcmd.proto          # GM指令相关
├── login.proto          # 登录相关
├── battle.proto         # 战斗相关
├── chat.proto           # 聊天相关
├── proto.js             # 编译后统一输出
└── proto.d.ts           # TypeScript类型定义
```

### 编译命令
```bash
# 编译所有proto文件到一个JS文件
npm run proto

# 只编译单个文件（保留旧的gmcmd.js）
npm run proto:gmcmd
```

### 使用方式
```typescript
// 所有消息类型都在一个文件里
import { pb } from '../../../proto/proto';

// 使用不同模块的消息
pb.UseGMCMDReq.encode(data).finish();
pb.LoginReq.encode(data).finish();
pb.BattleStartReq.encode(data).finish();
```

### ProtoNetworkMgr 修改
只需要修改 import 路径：
```typescript
// 原来
import { pb } from '../../../proto/gmcmd';

// 改为
import { pb } from '../../../proto/proto';
```

---

## 方案二：按模块编译多个 JS 文件

### 目录结构
```
proto/
├── gmcmd.proto
├── gmcmd.js
├── gmcmd.d.ts
├── login.proto
├── login.js
├── login.d.ts
├── battle.proto
├── battle.js
└── battle.d.ts
```

### 编译脚本
```json
{
  "scripts": {
    "proto": "npm run proto:gmcmd && npm run proto:login && npm run proto:battle",
    "proto:gmcmd": "cd proto && pbjs -t static-module -w commonjs -o gmcmd.js gmcmd.proto && pbts -o gmcmd.d.ts gmcmd.js",
    "proto:login": "cd proto && pbjs -t static-module -w commonjs -o login.js login.proto && pbts -o login.d.ts login.js",
    "proto:battle": "cd proto && pbjs -t static-module -w commonjs -o battle.js battle.proto && pbts -o battle.d.ts battle.js"
  }
}
```

### ProtoNetworkMgr 修改

需要 import 多个模块：
```typescript
import { pb as gmcmdPb } from '../../../proto/gmcmd';
import { pb as loginPb } from '../../../proto/login';
import { pb as battlePb } from '../../../proto/battle';

// 编码时根据消息类型选择对应的 pb
private encodeProtoMessage(msgId: number, data: any): Uint8Array | null {
    try {
        switch (msgId) {
            // GM相关
            case ProtoMsgId.UseGMCMDReq:
                return gmcmdPb.UseGMCMDReq.encode(data).finish();

            // 登录相关
            case ProtoMsgId.LoginReq:
                return loginPb.LoginReq.encode(data).finish();

            // 战斗相关
            case ProtoMsgId.BattleStartReq:
                return battlePb.BattleStartReq.encode(data).finish();

            default:
                return null;
        }
    } catch (error) {
        return null;
    }
}
```

---

## 方案三：Proto 文件之间有依赖关系

### 示例：公共消息定义

```protobuf
// common.proto
syntax = "proto3";
package pb;

message CommonHeader {
    int32 code = 1;
    string msg = 2;
}

// login.proto
syntax = "proto3";
package pb;
import "common.proto";

message LoginResp {
    CommonHeader header = 1;
    int32 uid = 2;
    string token = 3;
}
```

### 编译命令
```bash
# 方案A：一起编译
pbjs -t static-module -w commonjs -o proto.js common.proto login.proto battle.proto

# 方案B：指定依赖路径
pbjs -t static-module -w commonjs -p proto/ -o login.js login.proto
```

---

## 推荐方案对比

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **方案一** | 中小型项目（<20个proto） | 简单、易维护 | 单文件较大 |
| **方案二** | 大型项目、模块化开发 | 按需加载、清晰 | 配置复杂 |
| **方案三** | 有公共消息定义 | 代码复用 | 需要管理依赖 |

---

## 我的建议

根据你的项目，**推荐使用方案一**：

### 理由
1. Cocos Creator 项目通常协议文件不会太多
2. 打包后都是一个包，分不分文件影响不大
3. 维护简单，不容易出错
4. 所有消息都在 `pb` 命名空间下，使用统一

### 立即应用方案一

运行以下命令（假设你将来会有多个 proto 文件）：

```bash
cd proto
pbjs -t static-module -w commonjs -o proto.js *.proto
pbts -o proto.d.ts proto.js
```

然后修改 `ProtoNetworkMgr.ts` 的 import：
```typescript
import { pb } from '../../../proto/proto';
```

---

需要我帮你现在就切换到方案一吗？还是先保持现状，等有新的 proto 文件时再调整？
