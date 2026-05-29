@echo off
title Push LMS to GitHub
cd /d "%~dp0"
color 0A
echo.
echo  Local commit is ready. Pushing main to GitHub...
echo  Repo: https://github.com/Aditimehra0298/lms-app
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo  SUCCESS - open https://github.com/Aditimehra0298/lms-app/commits/main
) else (
  echo  PUSH FAILED - sign in with: gh auth login
  echo  Or use Git Credential Manager when prompted.
)
echo.
pause
