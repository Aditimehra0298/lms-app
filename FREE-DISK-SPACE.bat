@echo off
title Free disk space for LMS
cd /d "%~dp0"

echo Deleting Next.js build cache (.next)...
if exist ".next" rmdir /s /q ".next"
echo Done.

echo Cleaning npm cache...
call npm cache clean --force
echo.

echo Current disk space:
wmic logicaldisk where "Caption='C:' OR Caption='D:'" get Caption,FreeSpace,Size
echo.
echo Now double-click START-WEBSITE.bat
pause
