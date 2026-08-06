# Sync localhost LMS to match the production server
# ================================================
# Code is already from GitHub `main`. For SAME content as live site you must
# copy these from the SERVER (FileZilla SFTP or scp), then run the import steps.
#
# FROM SERVER (/var/www/lms) DOWNLOAD TO THIS PROJECT:
#   1) data/admin-content.json          →  data/admin-content.json
#   2) data/course-reviews.json         →  data/course-reviews.json  (optional)
#   3) MySQL dump: /tmp/sft_lms_server.sql → project root sft_lms_server.sql
#   4) storage/private/admin/           →  storage/private/admin/   (large; optional)
#
# Then run:
#   powershell -ExecutionPolicy Bypass -File scripts\sync-localhost-from-server.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) { $root = (Get-Location).Path }
Set-Location $root

$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$dump = Join-Path $root "sft_lms_server.sql"
$content = Join-Path $root "data\admin-content.json"

Write-Host "=== LMS localhost sync ===" -ForegroundColor Cyan
Write-Host "Project: $root"

# 1) Code already should match git main
Write-Host ""
Write-Host "[1/3] Git code"
git fetch origin 2>$null
git status -sb
$behind = (git rev-list --count HEAD..origin/main 2>$null)
if ($behind -and [int]$behind -gt 0) {
  Write-Host "Pulling origin/main..."
  git pull origin main
} else {
  Write-Host "Code matches origin/main (same as GitHub / intended server code)."
}

# 2) Admin content
Write-Host ""
Write-Host "[2/3] Admin content (courses)"
if (Test-Path $content) {
  $len = [math]::Round((Get-Item $content).Length / 1KB, 1)
  Write-Host "Found data/admin-content.json ($len KB). Using this for localhost."
  Write-Host "If this is NOT from the server, replace it via FileZilla first."
} else {
  Write-Host "MISSING data/admin-content.json — download from server /var/www/lms/data/" -ForegroundColor Yellow
}

# 3) Database
Write-Host ""
Write-Host "[3/3] MySQL database"
if (-not (Test-Path $mysql)) {
  Write-Host "MySQL client not found at: $mysql" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $dump)) {
  Write-Host ""
  Write-Host "MISSING sft_lms_server.sql" -ForegroundColor Yellow
  Write-Host "On the SERVER run:"
  Write-Host '  mysqldump -u lms_user -p --single-transaction --routines --triggers sft_lms > /tmp/sft_lms_server.sql'
  Write-Host "Then FileZilla download /tmp/sft_lms_server.sql to:"
  Write-Host "  $dump"
  Write-Host "Then re-run this script."
  exit 0
}

Write-Host "Found dump: $dump ($([math]::Round((Get-Item $dump).Length/1MB,2)) MB)"
$secure = Read-Host "Local MySQL root password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$pass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

& $mysql -u root --password="$pass" -e "CREATE DATABASE IF NOT EXISTS sft_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) { throw "MySQL login failed" }

Write-Host "Importing (overwrites local sft_lms)..."
Get-Content -Path $dump -Raw -Encoding UTF8 | & $mysql -u root --password="$pass" --default-character-set=utf8mb4 sft_lms
if ($LASTEXITCODE -ne 0) { throw "Import failed" }

Write-Host ""
Write-Host "Done. Restart LMS: npm run dev" -ForegroundColor Green
Write-Host "Open http://localhost:3000"
