@echo off
title LMS Dev Server - DO NOT CLOSE THIS WINDOW
cd /d "%~dp0"
set LOG=%~dp0server-log.txt

echo ============================================ > "%LOG%"
echo  Started: %date% %time% >> "%LOG%"
echo ============================================ >> "%LOG%"

echo.
echo  SF Trainings LMS
echo  =================
echo.

echo [1] Checking disk space...
wmic logicaldisk where "Caption='C:' OR Caption='D:'" get Caption,FreeSpace,Size
wmic logicaldisk where "Caption='C:' OR Caption='D:'" get Caption,FreeSpace,Size >> "%LOG%" 2>&1
echo.
echo  WARNING: You need at least 3-5 GB FREE on drive C:
echo  If the server fails with ENOSPC, free disk space first.
echo.

echo [2] Freeing project cache...
if exist ".next" (
  echo     Removing .next folder...
  rmdir /s /q ".next" 2>>"%LOG%"
)
echo     Done.
echo.

echo [3] Checking Node.js...
node -v
node -v >> "%LOG%" 2>&1
if errorlevel 1 (
  echo.
  echo  ERROR: Node.js is NOT installed.
  echo  Download from: https://nodejs.org  (LTS version)
  echo  Install it, restart this window, run this file again.
  echo ERROR: Node not found >> "%LOG%"
  pause
  exit /b 1
)
echo.

echo [4] Checking dependencies...
if not exist "node_modules\next\package.json" (
  echo     Running npm install - please wait...
  call npm install >> "%LOG%" 2>&1
  if errorlevel 1 (
    echo  ERROR: npm install failed. See server-log.txt
    pause
    exit /b 1
  )
) else (
  echo     Dependencies OK
)
echo.

echo [5] Clearing port 3000...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do (
  echo     Stopping PID %%a
  taskkill /F /PID %%a 2>nul
)
echo.

echo [6] Starting website...
echo.
echo  >>> Open in browser:  http://localhost:3000
echo  >>> KEEP THIS WINDOW OPEN while you use the site
echo  >>> Full log: server-log.txt
echo.
echo  Wait until you see "Ready" below...
echo.

call npm run dev 2>&1
echo.
echo  (If it failed, scroll up for red errors. Common: disk full = free space on C:)
pause
