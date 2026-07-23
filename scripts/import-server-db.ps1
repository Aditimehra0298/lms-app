# Sync server MySQL dump into local sft_lms
# 1) On server: mysqldump -u lms_user -p --single-transaction sft_lms > /tmp/sft_lms_server.sql
# 2) Copy file here as: sft_lms_server.sql (project root)
# 3) Run: powershell -ExecutionPolicy Bypass -File scripts/import-server-db.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) {
  $root = Get-Location
}

$dump = Join-Path $root "sft_lms_server.sql"
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

if (-not (Test-Path $dump)) {
  Write-Host "Missing dump file: $dump"
  Write-Host ""
  Write-Host "On the server run:"
  Write-Host '  mysqldump -u lms_user -p --single-transaction --routines --triggers sft_lms > /tmp/sft_lms_server.sql'
  Write-Host ""
  Write-Host "Then copy /tmp/sft_lms_server.sql to this PC as:"
  Write-Host "  $dump"
  exit 1
}

if (-not (Test-Path $mysql)) {
  Write-Host "MySQL client not found at: $mysql"
  exit 1
}

Write-Host "Dump found: $dump ($([math]::Round((Get-Item $dump).Length / 1MB, 2)) MB)"
Write-Host "Creating database sft_lms if needed..."

# Prompt for password once (same as .env.local root password)
$secure = Read-Host "Local MySQL root password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$pass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

& $mysql -u root --password="$pass" -e "CREATE DATABASE IF NOT EXISTS sft_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) { throw "Could not create/connect to MySQL. Check root password." }

Write-Host "Importing server dump into local sft_lms (this overwrites local data)..."
Get-Content -Path $dump -Raw | & $mysql -u root --password="$pass" sft_lms
if ($LASTEXITCODE -ne 0) { throw "Import failed." }

Write-Host "Done. Local database sft_lms now matches the server dump."
Write-Host "Restart LMS if needed: npm run dev"
