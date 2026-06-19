@echo off
if not exist D:\lms-temp mkdir D:\lms-temp
set TEMP=D:\lms-temp
set TMP=D:\lms-temp
set NPM_CONFIG_CACHE=D:\lms-temp\npm-cache
cd /d d:\Download\lms-app-main\lms-app-main
wscript.exe "%~dp0free-c-drive.vbs"
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do taskkill /F /PID %%a 2>nul
start "LMS Server" cmd /k "set TEMP=D:\lms-temp& set TMP=D:\lms-temp& cd /d d:\Download\lms-app-main\lms-app-main& npm run dev"
echo started > D:\lms-temp\launched.txt
