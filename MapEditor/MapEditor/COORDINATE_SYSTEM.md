# 地图编辑器坐标系统说明

## 坐标系统：左下角为原点

### 1. 格子坐标系 (Grid Coordinates)
- **原点**：左下角为 (0, 0)
- **X轴**：从左到右递增
- **Y轴**：从下到上递增
- **范围**：X: [0, totalCols-1], Y: [0, totalRows-1]

### 2. 世界坐标系 (World Coordinates)
- **原点**：左下角为 (0, 0)
- **单位**：像素
- **转换公式**：
  ```javascript
  worldX = gridX * gridWidth
  worldY = mapPixelHeight - (gridY + 1) * gridHeight
  ```

### 3. 切图文件命名
- 文件名格式：`{x}_{y}.jpg`
- 左下角图块：`0_0.jpg`
- 右上角图块：`{totalCols-1}_{totalRows-1}.jpg`
- Y坐标反转公式：`flippedY = totalRows - 1 - row`

### 4. 关键方法

#### screenToGrid(screenX, screenY)
将屏幕坐标转换为格子坐标（左下角原点）

#### gridToWorld(gridX, gridY)
将格子坐标转换为Canvas世界坐标（左上角Canvas坐标系）

#### worldToScreen(worldX, worldY)
将世界坐标转换为屏幕坐标

### 5. 数据存储
- config.json 中的坐标：使用左下角为原点的格子坐标
- 物体位置 (gridX, gridY)：左下角为原点
- 标记点 (x, y)：左下角为原点

### 6. 渲染逻辑
- 地图块渲染：从文件名读取左下角坐标，转换为Canvas坐标绘制
- 物体渲染：Y值小的在下方（先绘制），Y值大的在上方（后绘制）
- 网格和标记：通过 gridToWorld 转换后绘制

## 示例

### 10x8 的地图
- 左下角格子：(0, 0) → 文件 `0_0.jpg`
- 右下角格子：(9, 0) → 文件 `9_0.jpg`
- 左上角格子：(0, 7) → 文件 `0_7.jpg`
- 右上角格子：(9, 7) → 文件 `9_7.jpg`

### Canvas 渲染坐标
假设 gridWidth=64, gridHeight=64, mapPixelHeight=512

- 格子 (0, 0) → Canvas Y = 512 - 64 = 448 (最下方)
- 格子 (0, 7) → Canvas Y = 512 - 512 = 0 (最上方)
