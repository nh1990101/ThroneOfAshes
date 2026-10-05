#!/bin/bash
# 地图编辑器启动脚本

echo "========================================"
echo "  RPG地图编辑器 - 启动脚本"
echo "========================================"
echo ""

# 检查Python
if ! command -v python &> /dev/null; then
    echo "❌ 未找到Python，请先安装Python"
    exit 1
fi

echo "✓ Python已安装"

# 转换Excel数据（可选）
if [ -f "../sharedata/excel/S-地图表(MapData).xlsx" ]; then
    echo ""
    echo "📊 发现Excel文件，是否转换为JSON？(y/n)"
    read -r convert
    if [ "$convert" = "y" ]; then
        python ../convert_map_excel.py
        echo "✓ Excel转换完成"
    fi
fi

# 启动HTTP服务器
echo ""
echo "🚀 启动开发服务器..."
PORT=8080

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  端口 $PORT 已被占用，尝试使用端口 8081"
    PORT=8081
fi

# 启动服务器
python -m http.server $PORT &
SERVER_PID=$!
echo $SERVER_PID > .server.pid

echo ""
echo "========================================"
echo "✓ 服务器启动成功！"
echo ""
echo "📍 访问地址: http://127.0.0.1:$PORT/launcher.html"
echo "🔧 进程ID: $SERVER_PID"
echo ""
echo "提示："
echo "  - 请使用 Chrome 或 Edge 浏览器"
echo "  - 按 Ctrl+C 停止服务器"
echo "========================================"
echo ""

# 等待用户中断
trap "echo ''; echo '🛑 停止服务器...'; kill $SERVER_PID 2>/dev/null; rm -f .server.pid; echo '✓ 服务器已停止'; exit 0" INT

# 尝试自动打开浏览器
sleep 2
if command -v xdg-open &> /dev/null; then
    xdg-open "http://127.0.0.1:$PORT/launcher.html" 2>/dev/null
elif command -v open &> /dev/null; then
    open "http://127.0.0.1:$PORT/launcher.html" 2>/dev/null
elif command -v start &> /dev/null; then
    start "http://127.0.0.1:$PORT/launcher.html" 2>/dev/null
fi

# 保持运行
wait
