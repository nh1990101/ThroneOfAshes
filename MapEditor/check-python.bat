@echo off
chcp 65001 >nul
echo 正在检查 Python 环境...
echo.

python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Python 已安装
    python --version
    echo.
    echo 可以使用 start-server.bat 启动服务器
    echo.
) else (
    echo ✗ 未检测到 Python
    echo.
    echo 请安装 Python 3.x:
    echo https://www.python.org/downloads/
    echo.
    echo 或者使用 Node.js:
    echo   npm install -g http-server
    echo   http-server -p 8080
    echo.
)

pause
