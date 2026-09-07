#Requires -Version 5.1
<#
.SYNOPSIS
  Prints the exact commands to run on the GCE LMS server after GitHub is updated.
#>
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$head = (git rev-parse --short HEAD).Trim()
$msg = (git log -1 --pretty=%s).Trim()
$remote = (git rev-parse --short origin/main).Trim()

Write-Host ""
Write-Host "Local HEAD:  $head — $msg" -ForegroundColor Cyan
Write-Host "origin/main: $remote"
if ($head -ne $remote) {
  Write-Host "WARNING: push main before deploying." -ForegroundColor Yellow
} else {
  Write-Host "GitHub is up to date — ready to deploy." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Run on GCE (SSH) ===" -ForegroundColor Yellow
Write-Host @"
cd /var/www/lms
git pull origin main
bash scripts/deploy-gce.sh
"@

Write-Host ""
Write-Host "=== Or one-liner ===" -ForegroundColor Yellow
Write-Host @"
cd /var/www/lms && git pull origin main && bash scripts/deploy-gce.sh
"@

Write-Host ""
Write-Host "=== Env checklist (.env.local) ===" -ForegroundColor Yellow
Write-Host @"
NEXT_PUBLIC_APP_URL=https://sftlms.com
DATABASE_URL=mysql://...
ADMIN_SESSION_SECRET=<long-random>
MAIN_ADMIN_EMAIL=<admin@...>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=<gmail-app-password>
SMTP_FROM="SF Trainings <...>"
OTP_USE_SMTP=true
"@

Write-Host ""
Write-Host "This release includes:" -ForegroundColor Cyan
Write-Host "  - Multi-token CSRF/XSRF + no PII cookies"
Write-Host "  - IDOR locks + error pages"
Write-Host "  - OTP SMTP fix"
Write-Host "  - Single admin device + Continue-on-this-device takeover"
Write-Host "  - Country prices from DB/standard sheet"
Write-Host "  - CSRF origin fix behind nginx"
Write-Host ""
