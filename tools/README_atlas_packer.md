# 图集打包工具使用说明

## 简介
这是一个基于 Python + tkinter 的可视化工具，用于简化 TexturePacker 的批量打包操作。

## 功能特点
✅ 可视化界面，无需命令行操作  
✅ 支持单个文件夹打包  
✅ 支持批量处理多个子文件夹  
✅ 自动保存最近使用的路径  
✅ 可自定义打包参数（格式、尺寸、算法等）  
✅ 实时显示打包进度和日志  

## 环境要求
1. **Python 3.x** - [下载地址](https://www.python.org/downloads/)
2. **TexturePacker** - 已安装并可通过命令行调用
   - 免费版: https://www.codeandweb.com/texturepacker/download
   - 确保 `TexturePacker` 在系统 PATH 中，或在工具中手动设置路径

## 快速开始

### 方法1: 双击运行（推荐）
直接双击 `运行图集打包工具.bat` 文件

### 方法2: 命令行运行
```bash
cd tools
python atlas_packer.py
```

## 使用步骤

### 单个文件夹打包
1. **选择原图目录** - 点击"浏览"选择包含序列帧的文件夹
2. **选择输出目录** - 点击"浏览"选择图集输出位置
3. **输入图集名称** - 为生成的图集命名（不含扩展名）
4. **调整参数**（可选）- 根据需要调整格式、尺寸等参数
5. **点击"开始打包"** - 等待完成

### 批量处理子文件夹
1. 勾选 **"批量处理子文件夹"** 选项
2. 选择包含多个子文件夹的父目录作为原图目录
3. 选择输出目录
4. 点击"开始打包"
5. 工具会自动遍历所有子文件夹，每个子文件夹打包为独立图集

## 参数说明

### 基本参数
- **格式**: 图集数据格式
  - `cocos2d` - Cocos Creator 推荐
  - `unity` - Unity 引擎
  - `json` - 通用 JSON
  - `phaser` - Phaser 引擎
  - `spine` - Spine 动画

- **最大尺寸**: 图集最大分辨率
  - 常用: 2048x2048
  - 可选: 512, 1024, 4096

- **打包算法**: 排列算法
  - `MaxRects` - 最优排列（推荐）
  - `Basic` - 简单排列
  - `Polygon` - 多边形打包

- **缩放比例**: 图片缩放（1.0 = 原始大小）

### 选项
- ✅ **自动裁剪透明边** - 移除图片周围透明像素
- ✅ **允许旋转** - 优化排列时允许旋转图片
- ⬜ **预乘Alpha** - 预乘透明通道（特定引擎需要）

## 配置文件
工具会自动生成 `atlas_packer_config.json` 文件，保存：
- TexturePacker 可执行文件路径
- 最近使用的输入/输出目录

## 常见问题

### 1. 提示"找不到 TexturePacker"
**解决方法**：
- 点击工具中的 **"设置 TexturePacker"** 按钮
- 选择 TexturePacker 安装目录下的可执行文件
- 通常位置:
  - Windows: `C:\Program Files\CodeAndWeb\TexturePacker\bin\TexturePacker.exe`
  - 或在工具菜单中查找安装路径

### 2. 打包失败
**检查项**：
- 确认原图目录中有图片文件
- 确认输出目录有写入权限
- 查看日志中的错误信息

### 3. 中文路径问题
- 尽量避免路径中包含中文或特殊字符
- 如必须使用，确保系统编码设置正确

### 4. 图集过大
- 减小"最大尺寸"参数
- 启用"自动裁剪透明边"
- 调整"缩放比例"（如 0.5 缩小一半）

## 典型使用场景

### 场景1: 序列帧动画打包
```
原图目录: ThroneOfAshes_Art\x-序列帧\角色攻击
输出目录: D:\Project\Client\assets\remote\Res\character
图集名称: character_attack
```

### 场景2: 批量打包多个动画
```
原图目录: ThroneOfAshes_Art\x-序列帧  (包含多个子文件夹)
         ├─角色攻击/
         ├─角色待机/
         └─角色跑步/
输出目录: D:\Project\Client\assets\remote\Res\character
勾选: [✓] 批量处理子文件夹

结果:
- character_attack.png + character_attack.plist
- character_idle.png + character_idle.plist
- character_run.png + character_run.plist
```

## 技术支持
- 遇到问题请检查日志输出
- TexturePacker 官方文档: https://www.codeandweb.com/texturepacker/documentation

## 更新日志
- v1.0 (2024) - 初始版本
  - 基础打包功能
  - 批量处理支持
  - 参数配置界面
