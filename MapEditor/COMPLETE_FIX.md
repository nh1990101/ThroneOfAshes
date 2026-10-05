# 地图编辑器完整修复方案 v1.2.0

## 修复内容总结

### 1. ✅ 新增出生点标记功能
**已完成**：
- 在HTML中添加了"出生点"选项到标记模式下拉框
- 在mapEditor.js中初始化了spawnPoints数组
- 需要补充：渲染出生点、右键删除出生点

### 2. ⏳ Excel默认加载
**已添加代码**：
```javascript
document.getElementById('btn-load-excel').addEventListener('click', async () => {
    const defaultExcelPath = '../sharedata/excel/S-地图表(MapData).xlsx';
    // 自动尝试加载默认路径
});
```

### 3. ⏳ offsetPos属性支持
**已在onDrop函数中添加**：
```javascript
// 解析offsetPos字段（格式：x_y）
if (config.offsetPos && typeof config.offsetPos === 'string') {
    const parts = config.offsetPos.split('_');
    obj.offsetX = parseInt(parts[0]) || 0;
    obj.offsetY = parseInt(parts[1]) || 0;
}
```

### 4. ❌ 自动加载资源（待完成）
需要在选择资源目录后自动触发loadMapObjects()

### 5. ❌ 动画资源图集第一张图（待完成）
resourceLoader.js中的plist解析需要验证

### 6. ❌ 随机生成逻辑重写（待完成）
需要完全重写randomGenerateObjects()函数

### 7. ❌ 刷新点格子数检测（待完成）
需要添加checkRefreshAreaValid()函数

---

## 需要手动添加的代码

### 修复1: 完善paintMark函数（添加出生点支持）

在mapEditor.js的paintMark函数中，找到：
```javascript
} else if (markMode === 'resource') {
    // 资源刷新点代码...
}

this.lastPaintGrid = { x: gridX, y: gridY };
this.render();
```

在`} else if (markMode === 'resource') {`后面、`this.lastPaintGrid`前面添加：
```javascript
} else if (markMode === 'spawn') {
    // 出生点
    const existing = this.markers.spawnPoints.find(p => p.x === gridX && p.y === gridY);
    if (!existing) {
        this.markers.spawnPoints.push({ x: gridX, y: gridY });
        console.log(`添加出生点: (${gridX}, ${gridY})`);
    }
}
```

### 修复2: 渲染出生点

在renderMarkers()函数的最后，在最后一个`}`前添加：
```javascript
// 绘制出生点（黄色星标）
this.markers.spawnPoints.forEach(spawn => {
    const world = this.gridToWorld(spawn.x, spawn.y);
    const screen = this.worldToScreen(world.x, world.y);
    const gridW = this.config.gridWidth * this.scale;
    const gridH = this.config.gridHeight * this.scale;

    // 绘制黄色背景
    this.markerCtx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    this.markerCtx.fillRect(screen.x, screen.y, gridW, gridH);

    // 绘制星标
    const centerX = screen.x + gridW / 2;
    const centerY = screen.y + gridH / 2;
    const size = Math.min(gridW, gridH) * 0.4;

    this.markerCtx.fillStyle = 'rgba(255, 200, 0, 0.9)';
    this.markerCtx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? size : size / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (i === 0) {
            this.markerCtx.moveTo(x, y);
        } else {
            this.markerCtx.lineTo(x, y);
        }
    }
    this.markerCtx.closePath();
    this.markerCtx.fill();
});
```

### 修复3: 右键删除出生点

在onRightClick()函数中，找到：
```javascript
// 删除资源刷新点
if (this.markers.resources.has(key)) {
    this.markers.resources.delete(key);
}

this.render();
```

在`this.render();`前添加：
```javascript
// 删除出生点
const spawnIndex = this.markers.spawnPoints.findIndex(p => p.x === grid.x && p.y === grid.y);
if (spawnIndex !== -1) {
    this.markers.spawnPoints.splice(spawnIndex, 1);
    console.log(`删除出生点: (${grid.x}, ${grid.y})`);
}
```

### 修复4: 保存/加载出生点

在saveMapConfig()函数中，找到：
```javascript
const config = {
    mapInfo: this.config,
    blocks: Array.from(this.markers.blocks.entries()),
    resources: Array.from(this.markers.resources.entries()),
    objects: this.objects.map(...)
};
```

修改为：
```javascript
const config = {
    mapInfo: this.config,
    blocks: Array.from(this.markers.blocks.entries()),
    resources: Array.from(this.markers.resources.entries()),
    spawnPoints: this.markers.spawnPoints, // 添加这一行
    objects: this.objects.map(...)
};
```

在loadMapConfig()函数中，找到：
```javascript
this.markers.blocks = new Map(config.blocks || []);
this.markers.resources = new Map(config.resources || []);
```

后面添加：
```javascript
this.markers.spawnPoints = config.spawnPoints || [];
```

---

## 完整重写：随机生成函数

完全替换randomGenerateObjects()函数为：

