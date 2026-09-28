# Proto 网络管理使用指南

## 快速开始

### 1. 初始化（在游戏启动时）

```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';

// 初始化网络管理器
ProtoNetworkMgr.instance.init();

// 连接服务器
await ProtoNetworkMgr.instance.connect();
```

### 2. 发送请求（Promise 风格）

```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';
import { ProtoMsgId } from './WebSocket/ProtoConfig';

// 发送 GM 命令请求
try {
    const response = await ProtoNetworkMgr.instance.sendRequest(
        ProtoMsgId.UseGMCMDReq,
        {
            cmd: 'addItem',
            args: ['1001', '100']
        }
    );
    
    console.log('服务器响应:', response);
    
    // TypeScript 类型支持
    // response.result 会有完整的类型提示
    
} catch (error) {
    console.error('请求失败:', error);
}
```

### 3. 监听服务器推送

```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';
import { ProtoMsgId } from './WebSocket/ProtoConfig';

// 注册推送消息监听器
ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, (data) => {
    console.log('收到 GM 配置推送:', data);
    // data.cmds 包含所有可用的 GM 命令
});

// 在组件中使用（带 target 绑定）
ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, this.onGMInit, this);

// 移除监听器（组件销毁时）
ProtoNetworkMgr.instance.off(ProtoMsgId.NtfGMCMDInit, this.onGMInit);
```

## 完整示例

### 示例 1：登录流程

```typescript
import { Component } from 'cc';
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';
import { ProtoMsgId } from './WebSocket/ProtoConfig';

export class LoginManager extends Component {
    
    async onLoad() {
        // 初始化网络
        ProtoNetworkMgr.instance.init();
        
        // 监听服务器推送
        ProtoNetworkMgr.instance.on(ProtoMsgId.NtfGMCMDInit, this.onGMInit, this);
    }
    
    async login(username: string, password: string) {
        try {
            // 连接服务器
            const connected = await ProtoNetworkMgr.instance.connect();
            if (!connected) {
                console.error('连接失败');
                return;
            }
            
            // 发送登录请求（假设有 LoginReq 消息）
            // const response = await ProtoNetworkMgr.instance.sendRequest(
            //     ProtoMsgId.LoginReq,
            //     { username, password }
            // );
            
            console.log('登录成功');
            
        } catch (error) {
            console.error('登录失败:', error);
        }
    }
    
    onGMInit(data: any) {
        console.log('收到 GM 配置:', data);
        // 初始化 GM 命令列表
    }
    
    onDestroy() {
        // 清理监听器
        ProtoNetworkMgr.instance.off(ProtoMsgId.NtfGMCMDInit, this.onGMInit);
    }
}
```

### 示例 2：战斗消息处理

```typescript
import { Component } from 'cc';
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';
import { ProtoMsgId } from './WebSocket/ProtoConfig';

export class BattleManager extends Component {
    
    async onLoad() {
        // 监听战斗相关推送（假设有这些消息）
        // ProtoNetworkMgr.instance.on(ProtoMsgId.NtfBattleStart, this.onBattleStart, this);
        // ProtoNetworkMgr.instance.on(ProtoMsgId.NtfBattleEnd, this.onBattleEnd, this);
        // ProtoNetworkMgr.instance.on(ProtoMsgId.NtfUnitMove, this.onUnitMove, this);
    }
    
    // 请求攻击
    async attack(unitId: number, targetId: number) {
        try {
            // const response = await ProtoNetworkMgr.instance.sendRequest(
            //     ProtoMsgId.AttackReq,
            //     { unitId, targetId }
            // );
            // 
            // console.log('攻击成功:', response);
            
        } catch (error) {
            console.error('攻击失败:', error);
        }
    }
    
    // 处理单位移动推送
    onUnitMove(data: any) {
        console.log('单位移动:', data);
        // 更新战场上的单位位置
    }
    
    onDestroy() {
        // 清理所有监听器
        ProtoNetworkMgr.instance.clearAllHandlers();
    }
}
```

### 示例 3：使用 GM 命令

