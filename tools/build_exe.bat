@echo off
chcp 65001 >nul
echo ========================================
echo Atlas Packer - Build EXE
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found
    echo Please install Python first
    pause
    exit /b 1
)

echo [1/3] Installing PyInstaller...
pip install pyinstaller

if errorlevel 1 (
    echo [ERROR] Failed to install PyInstaller
    pause
    exit /b 1
)

echo.
echo [2/3] Building executable...
cd /d "%~dp0"
pyinstaller --onefile --windowed --name "AtlasPacker" --icon=NONE atlas_packer.py

if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo [3/3] Copying executable...
if exist "dist\AtlasPacker.exe" (
    copy /Y "dist\AtlasPacker.exe" "AtlasPacker.exe"
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo Executable created: AtlasPacker.exe
    echo You can now run it without Python
    echo ========================================
) else (
    echo [ERROR] Executable not found
)

echo.
pause
