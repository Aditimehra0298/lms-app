@echo off
cd /d "%~dp0"
wscript.exe "%~dp0free-c-drive.vbs"
timeout /t 3 /nobreak >nul
wscript.exe "%~dp0start-lms.vbs"
