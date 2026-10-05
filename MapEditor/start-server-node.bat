@echo off
chcp 65001 >nul
echo ========================================
echo 地图编辑器本地服务器 (Node.js)
echo ========================================
echo.

cd /d "%~dp0"

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ 未检测到 Node.js
    echo.
    echo 请先安装 Node.js: https://nodejs.org/
    echo 或使用 start-server.bat (需要 Python)
    echo.
    pause
    exit /b 1
)

echo 正在启动服务器...
echo 服务地址: http://localhost:8080
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

REM 等待2秒后自动打开浏览器
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

REM 启动 Node.js HTTP服务器
npx http-server -p 8080 -c-1
