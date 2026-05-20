$ErrorActionPreference = "Continue"
Set-Location (Join-Path $PSScriptRoot "..")

$log = Join-Path (Get-Location) "setup-otp-log.txt"

function Log($msg) {
  $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
  Add-Content -Path $log -Value $line -Encoding utf8
  Write-Host $line
}

"=== LMS OTP setup ===" | Set-Content -Path $log -Encoding utf8
Log "Working dir: $(Get-Location)"

Log "=== db:push ==="
npm.cmd run db:push 2>&1 | ForEach-Object { Log $_ }
if ($LASTEXITCODE -ne 0) {
  Log "FAILED: db:push ($LASTEXITCODE)"
  exit $LASTEXITCODE
}

Log "=== db:generate ==="
npm.cmd run db:generate 2>&1 | ForEach-Object { Log $_ }
if ($LASTEXITCODE -ne 0) {
  Log "FAILED: db:generate ($LASTEXITCODE)"
  exit $LASTEXITCODE
}

Log "=== install nodemailer ==="
$env:NODE_OPTIONS = "--use-system-ca"
npm.cmd install nodemailer@6.10.1 --omit=dev 2>&1 | ForEach-Object { Log $_ }

if ($LASTEXITCODE -ne 0 -or -not (Test-Path "node_modules\nodemailer\package.json")) {
  Log "npm registry install failed; trying offline tarball..."
  & (Join-Path $PSScriptRoot "install-nodemailer-offline.ps1") 2>&1 | ForEach-Object { Log $_ }
  if ($LASTEXITCODE -ne 0) {
    Log "FAILED: nodemailer ($LASTEXITCODE)"
    Log "Dev without SMTP still works: npm run dev prints [OTP] codes in the terminal."
    exit 1
  }
}

$nm = Test-Path "node_modules\nodemailer\package.json"
Log "nodemailer installed: $nm"

$prisma = Select-String -Path "node_modules\.prisma\client\index.d.ts" -Pattern "lmsEmailOtp" -Quiet
Log "prisma lmsEmailOtp: $prisma"

Log "=== ALL OK ==="
Write-Host ""
Write-Host "Setup finished OK. Log: $log"
exit 0
