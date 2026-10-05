# 地图编辑器快速开始指南

## 1. 打开编辑器

在浏览器中打开 `MapEditor/launcher.html` 或直接打开 `MapEditor/index.html`

**重要**: 必须使用 **Chrome** 或 **Edge** 浏览器

## 2. 快速使用流程

### 第一步：选择资源目录
点击 "选择资源目录" → 选择项目的 `assets/remote` 目录

### 第二步：新建地图
1. 点击 "新建地图"
2. 填写地图ID：`Map1`
3. 填写地图名称：`测试地图`
4. 逻辑格子宽高：`32` × `32`
5. 选择大地图JPG文件（会自动切割）或已切割的目录

### 第三步：加载资源
点击 "加载资源" 自动扫描 MapObject 目录

### 第四步：标记地图
1. 选择标记模式 → "不可移动点" 或 "资源刷新点"
2. 在地图上点击或拖动标记
3. 右键取消标记

### 第五步：添加物体
从左侧资源列表拖动物体到地图上

### 第六步：随机生成（可选）
1. 加载Excel表：`sharedata/excel/S-地图表(MapData).xlsx`
2. 点击 "随机生成物件"

### 第七步：保存配置
点击 "保存地图" 导出配置JSON文件

## 3. 快捷操作

| 操作 | 说明 |
|------|------|
| 鼠标滚轮 | 缩放地图 |
| 左键拖动 | 平移地图（非标记模式） |
| 左键点击 | 标记格子或选中物体 |
| 右键点击 | 取消标记 |
| 拖放资源 | 添加物体到地图 |

## 4. 测试数据

编辑器已包含示例资源：
- `assets/remote/Res/Map/MapObject/Image/building_*.png`
- `assets/remote/Res/Map/MapObject/Image/icon.png`

## 5. 常见问题

**Q: 浏览器不支持？**
A: 仅支持 Chrome 86+ 和 Edge 86+

**Q: 找不到资源？**
A: 确保已选择正确的资源目录，点击"选择资源目录"重新选择

**Q: 地图切割保存失败？**
A: 检查是否已授权目录访问权限

**Q: 随机生成没有效果？**
A: 1) 确保已加载Excel表 2) 确保已标记资源刷新点 3) 检查Excel中对应ID的配置

## 6. 文件说明

```
MapEditor/
├── launcher.html        # 启动页面（推荐从这里开始）
├── index.html          # 编辑器主页面
├── mapEditor.js        # 主要逻辑
├── js/                 # 辅助模块
│   ├── fsAccess.js    # 文件系统访问
│   ├── excelParser.js # Excel解析
│   ├── resourceLoader.js # 资源加载
│   ├── slicer.js      # 地图切割
│   └── util.js        # 工具函数
├── README.md          # 详细使用说明
└── QUICKSTART.md      # 本文件
```

更多详细说明请查看 [README.md](README.md)
