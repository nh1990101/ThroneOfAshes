#!/bin/bash
# Proto 自动编译脚本（Mac/Linux 版本）

cd "$(dirname "$0")"

echo "========================================"
echo "Proto 自动编译工具"
echo "========================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查是否安装了依赖
if [ ! -d "../node_modules/protobufjs" ]; then
    echo "[提示] 首次运行，正在安装依赖..."
    cd ..
    npm install
    cd proto
    echo ""
fi

echo "选择运行模式:"
echo "[1] 编译一次后退出"
echo "[2] 监听模式（自动检测 proto 文件变化）"
echo ""

read -p "请选择 (1 或 2): " choice

case $choice in
    1)
        echo ""
        echo "[模式] 单次编译"
        node auto-compile.js
        ;;
    2)
        echo ""
        echo "[模式] 监听模式（按 Ctrl+C 退出）"
        node auto-compile.js --watch
        ;;
    *)
        echo "[错误] 无效的选择"
        exit 1
        ;;
esac
