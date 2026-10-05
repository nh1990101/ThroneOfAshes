# RPG地图编辑器使用说明

## 🚀 启动方法

### ⚠️ 重要：必须使用本地服务器

由于浏览器安全限制，**不能**直接双击打开 `index.html`，必须通过 HTTP 服务器访问。

### 方法一：使用启动脚本（推荐）

1. 双击运行 `start-server.bat`
2. 浏览器自动打开 http://localhost:8080
3. 使用完毕后，在命令行窗口按 `Ctrl+C` 停止服务器

### 方法二：手动启动 Python 服务器

```bash
cd D:/Project/cocos/RPGCore/MapEditor
python -m http.server 8080
```

然后在浏览器打开：http://localhost:8080

### 方法三：使用 Node.js（如果你安装了 npm）

```bash
cd D:/Project/cocos/RPGCore/MapEditor
npx http-server -p 8080
```

## 📖 使用流程

### 1. 选择资源目录
- 点击"选择资源目录"按钮
- 选择项目根目录：`D:\Project\cocos\RPGCore`
- 目录授权会被保存，下次自动恢复

### 2. 加载Excel配置
- 点击"加载Excel表"按钮
- 会自动尝试加载 `sharedata/excel/D-地图表(MapData).xlsx`
- 或手动选择Excel文件

### 3. 创建新地图
- 点击"新建地图"按钮
- 填写地图配置：
  - 地图ID（如：Map1）
  - 地图名称（如：新手村）
  - 格子大小（默认：64x32）
  - 分块大小（默认：512）
- 点击"选择地图图片"，选择完整地图大图
- 点击"确定"创建地图

### 4. 地图切割
- 创建地图后，点击"切割地图"按钮
- 系统会自动：
  - 将大图切成小块
  - 保存到 `Res/Map/MapGrid/{mapId}/` 目录
  - 生成配置文件

### 5. 标记功能
- **不可移动点**：标记障碍物、墙壁等
- **资源刷新点**：标记资源生成位置（树木、矿石等）
  - 选择资源ID
  - 设置刷新数量范围
  - 左键标记，右键取消
- **出生点**：标记玩家/NPC出生位置

### 6. 物体放置
- 从左侧资源列表拖拽物体到地图
- 调整物体属性：
  - 位置格子：物体所在位置（只读）
  - 占据格子：物体占用空间
  - 偏移像素：微调位置
  - 可行走：是否可以通过

### 7. 保存地图
- 点击"保存地图"按钮
- 配置保存到 `Res/Map/MapGrid/{mapId}/config.json`

## 🎮 操作快捷键

- **鼠标滚轮**：缩放地图
- **左键拖动**：移动视图
- **Delete键**：删除选中物体
- **左键长按**：连续标记
- **右键长按**：连续取消标记

## 📐 坐标系统

地图编辑器使用**左下角坐标系**，与Cocos引擎保持一致：
- 原点：左下角 (0, 0)
- X轴：从左到右递增
- Y轴：从下到上递增

详见：[COORDINATE_SYSTEM.md](COORDINATE_SYSTEM.md)

## ❗ 常见问题

### Q: 为什么必须用服务器？
A: 浏览器安全策略限制 `file://` 协议访问本地文件，使用 HTTP 服务器可以绕过此限制。

### Q: 地图显示不出来？
A: 确保：
1. 使用 HTTP 服务器（不是直接打开文件）
2. 已授权资源目录访问权限
3. 地图图片路径正确

### Q: 切图保存失败？
A: 确保：
1. 已选择正确的资源目录
2. 目标目录有写入权限
3. 使用 Chrome/Edge 浏览器（支持 FileSystem Access API）

### Q: Excel加载失败？
A: 确保：
1. Excel文件路径正确
2. 文件格式为 `.xlsx`
3. 已授权资源目录访问

## 🔧 技术栈

- 原生 JavaScript（无框架依赖）
- HTML5 Canvas
- FileSystem Access API
- SheetJS (xlsx.js) - Excel解析

## 📂 目录结构

```
MapEditor/
├── index.html              # 主页面
├── mapEditor.js            # 核心逻辑
├── ResFS.js                # 文件系统封装
├── start-server.bat        # 启动脚本
├── README.md               # 本文件
├── COORDINATE_SYSTEM.md    # 坐标系统说明
└── COORDINATE_DISPLAY_UPDATE.md  # 坐标显示更新说明
```

## 📝 配置文件格式

地图配置保存为 JSON 格式，包含：
- 地图基本信息（ID、名称、尺寸）
- 不可移动点标记
- 资源刷新点标记
- 出生点标记
- 物体列表

示例：
```json
{
  "mapInfo": {
    "mapId": "Map1",
    "mapName": "新手村",
    "totalCols": 100,
    "totalRows": 100,
    "mapPixelWidth": 6400,
    "mapPixelHeight": 3200,
    ...
  },
  "blocks": [...],
  "resources": [...],
  "spawnPoints": [...],
  "objects": [...]
}
```
