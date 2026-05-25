# Remove node_modules when files are locked (Next/Tailwind native .node DLLs).
$ErrorActionPreference = "Continue"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Stopping Node..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 4

if (-not (Test-Path "node_modules")) {
  Write-Host "No node_modules folder."
  exit 0
}

try {
  Remove-Item -Recurse -Force "node_modules" -ErrorAction Stop
  Write-Host "Removed node_modules OK."
  exit 0
} catch {
  Write-Host "Remove-Item failed (files still locked). Renaming folder..."
}

$junk = "node_modules.__deleted__." + [DateTime]::UtcNow.Ticks
try {
  Rename-Item -Path "node_modules" -NewName $junk -ErrorAction Stop
  Write-Host "Renamed to $junk"
  Write-Host "Delete that folder manually after closing Cursor/VS Code, or reboot, then run: npm.cmd install --omit=optional"
  exit 0
} catch {
  Write-Host "Rename failed. Close Cursor/VS Code, stop antivirus on this folder, reboot, then delete node_modules."
  exit 1
}
