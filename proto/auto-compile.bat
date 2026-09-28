@echo off
REM Proto 自动编译脚本（Windows 批处理版本）
REM 双击运行即可

cd /d "%~dp0"

echo ========================================
echo Proto 自动编译工具
echo ========================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查是否安装了依赖
if not exist "..\node_modules\protobufjs" (
    echo [提示] 首次运行，正在安装依赖...
    cd ..
    call npm install
    cd proto
    echo.
)

echo 选择运行模式:
echo [1] 编译一次后退出
echo [2] 监听模式（自动检测 proto 文件变化）
echo.

choice /C 12 /N /M "请选择 (1 或 2): "

if errorlevel 2 goto watch
if errorlevel 1 goto once

:once
echo.
echo [模式] 单次编译
node auto-compile.js
pause
exit /b 0

:watch
echo.
echo [模式] 监听模式（按 Ctrl+C 退出）
node auto-compile.js --watch
pause
exit /b 0
