@echo off
cd /d "%~dp0.."
echo Stopping Node (so Prisma can update files)...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo.
echo Generating Prisma client...
call npm.cmd run db:generate
if errorlevel 1 (
  echo.
  echo FAILED. Close all terminals running npm run dev, then run this script again.
  pause
  exit /b 1
)
echo.
echo Starting dev server at http://localhost:3000 ...
start "LMS Dev Server" cmd /k "cd /d %CD% && npm.cmd run dev"
echo Done.
pause
