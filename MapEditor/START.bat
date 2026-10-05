@echo off
chcp 65001 >nul
cls
echo ╔════════════════════════════════════════╗
echo ║     RPG 地图编辑器 - 启动工具        ║
echo ╚════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM 检测 Python
python --version >nul 2>&1
set HAS_PYTHON=%errorlevel%

REM 检测 Node.js
node --version >nul 2>&1
set HAS_NODE=%errorlevel%

if %HAS_PYTHON% equ 0 (
    echo [✓] 检测到 Python
    python --version
    echo.
    echo 正在使用 Python 启动服务器...
    echo 服务地址: http://localhost:8080
    echo.
    echo 按 Ctrl+C 停止服务器
    echo ----------------------------------------
    echo.

    REM 延迟2秒后打开浏览器
    start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

    REM 启动服务器
    python -m http.server 8080
    goto :end
)

if %HAS_NODE% equ 0 (
    echo [✓] 检测到 Node.js
    node --version
    echo.
    echo 正在使用 Node.js 启动服务器...
    echo 服务地址: http://localhost:8080
    echo.
    echo 按 Ctrl+C 停止服务器
    echo ----------------------------------------
    echo.

    REM 延迟2秒后打开浏览器
    start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8080"

    REM 启动服务器
    npx http-server -p 8080 -c-1
    goto :end
)

REM 如果都没有安装
echo [✗] 未检测到 Python 或 Node.js
echo.
echo 请安装以下任一工具：
echo.
echo 1. Python 3.x
echo    下载: https://www.python.org/downloads/
echo    安装后运行: python -m http.server 8080
echo.
echo 2. Node.js
echo    下载: https://nodejs.org/
echo    安装后运行: npx http-server -p 8080
echo.
pause
exit /b 1

:end
