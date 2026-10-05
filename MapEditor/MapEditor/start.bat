@echo off
REM 地图编辑器启动脚本 (Windows)

echo ========================================
echo   RPG地图编辑器 - 启动脚本
echo ========================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未找到Python，请先安装Python
    pause
    exit /b 1
)

echo ✓ Python已安装

REM 转换Excel数据（可选）
if exist "..\sharedata\excel\S-地图表(MapData).xlsx" (
    echo.
    echo 📊 发现Excel文件，是否转换为JSON？(y/n^)
    set /p convert=
    if /i "%convert%"=="y" (
        python ..\convert_map_excel.py
        echo ✓ Excel转换完成
    )
)

REM 启动HTTP服务器
echo.
echo 🚀 启动开发服务器...
set PORT=8080

echo.
echo ========================================
echo ✓ 服务器启动成功！
echo.
echo 📍 访问地址: http://127.0.0.1:%PORT%/launcher.html
echo.
echo 提示：
echo   - 请使用 Chrome 或 Edge 浏览器
echo   - 按 Ctrl+C 停止服务器
echo ========================================
echo.

REM 尝试自动打开浏览器
timeout /t 2 /nobreak >nul
start http://127.0.0.1:%PORT%/launcher.html

REM 启动服务器（前台运行）
python -m http.server %PORT%
