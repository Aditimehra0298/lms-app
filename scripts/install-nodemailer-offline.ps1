# Install nodemailer from a local tarball when "npm install" cannot reach registry.npmjs.org
# (EACCES / UNABLE_TO_VERIFY_LEAF_SIGNATURE on Windows). Dev OTP without SMTP does not need this.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$version = "6.10.1"
$installed = "node_modules\nodemailer\package.json"

if (Test-Path $installed) {
  Write-Host "nodemailer already installed."
  exit 0
}

$tgz = Join-Path $env:TEMP "nodemailer-$version.tgz"
$url = "https://registry.npmjs.org/nodemailer/-/nodemailer-$version.tgz"

Write-Host "Downloading $url ..."
try {
  Invoke-WebRequest -Uri $url -OutFile $tgz -UseBasicParsing
} catch {
  Write-Host "Download failed: $($_.Exception.Message)"
  Write-Host ""
  Write-Host "Manual steps:"
  Write-Host "  1. Open in a browser: $url"
  Write-Host "  2. Save the file, then run:"
  Write-Host "     npm.cmd install C:\path\to\nodemailer-$version.tgz --omit=dev"
  exit 1
}

$env:NODE_OPTIONS = "--use-system-ca"
Write-Host "Installing from $tgz ..."
npm.cmd install $tgz --omit=dev --no-save
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path $installed)) {
  Write-Host "nodemailer still missing after install."
  exit 1
}

Write-Host "nodemailer $version installed OK."
exit 0
