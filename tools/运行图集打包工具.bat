@echo off
setlocal
cd /d "%~dp0"

set "PYEXE="
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" set "PYEXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
if not defined PYEXE if exist "%LOCALAPPDATA%\Programs\Python\Launcher\py.exe" set "PYEXE=%LOCALAPPDATA%\Programs\Python\Launcher\py.exe"
if not defined PYEXE (
  echo Python was not found.
  echo Install Python 3 and check "Add python.exe to PATH", then reopen this window.
  pause
  exit /b 1
)

"%PYEXE%" "%~dp0atlas_packer.py"
if errorlevel 1 (
  echo.
  echo Atlas packer failed to start.
  pause
)
endlocal