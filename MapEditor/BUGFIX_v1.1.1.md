# 地图编辑器 v1.1.1 Bug修复

## 🐛 修复的问题

### 1. 格子偏移不生效 ✅
**问题描述**：
- 修改物体的格子偏移X/Y参数后，物体位置没有变化

**原因分析**：
- 渲染物体时没有应用 `offsetX` 和 `offsetY` 参数
- 物体碰撞检测时也没有考虑偏移

**修复方案**：
```javascript
// 渲染时应用偏移
const actualGridX = obj.gridX + (obj.offsetX || 0);
const actualGridY = obj.gridY + (obj.offsetY || 0);
const world = this.gridToWorld(actualGridX, actualGridY);

// 碰撞检测时也应用偏移
getObjectAtGrid(gridX, gridY) {
    const actualGridX = obj.gridX + (obj.offsetX || 0);
    const actualGridY = obj.gridY + (obj.offsetY || 0);
    // ... 检测逻辑
}
```

**效果**：
- 修改格子偏移后，物体位置立即更新
- 点击物体时能正确选中（考虑偏移后的位置）

---

### 2. 随机生成数量错误 ✅
**问题描述**：
- 设置数量为 1-1，却生成了很多个物体

**原因分析**：
- 生成失败时没有 `continue`，仍然会添加到列表
- 循环次数设置为 `count` 次，但失败后会重试，导致实际生成数超标

**修复方案**：
```javascript
// 使用计数器确保生成正确数量
let attempts = 0;
let generated = 0;
const maxAttempts = count * 10; // 最多尝试10倍次数

while (generated < count && attempts < maxAttempts) {
    attempts++;
    
    // ... 尝试生成
    
    if (成功) {
        newObjects.push(obj);
        generated++; // 只有成功才计数
    }
}
```

**效果**：
- 设置 1-1 数量，只生成 1 个物体
- 设置 2-4 数量，生成 2-4 个物体

---

### 3. 随机生成图片加载失败 ✅
**问题描述**：
- 随机生成后只显示蓝色矩形占位符，没有图片

**原因分析**：
- Excel中的 `show_url` 字段没有包含文件扩展名
- 例如：`Res/Map/MapObject/Image/icon`（缺少 `.png`）
- 直接读取会失败

**修复方案**：
```javascript
// 尝试多种扩展名
const extensions = ['.png', '.jpg', '.jpeg'];
for (const ext of extensions) {
    try {
        const path = config.show_url + ext;
        const file = await ResFS.read(path);
        const url = URL.createObjectURL(file);
        obj.image = await this.loadImage(url);
        loaded = true;
        break;
    } catch (e) {
        // 尝试下一个扩展名
    }
}
```

**效果**：
- 自动尝试 .png、.jpg、.jpeg 扩展名
- 找到任何一个存在的文件就加载
- 成功显示物体图片

---

### 4. 占据格子超出刷新范围 ✅
**问题描述**：
- 物体占据的格子可能超出标记点的±2格子范围

**原因分析**：
- 只检查了物体中心点在范围内
- 没有检查物体占据的所有格子是否都在范围内

**修复方案**：
```javascript
// 计算物体占据的格子范围
const halfX = Math.floor(occupyX / 2);
const halfY = Math.floor(occupyY / 2);
const minOccupyX = targetX - halfX;
const maxOccupyX = targetX + occupyX - halfX - 1;
const minOccupyY = targetY - halfY;
const maxOccupyY = targetY + occupyY - halfY - 1;

// 刷新范围
const minRangeX = centerX - 2;
const maxRangeX = centerX + 2;
const minRangeY = centerY - 2;
const maxRangeY = centerY + 2;

// 检查是否完全在范围内
if (minOccupyX < minRangeX || maxOccupyX > maxRangeX ||
    minOccupyY < minRangeY || maxOccupyY > maxRangeY) {
    continue; // 超出范围，跳过
}
```

**效果**：
- 生成的物体占据的所有格子都在±2范围内
- 不会有部分格子超出范围的情况

---

## 📝 测试步骤

### 测试格子偏移
1. 拖放一个物体到地图
2. 选中物体
3. 修改"格子偏移X"为 2
4. 观察物体向右移动了2个格子 ✅

### 测试随机生成数量
1. 标记一个资源刷新点
2. 资源ID=1，数量=1-1
3. 加载Excel表
4. 随机生成
5. 观察只生成了1个物体 ✅

### 测试图片加载
1. 确保Excel中有正确的show_url配置
2. 随机生成物体
3. 观察物体显示为图片，而不是蓝色矩形 ✅

### 测试占据范围检查
1. 标记一个资源刷新点 (10, 10)
2. Excel中配置占据3×3格子的物体
3. 随机生成
4. 观察生成的物体不会超出 (8-12, 8-12) 范围 ✅

---

## 🔧 调试信息

修复后添加了控制台日志：
```
ID 1: 生成数量=1, 范围=1-1
成功加载图片: Res/Map/MapObject/Image/icon.png
ID 1: 只生成了 1/1 个物体
随机生成完成: 1 个物体
```

如果生成失败，会显示：
```
ID 1: 只生成了 0/1 个物体（空间不足）
加载物体图片失败，尝试的路径: Res/Map/MapObject/Image/xxx
```

---

## 📋 完整更新内容

- ✅ 修复格子偏移不生效
- ✅ 修复随机生成数量错误
- ✅ 修复图片加载失败
- ✅ 修复占据格子超出范围
- ✅ 添加详细的调试日志
- ✅ 改进错误处理

---

## 🎉 现在可以正常使用了！

刷新浏览器页面测试新功能：
http://127.0.0.1:8080/launcher.html