```javascript
// 随机生成物件
async randomGenerateObjects() {
    if (!this.excelData || this.excelData.length === 0) {
        alert('请先加载Excel表数据');
        return;
    }

    if (this.markers.resources.size === 0) {
        alert('没有资源刷新点标记');
        return;
    }

    // 删除上一次随机生成的物件
    const oldCount = this.objects.length;
    this.objects = this.objects.filter(obj => obj.resourceType !== 'auto-generated');
    const deletedCount = oldCount - this.objects.length;
    console.log(`删除了 ${deletedCount} 个旧的随机生成物件`);

    document.getElementById('loading').classList.add('active');

    try {
        const newObjects = [];
        const sortedData = [...this.excelData].sort((a, b) => (a.id || 0) - (b.id || 0));

        // 收集所有资源标记点
        const allMarkers = [];
        for (const [key, resources] of this.markers.resources.entries()) {
            const [x, y] = key.split(',').map(Number);
            resources.forEach(res => {
                allMarkers.push({ x, y, resourceId: res.id });
            });
        }

        console.log(`总共有 ${allMarkers.length} 个资源标记点`);

        // 对每个标记点生成物体
        for (const marker of allMarkers) {
            const config = sortedData.find(d => d.id == marker.resourceId);
            if (!config || !config.show_url) {
                console.warn(`找不到ID ${marker.resourceId} 的配置`);
                continue;
            }

            // 解析占据格子
            let occupyX = 1, occupyY = 1;
            if (config.area && typeof config.area === 'string') {
                const parts = config.area.split('_');
                if (parts.length === 2) {
                    occupyX = parseInt(parts[0]) || 1;
                    occupyY = parseInt(parts[1]) || 1;
                }
            }

            // 检查刷新点格子数是否满足占据格子数
            if (!this.checkRefreshAreaValid(marker.x, marker.y, occupyX, occupyY, marker.resourceId)) {
                console.warn(`资源ID ${marker.resourceId} 在位置(${marker.x},${marker.y}): 刷新点格子数不足，需要${occupyX}×${occupyY}个格子`);
                continue;
            }

            // 解析偏移像素
            let offsetX = 0, offsetY = 0;
            if (config.offsetPos && typeof config.offsetPos === 'string') {
                const parts = config.offsetPos.split('_');
                if (parts.length === 2) {
                    offsetX = parseInt(parts[0]) || 0;
                    offsetY = parseInt(parts[1]) || 0;
                }
            }

            // 检查是否可以放置
            if (!this.canPlaceObject(marker.x, marker.y, occupyX, occupyY)) {
                console.warn(`位置(${marker.x},${marker.y})有不可移动点，跳过`);
                continue;
            }

            // 检查是否与已有物体重叠
            const allExisting = [...this.objects, ...newObjects];
            if (this.checkObjectOverlap(marker.x, marker.y, occupyX, occupyY, allExisting)) {
                console.warn(`位置(${marker.x},${marker.y})与其他物体重叠，跳过`);
                continue;
            }

            // 创建物体
            const obj = {
                id: Date.now() + Math.random(),
                resourcePath: config.show_url,
                resourceType: 'auto-generated',
                gridX: marker.x,
                gridY: marker.y,
                type: config.type || '',
                occupyX: occupyX,
                occupyY: occupyY,
                offsetX: offsetX,
                offsetY: offsetY,
                params: config.params || '',
                walkable: false,
                configId: config.id
            };

            // 尝试加载图片
            try {
                if (ResFS.ready && config.show_url) {
                    let loaded = false;
                    const extensions = ['.png', '.jpg', '.jpeg'];

                    for (const ext of extensions) {
                        try {
                            const path = config.show_url + ext;
                            const file = await ResFS.read(path);
                            const url = URL.createObjectURL(file);
                            obj.imageSrc = url;
                            obj.image = await this.loadImage(url);
                            loaded = true;
                            console.log(`成功加载: ${path}`);
                            break;
                        } catch (e) {
                            // 尝试下一个扩展名
                        }
                    }

                    if (!loaded) {
                        console.warn('加载图片失败:', config.show_url);
                    }
                }
            } catch (error) {
                console.warn('加载图片异常:', error);
            }

            newObjects.push(obj);
        }

        this.objects.push(...newObjects);
        this.render();
        
        const message = `随机生成完成: 删除${deletedCount}个旧物体，新生成${newObjects.length}个物体`;
        this.updateInfo(message);
        alert(message);
    } catch (error) {
        alert('生成失败: ' + error.message);
        console.error(error);
    } finally {
        document.getElementById('loading').classList.remove('active');
    }
}

// 检查刷新区域是否有效
checkRefreshAreaValid(centerX, centerY, occupyX, occupyY, resourceId) {
    const halfX = Math.floor(occupyX / 2);
    const halfY = Math.floor(occupyY / 2);

    // 检查占据的每个格子是否都有该resourceId的标记
    for (let dy = 0; dy < occupyY; dy++) {
        for (let dx = 0; dx < occupyX; dx++) {
            const checkX = centerX - halfX + dx;
            const checkY = centerY - halfY + dy;
            const key = `${checkX},${checkY}`;

            if (!this.markers.resources.has(key)) {
                return false;
            }

            const resources = this.markers.resources.get(key);
            const hasResourceId = resources.some(r => r.id === resourceId);
            if (!hasResourceId) {
                return false;
            }
        }
    }

    return true;
}
```

---

## 测试步骤

1. 刷新浏览器
2. 选择资源目录
3. 点击"加载Excel表"（应自动加载默认文件）
4. 标记模式选择"出生点"，点击地图标记几个出生点
5. 标记模式选择"资源刷新点"，标记一些资源点
6. 点击"随机生成物件"
7. 检查是否正常生成且图片显示

---

## 注意事项

- 所有修改都要在对应的函数位置进行
- 保持代码缩进一致
- 修改后保存文件并刷新浏览器
- 打开F12查看控制台日志
