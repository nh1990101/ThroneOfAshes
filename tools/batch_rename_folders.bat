@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "target_dir=D:\Project\ThroneOfAshes_Art\dabao"
set /a counter=1001

echo ========================================
echo Batch Rename Folders
echo ========================================
echo Target: %target_dir%
echo Starting from: %counter%
echo.
echo Press any key to start renaming...
pause >nul

cd /d "%target_dir%"

for /d %%F in (*) do (
    echo Renaming: "%%F" -^> "!counter!"
    ren "%%F" "!counter!"
    set /a counter+=1
)

echo.
echo ========================================
echo Done! Renamed folders from 1001 to !counter!
echo ========================================
pause
