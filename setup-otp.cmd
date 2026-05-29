@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-otp.ps1"
exit /b %ERRORLEVEL%
