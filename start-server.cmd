@echo off
if not exist D:\lms-temp mkdir D:\lms-temp
set TEMP=D:\lms-temp
set TMP=D:\lms-temp
set NPM_CONFIG_CACHE=D:\lms-temp\npm-cache
if not exist %NPM_CONFIG_CACHE% mkdir %NPM_CONFIG_CACHE%
cd /d d:\Download\lms-app-main\lms-app-main
if exist .next rmdir /s /q .next
npm run dev > D:\lms-temp\server-out.log 2> D:\lms-temp\server-err.log
