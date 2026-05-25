# Install nodemailer after stopping Node (fixes EBUSY on .node files) and optional Tailwind ENOENT.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Stopping Node (closes dev server / Prisma Studio so files unlock)..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Installing nodemailer (omit optional Tailwind wasm packages)..."
$env:NODE_OPTIONS = "--use-system-ca"
npm.cmd install nodemailer@6.10.1 --omit=dev --omit=optional

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "If install still fails, try:"
  Write-Host "  npm.cmd run clean:node_modules"
  Write-Host "  npm.cmd install --omit=optional"
  exit $LASTEXITCODE
}

if (Test-Path "node_modules\nodemailer\package.json") {
  Write-Host "nodemailer OK."
} else {
  Write-Host "nodemailer still missing."
  exit 1
}
