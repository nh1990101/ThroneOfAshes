@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

set "PROJECT_ROOT=%~dp0..\.."
cd /d "%PROJECT_ROOT%"
title ThroneOfAshes Config Exporter

echo Exporting Excel to ConfigForClient.zip and TypeScript definitions...
echo.

set "NODE_RUNNER=%~dp0runtime\node.exe"
set "EXPORTER_SCRIPT=%~dp0excel-exporter\dist\excel-exporter.cjs"

if not exist "%NODE_RUNNER%" (
    echo Bundled Node.js runtime is missing:
    echo %NODE_RUNNER%
    set "EXPORT_EXIT_CODE=1"
    goto export_finished
)

if not exist "%EXPORTER_SCRIPT%" (
    echo Bundled exporter is missing:
    echo %EXPORTER_SCRIPT%
    set "EXPORT_EXIT_CODE=1"
    goto export_finished
)

"%NODE_RUNNER%" "%EXPORTER_SCRIPT%"
set "EXPORT_EXIT_CODE=!ERRORLEVEL!"

:export_finished

if not "%EXPORT_EXIT_CODE%"=="0" (
    echo.
    echo ================================================================
    echo Export failed. Check the file, sheet, row and column above.
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo Export completed successfully.
    echo ================================================================
)

echo.
echo Press any key to close this window...
pause >nul
exit /b %EXPORT_EXIT_CODE%
