@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo DEBUG FALLBACK ONLY
echo The normal user path is the Chrome extension in extension\.
echo This script may start a separate Playwright-controlled browser.
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js 20+ for debug mode.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing debug dependencies...
  call npm install
  if errorlevel 1 goto :error
)

call npm run debug:web
exit /b %errorlevel%

:error
echo.
echo Debug startup failed.
pause
exit /b 1
