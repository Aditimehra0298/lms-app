@echo off
cd /d "%~dp0"
if exist .next rmdir /s /q .next 2>nul
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do taskkill /F /PID %%a 2>nul
npm run dev > "%~dp0server-log.txt" 2>&1
