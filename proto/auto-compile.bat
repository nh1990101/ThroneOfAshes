@echo off
setlocal
cd /d "%~dp0.."
node proto\auto-compile.js %*
set "PROTO_EXIT_CODE=%ERRORLEVEL%"
if not defined PROTO_NO_PAUSE pause
exit /b %PROTO_EXIT_CODE%
