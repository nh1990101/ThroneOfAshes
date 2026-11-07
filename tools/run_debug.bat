@echo off
cd /d "%~dp0"
echo Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found
    pause
    exit /b 1
)
echo.
echo Starting atlas packer...
echo.
python atlas_packer.py 2>&1
echo.
echo Exit code: %errorlevel%
pause
