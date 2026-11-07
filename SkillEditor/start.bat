@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Please install Node.js first.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8766 in your browser.
node server.cjs
pause
