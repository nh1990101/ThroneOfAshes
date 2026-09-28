@echo off
chcp 65001 >nul
echo ========================================
echo Proto 文件一键更新脚本
echo ========================================
echo.

cd /d "%~dp0.."

echo [步骤 1/3] 检查环境...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 npm，请先安装 Node.js
    pause
    exit /b 1
)
echo ✓ 环境检查通过
echo.

echo [步骤 2/3] 编译 Proto 文件...
call npm run proto
if %errorlevel% neq 0 (
    echo [错误] 编译失败
    pause
    exit /b 1
)
echo.

echo [步骤 3/3] 完成！
echo ========================================
echo ✓ Proto 文件更新成功！
echo ========================================
echo.
echo 更新内容：
echo   - proto/proto.js
echo   - proto/proto.d.ts
echo   - assets/script/WebSocket/ProtoConfig.ts
echo   - assets/script/WebSocket/ProtoNetworkMgr.ts
echo.
echo ⚠ 提示：请在 Cocos Creator 中刷新资源
echo   方式1：右键 assets 文件夹 → 重新导入资源
echo   方式2：菜单栏 → 开发者 → 重新编译脚本
echo.
pause
