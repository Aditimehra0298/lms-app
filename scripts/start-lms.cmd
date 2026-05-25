@echo off
cd /d "%~dp0.."
echo Stopping old Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo.
echo Starting LMS at http://localhost:3000
echo Admin: http://localhost:3000/admin  (sign in with MAIN_ADMIN_EMAIL from .env.local)
echo.
start "LMS Dev" cmd /k "cd /d %CD% && npm.cmd run dev"
pause
