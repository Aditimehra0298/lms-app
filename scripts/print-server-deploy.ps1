#Requires -Version 5.1
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
Write-Host "cd /var/www/lms"
Write-Host "git pull origin main"
Write-Host "bash scripts/deploy-gce.sh"

Write-Host ""
Write-Host "=== Or one-liner ===" -ForegroundColor Yellow
Write-Host "cd /var/www/lms && git pull origin main && bash scripts/deploy-gce.sh"

Write-Host ""
Write-Host "=== Env checklist (.env.local) ===" -ForegroundColor Yellow
Write-Host "NEXT_PUBLIC_APP_URL=https://sftlms.com"
Write-Host "DATABASE_URL=mysql://..."
Write-Host "ADMIN_SESSION_SECRET=<long-random>"
Write-Host "MAIN_ADMIN_EMAIL=<admin@...>"
Write-Host "SMTP_HOST=smtp.gmail.com"
Write-Host "SMTP_PORT=587"
Write-Host "SMTP_SECURE=false"
Write-Host "SMTP_USER=..."
Write-Host "SMTP_PASS=<gmail-app-password>"
Write-Host "SMTP_FROM=SF Trainings <...>"
Write-Host "OTP_USE_SMTP=true"

Write-Host ""
Write-Host "This release includes:" -ForegroundColor Cyan
Write-Host "  - Multi-token CSRF/XSRF + no PII cookies"
Write-Host "  - IDOR locks + error pages"
Write-Host "  - OTP SMTP fix"
Write-Host "  - Single admin device + Continue-on-this-device takeover"
Write-Host "  - Country prices from DB/standard sheet"
Write-Host "  - CSRF origin fix behind nginx"
Write-Host ""