```typescript
import { ProtoNetworkMgr } from './WebSocket/ProtoNetworkMgr';
import { ProtoMsgId } from './WebSocket/ProtoConfig';

export class GMCommandHelper {
    
    // 添加道具
    static async addItem(itemId: number, count: number) {
        try {
            const response = await ProtoNetworkMgr.instance.sendRequest(
                ProtoMsgId.UseGMCMDReq,
                {
                    cmd: 'addItem',
                    args: [itemId.toString(), count.toString()]
                }
            );
            
            if (response.result) {
                console.log('添加道具成功');
            } else {
                console.error('添加道具失败:', response.msg);
            }
            
        } catch (error) {
            console.error('GM 命令执行失败:', error);
        }
    }
    
    // 设置玩家等级
    static async setLevel(level: number) {
        try {
            await ProtoNetworkMgr.instance.sendRequest(
                ProtoMsgId.UseGMCMDReq,
                {
                    cmd: 'setLevel',
                    args: [level.toString()]
                }
            );
            
            console.log('设置等级成功');
            
        } catch (error) {
            console.error('设置等级失败:', error);
        }
    }
}

// 使用示例
GMCommandHelper.addItem(1001, 100);  // 添加 100 个 ID 为 1001 的道具
GMCommandHelper.setLevel(50);        // 设置等级为 50
```

## API 参考

### ProtoNetworkMgr

#### 初始化方法

```typescript
// 初始化网络管理器（必须在使用前调用）
init(): void

// 连接服务器
connect(): Promise<boolean>

// 断开连接
disconnect(): void

// 检查是否在线
isOnline(): boolean
```

#### 请求方法

```typescript
// 发送 Proto 请求
sendRequest<T = any>(
    msgId: number,           // 消息 ID（来自 ProtoMsgId 枚举）
    data: any,               // 消息数据（符合 proto 定义）
    timeoutMs?: number       // 超时时间（毫秒），默认 10000
): Promise<T>                // 返回响应数据
```

#### 监听方法

```typescript
// 注册推送消息监听器
on(
    msgId: number,           // 消息 ID
    handler: Function,       // 处理函数
    target?: any             // 绑定对象（可选）
): void

// 移除推送消息监听器
off(
    msgId: number,           // 消息 ID
    handler: Function        // 处理函数
): void

// 清理所有监听器
clearAllHandlers(): void
```

#### 工具方法

```typescript
// 获取当前待处理的请求数量
getPendingRequestCount(): number
```

## 消息协议格式

### 请求消息格式

```
[4 字节：消息总长度] 
+ [4 字节：消息 ID] 
+ [4 字节：序列号（> 0）] 
+ [N 字节：Proto 数据]
```

### 响应消息格式

```
[4 字节：消息总长度] 
+ [4 字节：消息 ID] 
+ [4 字节：序列号（与请求相同）] 
+ [N 字节：Proto 数据]
```

### 推送消息格式

```
[4 字节：消息总长度] 
+ [4 字节：消息 ID] 
+ [4 字节：序列号（= 0）] 
+ [N 字节：Proto 数据]
```

## 添加新消息类型

### 方法 1：使用自动编译脚本（推荐⭐）

1. **编辑 proto 文件**
   ```bash
   # 在 proto/ 目录下编辑或创建 .proto 文件
   # 例如：proto/login.proto
   ```

2. **运行自动编译脚本**
   ```bash
   # Windows: 双击 proto/auto-compile.bat
   # Mac/Linux: ./proto/auto-compile.sh
   # 或命令行: npm run proto
   ```

3. **完成！**
   - ✅ `proto.js` 和 `proto.d.ts` 自动更新
   - ✅ `ProtoConfig.ts` 自动添加新消息 ID
   - ✅ `ProtoNetworkMgr.ts` 自动添加编解码逻辑

### 方法 2：手动添加（不推荐）

如果确实需要手动添加：

1. **编译 proto 文件**
   ```bash
   npm run proto
   ```

2. **在 ProtoConfig.ts 添加消息 ID**
   ```typescript
   export enum ProtoMsgId {
       // ...
       LoginReq = 2001,    // 新增
       LoginResp = 2002,   // 新增
   }
   ```

3. **在 ProtoNetworkMgr.ts 添加编解码逻辑**
   ```typescript
   // encode 方法中添加
   case ProtoMsgId.LoginReq:
       return pb.LoginReq.encode(data).finish();
   
   // decode 方法中添加
   case ProtoMsgId.LoginResp:
       return pb.LoginResp.decode(protoData);
   ```

## 最佳实践

### ✅ 推荐做法

1. **使用 TypeScript 类型**
   ```typescript
   import { pb } from '../../../proto/proto';
   
   const response = await ProtoNetworkMgr.instance.sendRequest<pb.LoginResp>(
       ProtoMsgId.LoginReq,
       { username: 'test', password: '123' }
   );
   
   // response 现在有完整的类型提示
   console.log(response.userId);
   ```

