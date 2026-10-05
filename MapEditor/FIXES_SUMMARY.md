# 地图编辑器修复总结

## 修复完成的问题

### 1. ✅ Excel表默认选择相对路径
**位置**: `mapEditor.js`
- 修改了 `tryLoadDefaultExcel()` 方法
- 默认路径改为：`../sharedata/excel/D-地图表(MapData).xlsx`
- 文件名从 `S-地图表` 改为 `D-地图表`

### 2. ✅ 读取offsetPos偏移坐标属性
**位置**: `excelParser.js`
- 在解析Excel时读取第5列的offsetPos字段
- 解析格式 `x_y` 为 `{offsetX, offsetY}`
- 在物体拖放和随机生成时应用偏移

### 3. ✅ 自动加载资源和Excel
**位置**: `mapEditor.js` 的 `initFileSystem()` 方法
- 恢复目录后自动调用：
  - `await this.loadMapObjects()` - 自动加载资源
  - `await this.tryLoadDefaultExcel()` - 自动加载Excel
- 首次打开提示选择 `D:\Project\cocos\RPGCore\assets` 目录

### 4. ✅ 左侧菜单正确加载图集第一帧
**位置**: `resourceLoader.js`
- 修改了 `getFirstImageFromPlist()` 方法
- 正确解析plist的frames字段
- 在 `loadPreview()` 中裁剪出第一帧显示
- 避免直接显示整张图集图片

### 5. ✅ 随机生成只生成地图上标记的资源ID
**位置**: `mapEditor.js` 的 `randomGenerateObjects()` 方法
- 收集地图上所有的资源ID到Set集合
- 生成循环中检查：只处理地图上有标记的资源ID
- 跳过Excel中存在但地图上没有标记的资源

---

## 坐标系统统一修复

### 6. ✅ 统一使用左下角为原点的坐标系
**修改文件**: `mapEditor.js`

#### 关键修改点：

**a) screenToGrid() - 屏幕坐标转格子坐标**
```javascript
screenToGrid(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const worldX = (screenX - rect.left) / this.scale + this.offsetX;
    const worldY = (screenY - rect.top) / this.scale + this.offsetY;

    // 左下角为原点的坐标系：Y轴反转
    const gridX = Math.floor(worldX / this.config.gridWidth);
    const gridY = Math.floor((this.config.mapPixelHeight - worldY) / this.config.gridHeight);
    
    // 边界检查
    if (gridX < 0 || gridX >= this.config.totalCols || 
        gridY < 0 || gridY >= this.config.totalRows) {
        return null;
    }
    
    return { x: gridX, y: gridY };
}
```

**b) gridToWorld() - 格子坐标转世界坐标**
```javascript
gridToWorld(gridX, gridY) {
    const worldX = gridX * this.config.gridWidth;
    // 左下角为原点：Y轴反转
    const worldY = this.config.mapPixelHeight - (gridY + 1) * this.config.gridHeight;
    return { 
        x: worldX, 
        y: worldY 
    };
}
```

**c) renderMapTiles() - 渲染地图块**
```javascript
renderMapTiles() {
    for (const tile of this.mapTiles) {
        // tile.y 已经是左下角坐标系的Y（与文件名一致）
        // 转换为Canvas坐标系：Y轴反转
        const canvasY = this.config.mapPixelHeight - (tile.y + 1) * this.config.tileSize;
        const canvasX = tile.x * this.config.tileSize;
        
        if (tile.image && tile.image.complete) {
            this.ctx.drawImage(
                tile.image,
                canvasX - this.offsetX,
                canvasY - this.offsetY,
                this.config.tileSize,
                this.config.tileSize
            );
        }
    }
}
```

**d) cutImage() - 切图保存**
```javascript
// 切图时Y坐标反转，使得左下角为0
for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
        // ...切图逻辑...
        
        // Y坐标反转：左下角为0
        const flippedY = rows - 1 - row;
        const fileName = `${col}_${flippedY}.jpg`;
        
        // 保存到mapTiles（使用反转后的Y坐标）
        this.mapTiles.push({
            x: col,
            y: flippedY,
            image: img,
            blob: blob
        });
    }
}
```

