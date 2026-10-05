# Y坐标显示NaN问题修复

## 问题描述

在地图编辑器中，鼠标移动时Y坐标显示为 `NaN`，导致无法正确显示世界坐标。

## 问题原因

当用户选择"现有地图块"创建地图时，代码只加载了地图分块图片，但没有设置地图的尺寸信息：
- `totalCols`（地图列数）
- `totalRows`（地图行数）
- `mapPixelWidth`（地图像素宽度）
- `mapPixelHeight`（地图像素高度）

这导致 `gridToWorld()` 方法中的计算失败：

```javascript
gridToWorld(gridX, gridY) {
    if (!this.config) return { x: 0, y: 0 };
    
    return {
        x: gridX * this.config.gridWidth,
        y: this.config.mapPixelHeight - (gridY + 1) * this.config.gridHeight
        // ↑ 如果 mapPixelHeight 是 undefined，这里就会返回 NaN
    };
}
```

## 修复方案

### 1. 自动计算地图尺寸

在 `loadMapTiles()` 方法中，通过分析地图分块文件名（格式：`x_y.png`），自动计算地图的总尺寸：

```javascript
// 修改前：只加载图片，不计算尺寸
for (const entry of imageFiles) {
    const match = /^(\d+)_(\d+)\.(jpg|jpeg|png)$/i.exec(entry.name);
    const x = parseInt(match[1]);
    const y = parseInt(match[2]);
    // ... 加载图片
    this.mapTiles.push({ x, y, image: img, name: entry.name });
}

// 修改后：记录最大行列号和图片尺寸
let maxCol = 0;
let maxRow = 0;
let tileWidth = 0;
let tileHeight = 0;

for (const entry of imageFiles) {
    // ... 加载图片
    maxCol = Math.max(maxCol, x);
    maxRow = Math.max(maxRow, y);
    if (tileWidth === 0) {
        tileWidth = img.width;
        tileHeight = img.height;
    }
}

// 自动设置地图尺寸信息
if (this.mapTiles.length > 0) {
    this.config.totalCols = maxCol + 1;
    this.config.totalRows = maxRow + 1;
    this.config.tileSize = tileWidth;
    this.config.mapPixelWidth = this.config.totalCols * tileWidth;
    this.config.mapPixelHeight = this.config.totalRows * tileHeight;
}
```

### 2. 添加安全检查

在 `onMouseMove()` 方法中，添加对 `mapPixelHeight` 的检查：

```javascript
// 修改前：直接计算，可能得到 NaN
if (grid) {
    const worldPos = this.gridToWorld(grid.x, grid.y);
    document.getElementById('info-position').textContent = 
        `像素: (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`;
}

// 修改后：先检查地图尺寸信息是否已加载
if (grid && this.config && this.config.mapPixelHeight) {
    const worldPos = this.gridToWorld(grid.x, grid.y);
    document.getElementById('info-position').textContent = 
        `像素: (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`;
} else if (grid) {
    // 地图尺寸信息未加载时，只显示格子坐标
    document.getElementById('info-position').textContent = `像素: -`;
    document.getElementById('info-grid').textContent = `格子: (${grid.x}, ${grid.y})`;
}
```

### 3. 改进地图尺寸显示

在 `updateMapSizeInfo()` 方法中，处理尺寸信息不完整的情况：

```javascript
updateMapSizeInfo() {
    if (!this.config) {
        document.getElementById('info-map-size').textContent = '地图: -';
        return;
    }

    if (this.config.totalCols && this.config.totalRows && 
        this.config.mapPixelWidth && this.config.mapPixelHeight) {
        const info = `地图: ${this.config.totalCols}x${this.config.totalRows}格 ` +
                     `(${this.config.mapPixelWidth}x${this.config.mapPixelHeight}px)`;
        document.getElementById('info-map-size').textContent = info;
    } else {
        document.getElementById('info-map-size').textContent = '地图: 尺寸信息未加载';
    }
}
```

## 验证步骤

1. 刷新浏览器页面（按 `F5` 或 `Ctrl+R`）
2. 点击"选择资源目录"，选择项目根目录
3. 点击"新建地图"，选择"现有地图块"
4. 填写地图块目录路径（如：`Res/Map/MapGrid/Map1`）
5. 点击"确定"创建地图
6. 鼠标移动到地图上，检查底部信息栏：
   - 应该显示正确的像素坐标（不是 NaN）
   - 应该显示正确的格子坐标
   - 应该显示正确的地图尺寸信息

## 影响范围

- ✅ 修复了Y坐标显示NaN的问题
- ✅ 自动计算地图尺寸，无需手动输入
- ✅ 提供了更好的错误提示
- ✅ 保持了向后兼容性（从大图切割的流程不受影响）

## 相关文件

- `MapEditor/mapEditor.js` - 核心逻辑修改
  - `loadMapTiles()` 方法：添加自动尺寸计算
  - `onMouseMove()` 方法：添加安全检查
  - `updateMapSizeInfo()` 方法：改进显示逻辑

## 日期

2026-10-05
