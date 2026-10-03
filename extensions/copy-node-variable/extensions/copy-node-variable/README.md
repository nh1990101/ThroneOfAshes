# 一键复制节点变量扩展

这是一个 Cocos Creator 3.x 编辑器扩展，用于快速生成节点变量的装饰器代码。

## 功能

在场景编辑器中选中节点后，可以一键复制生成的装饰器变量代码到剪贴板。

## 使用方法

### 方法 1：右键菜单
1. 在场景编辑器（Hierarchy）中选中一个或多个节点
2. 右键选择 **"节点" -> "复制变量文本"**
3. 代码已复制到剪贴板，可以直接粘贴到组件类中

### 方法 2：快捷键
1. 在场景编辑器中选中节点
2. 按下 **`** 键（反引号，ESC下方的键）
3. 代码已复制到剪贴板

## 生成规则

### 普通节点（无特殊组件）
```typescript
@child()
btnClose: Node = null!;
```

### 带有组件的节点
会自动识别节点上的主要组件（Button、Label、Sprite等）：
```typescript
@comp(Button)
btn_battle: Button = null!;

@comp(Label)
txtTitle: Label = null!;
```

### 自定义组件
会自动读取脚本文件获取类名：
```typescript
@comp(BaseBtn)
btn_wild: BaseBtn = null!;
```

### 特殊节点名称
如果节点名称包含特殊字符或以数字开头，会自动转换为合法的变量名：
```typescript
// 节点名: btn-close
@child({ name: "btn-close" })
btn_close: Node = null!;

// 节点名: 123button
@child({ name: "123button" })
_123button: Node = null!;
```

## 安装

扩展已经位于项目的 `extensions/copy-node-variable` 目录下。

在 Cocos Creator 中：
1. 打开 **"扩展" -> "扩展管理器"**
2. 点击 **"项目"** 标签
3. 找到 **"copy-node-variable"** 扩展并启用

## 技术说明

- 优先识别常用组件：Button、Label、Sprite、EditBox、Toggle、Slider、ProgressBar、ScrollView
- 自动跳过 UITransform 等内部组件
- 支持多选节点批量生成
- 自动处理节点名称为合法的 TypeScript 变量名

## 开发

如果需要修改扩展：

```bash
cd extensions/copy-node-variable
npm install
npm run build
```

或使用监听模式：
```bash
npm run watch
```
