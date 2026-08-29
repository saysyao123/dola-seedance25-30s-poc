@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  echo Install Node.js 20+ first, then double-click START_WEB.bat again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies for the first run...
  call npm install
  if errorlevel 1 goto :error
)

echo Starting local Dola test dashboard...
call npm run web
exit /b %errorlevel%

:error
echo.
echo Startup failed. Copy this window's error message back to the project chat.
pause
exit /b 1
