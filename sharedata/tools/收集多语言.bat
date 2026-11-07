@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

set "PROJECT_ROOT=%~dp0..\.."
cd /d "%PROJECT_ROOT%"
title ThroneOfAshes Collect Lang

echo Collecting lang fields and prefab $Lang$ text into GameLangData...
echo.

set "NODE_RUNNER=%~dp0runtime\node.exe"
set "EXPORTER_SCRIPT=%~dp0excel-exporter\dist\excel-exporter.cjs"

if not exist "%NODE_RUNNER%" (
    echo Bundled Node.js runtime is missing:
    echo %NODE_RUNNER%
    set "COLLECT_EXIT_CODE=1"
    goto collect_finished
)

if not exist "%EXPORTER_SCRIPT%" (
    echo Bundled exporter is missing:
    echo %EXPORTER_SCRIPT%
    set "COLLECT_EXIT_CODE=1"
    goto collect_finished
)

"%NODE_RUNNER%" "%EXPORTER_SCRIPT%" --collect-lang
set "COLLECT_EXIT_CODE=!ERRORLEVEL!"

:collect_finished

if not "%COLLECT_EXIT_CODE%"=="0" (
    echo.
    echo ================================================================
    echo Collect failed. Check the message above.
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo Collect completed successfully.
    echo ================================================================
)

echo.
echo Press any key to close this window...
pause >nul
exit /b %COLLECT_EXIT_CODE%
