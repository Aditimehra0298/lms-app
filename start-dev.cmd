@echo off
cd /d "%~dp0"
echo Starting at %date% %time% > dev-server.log 2>&1
npm run dev >> dev-server.log 2>&1
