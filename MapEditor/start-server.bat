@echo off
chcp 65001 >nul
echo ========================================
echo 地图编辑器本地服务器
echo ========================================
echo.
echo 正在启动服务器...
echo 服务地址: http://localhost:8080
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

cd /d "%~dp0"

REM 等待1秒后自动打开浏览器
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

REM 启动Python HTTP服务器
python -m http.server 8080
