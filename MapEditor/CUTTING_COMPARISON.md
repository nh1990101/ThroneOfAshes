# 地图切图策略对比

## 问题分析

原图尺寸可能不是512的整数倍，导致切图时最后一行或一列不足512px，会产生黑边。

**关键问题：黑边应该出现在哪里？**

### 旧策略（从左上角开始切） ❌

```
原图 5000x4000px, tileSize=512
cols = 10, rows = 8

切图顺序：从左上角开始
row=0 → 图片顶部 → 文件 x_7.jpg (gridY=7)
row=1 → 图片中间 → 文件 x_6.jpg (gridY=6)
...
row=7 → 图片底部 → 文件 x_0.jpg (gridY=0) ← 黑边在这里！

结果：黑边出现在底部（游戏世界的地面 gridY=0）
```

**问题**：地面是玩家视角的主要区域，黑边严重影响视觉体验！

---

### 新策略（从左下角开始切） ✅

```
原图 5000x4000px, tileSize=512
cols = 10, rows = 8

切图顺序：从左下角开始
row=0 → 图片底部 → 文件 x_0.jpg (gridY=0) ← 完整图块！
row=1 → 图片中间 → 文件 x_1.jpg (gridY=1)
...
row=7 → 图片顶部 → 文件 x_7.jpg (gridY=7) ← 黑边在这里

结果：黑边出现在顶部（游戏世界的高处）
```

**优势**：地面完整，黑边在高处不影响主视野！

---

## 技术实现

### 旧策略代码

```javascript
// 从上到下切图
for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
        // 从图片(0,0)开始切
        const sourceX = col * tileSize;
        const sourceY = row * tileSize;  // 从图片顶部开始
        
        // 文件名需要反转Y轴
        const flippedY = rows - 1 - row;
        const fileName = `${col}_${flippedY}.jpg`;
    }
}
```

### 新策略代码

```javascript
// 从下到上切图
for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
        // 从图片底部开始切
        const sourceX = col * tileSize;
        const sourceY = img.height - (row + 1) * tileSize;  // 从底部开始
        
        // 处理顶部不足512的情况
        const sh = row === rows - 1
            ? Math.min(tileSize, img.height - row * tileSize)
            : tileSize;
        
        // 顶部黑边对齐到canvas底部
        const destY = (row === rows - 1 && sh < tileSize)
            ? tileSize - sh
            : 0;
        
        // 文件名直接使用row（无需反转）
        const fileName = `${col}_${row}.jpg`;
    }
}
```

---

## 可视化对比

打开 [cutting-test.html](cutting-test.html) 查看交互式对比：

### 示例：5000x4000px 图片

#### 旧策略（从左上角切）
```
gridY=7: [完整] [完整] [完整] ... [完整] [黑边]
gridY=6: [完整] [完整] [完整] ... [完整] [黑边]
gridY=5: [完整] [完整] [完整] ... [完整] [黑边]
...
gridY=1: [完整] [完整] [完整] ... [完整] [黑边]
gridY=0: [黑边] [黑边] [黑边] ... [黑边] [黑边] ← 地面有黑边！
```

#### 新策略（从左下角切）
```
gridY=7: [黑边] [黑边] [黑边] ... [黑边] [黑边] ← 顶部有黑边
gridY=6: [完整] [完整] [完整] ... [完整] [黑边]
gridY=5: [完整] [完整] [完整] ... [完整] [黑边]
...
gridY=1: [完整] [完整] [完整] ... [完整] [黑边]
gridY=0: [完整] [完整] [完整] ... [完整] [黑边] ← 地面完整！
```

---

## 优势总结

| 对比项 | 旧策略 | 新策略 |
|--------|--------|--------|
| 黑边位置 | 底部（gridY=0，地面） | 顶部（gridY=rows-1，高处） |
| 地面完整性 | ❌ 有黑边 | ✅ 完整 |
| 视觉体验 | ❌ 影响主视野 | ✅ 黑边在视野外 |
| 文件命名 | 需要反转 `flippedY = rows-1-row` | 直接使用 `row` |
| 代码复杂度 | 较复杂 | 更简单 |
| 偏移记录 | 可能需要记录底部偏移 | 不需要 |

---

## 测试方法

1. 打开 [cutting-test.html](cutting-test.html)
2. 输入不同的原图尺寸（如 5000x4000, 5120x4096）
3. 观察两种策略的黑边位置差异
4. 验证新策略的优势

---

## 修改文件

- `MapEditor/mapEditor.js` - 切图逻辑（第717-760行）
- `MapEditor/CUTTING_STRATEGY.md` - 详细策略说明
- `MapEditor/cutting-test.html` - 可视化测试工具

---

日期: 2026-10-05