**e) renderObjects() - 物体渲染排序**
```javascript
renderObjects() {
    // 左下角坐标系中：Y值小的在下方（先绘制），Y值大的在上方（后绘制）
    const sortedObjects = [...this.objects].sort((a, b) => a.gridY - b.gridY);
    
    for (const obj of sortedObjects) {
        // ...渲染逻辑...
    }
}
```

---

## 坐标系统说明

### 格子坐标系 (Grid Coordinates)
- **原点**：左下角 (0, 0)
- **X轴**：从左到右递增
- **Y轴**：从下到上递增
- **示例**（10x8地图）：
  - 左下角：(0, 0)
  - 右下角：(9, 0)
  - 左上角：(0, 7)
  - 右上角：(9, 7)

### 切图文件命名
- 文件名使用左下角坐标系：`{x}_{y}.jpg`
- 左下角图块：`0_0.jpg`
- 右上角图块：`{totalCols-1}_{totalRows-1}.jpg`

### Canvas渲染坐标
- Canvas使用传统坐标系（左上角为原点）
- 通过 `gridToWorld()` 转换时自动反转Y轴
- 公式：`canvasY = mapPixelHeight - (gridY + 1) * gridHeight`

---

## 使用说明

### 1. 首次打开编辑器
1. 打开 `MapEditor/index.html`
2. 点击"选择资源目录"
3. 选择 `D:\Project\cocos\RPGCore\assets` 目录
4. 编辑器会自动加载资源和Excel表

### 2. 切图
1. 点击"加载图片"选择大地图图片
2. 设置Tile大小（默认512px）
3. 点击"开始切图"
4. 切图完成后可保存为zip

### 3. 标记点
- **阻挡点**：标记不可移动的格子
- **资源刷新点**：标记资源生成位置，设置资源ID和数量范围
- **出生点**：标记玩家出生位置
- 所有标记点使用左下角坐标系

### 4. 放置物体
- 从左侧资源列表拖拽到地图
- 自动从Excel读取占格和偏移信息
- 支持动画资源（显示第一帧）

### 5. 随机生成
- 点击"随机生成物件"
- 只生成地图上有标记的资源ID
- 应用Excel中的offsetPos偏移

### 6. 保存配置
- 点击"保存配置"导出config.json
- 包含所有标记点和物体信息
- 坐标使用左下角为原点

---

## 测试检查清单

- [ ] Excel表自动加载（D-地图表.xlsx）
- [ ] 资源目录自动加载（assets目录）
- [ ] 切图文件名正确（左下角为0_0）
- [ ] 左侧动画资源显示第一帧
- [ ] 标记点坐标正确（左下角为原点）
- [ ] 物体拖放位置正确
- [ ] 随机生成只生成标记的资源ID
- [ ] offsetPos偏移正确应用
- [ ] 配置保存和加载正常
- [ ] 物体遮挡关系正确（下方先绘制）

---

## 技术细节

### 坐标转换公式

**屏幕 → 格子**：
```javascript
gridX = floor(worldX / gridWidth)
gridY = floor((mapPixelHeight - worldY) / gridHeight)
```

**格子 → 世界**：
```javascript
worldX = gridX * gridWidth
worldY = mapPixelHeight - (gridY + 1) * gridHeight
```

**格子 → Canvas**：
```javascript
canvasX = gridX * gridWidth - offsetX
canvasY = mapPixelHeight - (gridY + 1) * gridHeight - offsetY
```

### 文件命名反转
```javascript
flippedY = totalRows - 1 - row
fileName = `${col}_${flippedY}.jpg`
```

---

## 已知限制

1. 切图时最后一行/列可能有黑边（原图尺寸非512整数倍）
2. 动画资源需要plist文件，否则显示整张图集
3. 随机生成需要连续的标记区域（占多格物体）

---

## 更新日期

2026-10-05
