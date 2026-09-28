#!/bin/bash

# Proto 文件一键更新脚本 (Mac/Linux)

echo "========================================"
echo "Proto 文件一键更新脚本"
echo "========================================"
echo

cd "$(dirname "$0")/.."

echo "[步骤 1/3] 检查环境..."
if ! command -v npm &> /dev/null; then
    echo "[错误] 未找到 npm，请先安装 Node.js"
    exit 1
fi
echo "✓ 环境检查通过"
echo

echo "[步骤 2/3] 编译 Proto 文件..."
npm run proto
if [ $? -ne 0 ]; then
    echo "[错误] 编译失败"
    exit 1
fi
echo

echo "[步骤 3/3] 完成！"
echo "========================================"
echo "✓ Proto 文件更新成功！"
echo "========================================"
echo
echo "更新内容："
echo "  - proto/proto.js"
echo "  - proto/proto.d.ts"
echo "  - assets/script/WebSocket/ProtoConfig.ts"
echo "  - assets/script/WebSocket/ProtoNetworkMgr.ts"
echo
