# 像素坐标显示更新

## 📍 问题描述
地图编辑器使用左下角坐标系，但部分UI显示没有清晰说明坐标系统，容易造成混淆。

## ✅ 已完成的更新

### 1. 底部信息栏（第1086行）
显示鼠标位置的实时坐标：
```javascript
document.getElementById('position-info').textContent = 
    `像素: (${Math.round(worldX)}, ${Math.round(worldY)}) | ` +
    `格子: (${gridX}, ${gridY}) | ` +
    `地图: ${this.cols}x${this.rows}格 (${this.mapPixelWidth}x${this.mapPixelHeight}px)`;
```
- ✅ 像素坐标使用左下角原点的worldY
- ✅ 格子坐标使用左下角原点的gridY

### 2. 物体属性面板
新增物体实际位置显示：

**HTML更新（index.html）：**
```html
<div class="property-field">
    <label>位置格子 X:</label>
    <input type="number" id="prop-pos-x" readonly style="background: #2a2a2a; color: #888;" />
</div>
<div class="property-field">
    <label>位置格子 Y:</label>
    <input type="number" id="prop-pos-y" readonly style="background: #2a2a2a; color: #888;" />
</div>
<div class="property-field">
    <label>占据格子 X:</label>
    <input type="number" id="prop-grid-x" min="1" value="1" />
</div>
<div class="property-field">
    <label>占据格子 Y:</label>
    <input type="number" id="prop-grid-y" min="1" value="1" />
</div>
```

**JavaScript更新（mapEditor.js）：**
```javascript
selectObject(obj) {
    // 显示物体实际位置（只读）
    document.getElementById('prop-pos-x').value = obj.gridX;
    document.getElementById('prop-pos-y').value = obj.gridY;
    // 显示占据格子数（可编辑）
    document.getElementById('prop-grid-x').value = obj.occupyX;
    document.getElementById('prop-grid-y').value = obj.occupyY;
    ...
}
```

## 📊 字段说明对比

| 字段名称 | 含义 | 是否可编辑 | 坐标系统 |
|---------|------|-----------|---------|
| 位置格子 X | 物体左下角所在格子的X坐标 | ❌ 只读 | 左下角原点 |
| 位置格子 Y | 物体左下角所在格子的Y坐标 | ❌ 只读 | 左下角原点 |
| 占据格子 X | 物体占据的格子宽度 | ✅ 可编辑 | 无关坐标系 |
| 占据格子 Y | 物体占据的格子高度 | ✅ 可编辑 | 无关坐标系 |
| 偏移像素 X | 物体在格子内的X偏移 | ✅ 可编辑 | 相对偏移 |
| 偏移像素 Y | 物体在格子内的Y偏移 | ✅ 可编辑 | 相对偏移 |

## 🎯 用户体验改进

### 修改前
- ❌ 只显示"占据格子"，不知道物体在哪个位置
- ❌ 字段名称容易混淆位置和尺寸

### 修改后
- ✅ 清晰显示物体的实际位置坐标
- ✅ 区分位置（只读）和尺寸（可编辑）
- ✅ 所有坐标都明确使用左下角原点
- ✅ 灰色背景表示只读字段

## 📝 使用示例

当选中一个物体时，属性面板会显示：
```
类型 (Type): npc_001
位置格子 X: 5       [只读，灰色]
位置格子 Y: 3       [只读，灰色]
占据格子 X: 2       [可编辑]
占据格子 Y: 2       [可编辑]
偏移像素 X: 0       [可编辑]
偏移像素 Y: 0       [可编辑]
```

这表示：
- 物体位于格子坐标 (5, 3)，即从左下角数第6列、第4行
- 物体占据2x2格子的空间
- 物体在格子内无额外像素偏移

## ✨ 验证方法

1. 打开 [index.html](index.html)
2. 拖放一个物体到地图上
3. 点击选中物体
4. 查看属性面板：
   - ✅ "位置格子 X/Y" 显示物体所在格子
   - ✅ "占据格子 X/Y" 显示物体尺寸
   - ✅ 两个字段含义清晰，不会混淆
5. 移动鼠标查看底部信息栏：
   - ✅ "像素" 显示左下角坐标系的世界坐标
   - ✅ "格子" 显示左下角坐标系的格子坐标