2. **集中管理监听器**
   ```typescript
   class NetworkEventManager {
       private handlers: Map<number, Function[]> = new Map();
       
       init() {
           this.registerHandler(ProtoMsgId.NtfGMCMDInit, this.onGMInit);
           this.registerHandler(ProtoMsgId.NtfBattleStart, this.onBattleStart);
       }
       
       private registerHandler(msgId: number, handler: Function) {
           ProtoNetworkMgr.instance.on(msgId, handler, this);
           
           if (!this.handlers.has(msgId)) {
               this.handlers.set(msgId, []);
           }
           this.handlers.get(msgId).push(handler);
       }
       
       destroy() {
           // 统一清理
           this.handlers.forEach((handlers, msgId) => {
               handlers.forEach(handler => {
                   ProtoNetworkMgr.instance.off(msgId, handler);
               });
           });
           this.handlers.clear();
       }
   }
   ```

3. **错误处理**
   ```typescript
   try {
       const response = await ProtoNetworkMgr.instance.sendRequest(
           ProtoMsgId.LoginReq,
           { username, password }
       );
       
       // 处理业务逻辑错误码
       if (response.code !== 0) {
           console.error('登录失败:', response.msg);
           return;
       }
       
       // 成功逻辑
       
   } catch (error) {
       // 处理网络错误、超时、编解码错误
       console.error('网络请求失败:', error);
   }
   ```

### ❌ 避免做法

1. **不要在循环中发送大量请求**
   ```typescript
   // ❌ 错误
   for (let i = 0; i < 100; i++) {
       await ProtoNetworkMgr.instance.sendRequest(ProtoMsgId.XXX, {});
   }
   
   // ✅ 正确：使用批量接口
   await ProtoNetworkMgr.instance.sendRequest(ProtoMsgId.BatchReq, {
       items: [...]  // 一次发送所有数据
   });
   ```

2. **不要忘记移除监听器**
   ```typescript
   // ❌ 错误：会导致内存泄漏
   onLoad() {
       ProtoNetworkMgr.instance.on(ProtoMsgId.XXX, this.handler, this);
   }
   // 没有在 onDestroy 中移除
   
   // ✅ 正确
   onDestroy() {
       ProtoNetworkMgr.instance.off(ProtoMsgId.XXX, this.handler);
   }
   ```

3. **不要在编解码方法中做业务逻辑**
   ```typescript
   // ❌ 错误：编解码只负责数据转换
   private decodeProtoMessage(msgId: number, data: Uint8Array) {
       const decoded = pb.XXX.decode(data);
       // 不要在这里做业务逻辑
       // this.updateUI(decoded);  // ❌
       return decoded;
   }
   
   // ✅ 正确：业务逻辑在外层处理
   const response = await ProtoNetworkMgr.instance.sendRequest(...);
   this.updateUI(response);  // ✅
   ```

## 调试技巧

### 查看网络日志

所有 Proto 消息都会输出日志：

```
[ProtoNetworkMgr] 发送请求: pb.UseGMCMDReq, Seq=1
[ProtoNetworkMgr] 收到消息: pb.UseGMCMDResp, Seq=1
[ProtoNetworkMgr] 收到消息: pb.NtfGMCMDInit, Seq=0  // 推送消息
```

### 查看待处理请求

```typescript
const pendingCount = ProtoNetworkMgr.instance.getPendingRequestCount();
console.log('待处理请求数:', pendingCount);
```

### 模拟超时测试

```typescript
// 设置较短的超时时间
try {
    await ProtoNetworkMgr.instance.sendRequest(
        ProtoMsgId.XXX,
        {},
        1000  // 1 秒超时
    );
} catch (error) {
    console.error('超时测试:', error);
}
```

## 常见问题

### Q: 如何判断消息是请求还是推送？
A: 序列号 `seq > 0` 表示请求-响应，`seq = 0` 表示服务器推送。

### Q: 请求超时后会怎样？
A: Promise 会 reject，并输出错误日志，不影响后续请求。

### Q: 可以同时发送多个请求吗？
A: 可以，每个请求有独立的序列号，互不干扰。

### Q: 如何修改默认超时时间？
A: 在 `sendRequest` 的第三个参数传入自定义超时时间（毫秒）。

### Q: JSON 消息和 Proto 消息可以混用吗？
A: 可以！ProtoNetworkMgr 会自动判断消息类型，不影响原有的 JSON 消息。

---

**开始使用 Proto 网络管理吧！🚀**
