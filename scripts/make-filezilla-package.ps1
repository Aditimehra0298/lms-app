# Create a lean FileZilla-ready package (source code only — no node_modules/.next/secrets/huge media).
# Run: powershell -ExecutionPolicy Bypass -File scripts\make-filezilla-package.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) { $root = (Get-Location).Path }

$outDir = Join-Path $root "deploy-filezilla-ready"
$stage = Join-Path $outDir "lms"
$zipPath = Join-Path $outDir "lms-upload.zip"

Write-Host "Building lean FileZilla package from: $root"

if (Test-Path $outDir) {
  cmd /c "rmdir /s /q `"$outDir`"" 2>$null
  Start-Sleep -Seconds 1
  if (Test-Path $outDir) {
    Rename-Item $outDir "deploy-filezilla-old-$(Get-Random)" -ErrorAction SilentlyContinue
  }
}
New-Item -ItemType Directory -Path $stage -Force | Out-Null

# Core folders to deploy via FileZilla
$dirs = @(
  "app",
  "components",
  "lib",
  "prisma",
  "scripts",
  "docs",
  "public"
)

foreach ($d in $dirs) {
  $src = Join-Path $root $d
  if (-not (Test-Path $src)) { continue }
  $dest = Join-Path $stage $d
  Write-Host "  copy $d ..."
  New-Item -ItemType Directory -Path $dest -Force | Out-Null
  # Skip huge upload trees and caches inside public
  & robocopy $src $dest /E /NFL /NDL /NJH /NJS /nc /ns /np `
    /XD "node_modules" ".next" "uploads" ".cache" `
    /XF "*.mp4" "*.webm" "*.mov" "*.map" | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed for $d (code $LASTEXITCODE)" }
}

# Root config + brand assets needed at runtime
$rootFiles = @(
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "tsconfig.json",
  "ecosystem.config.cjs",
  "middleware.ts",
  "postcss.config.mjs",
  "postcss.config.js",
  "tailwind.config.ts",
  "tailwind.config.js",
  "next-env.d.ts",
  ".env.example",
  "SF-WHITE-LOGO.png",
  "Untitled design (4).png"
)

foreach ($f in $rootFiles) {
  $src = Join-Path $root $f
  if (Test-Path $src) {
    Copy-Item -Force $src (Join-Path $stage $f)
    Write-Host "  file $f"
  }
}

# Minimal data folder (schema defaults only — do not overwrite server live content blindly)
$dataSrc = Join-Path $root "data"
$dataDest = Join-Path $stage "data"
New-Item -ItemType Directory -Path $dataDest -Force | Out-Null
foreach ($name in @("course-reviews.json")) {
  $p = Join-Path $dataSrc $name
  if (Test-Path $p) { Copy-Item -Force $p (Join-Path $dataDest $name) }
}
# Placeholder note
@"
Do NOT overwrite server data/admin-content.json unless you intend to replace live courses.
Keep server .env.local and storage/private/admin/ untouched.
After upload: cd /var/www/lms && npm ci && npm run build && pm2 restart lms
"@ | Set-Content (Join-Path $stage "FILEZILLA_README.txt")

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Write-Host "Compressing..."
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipPath -CompressionLevel Fastest -Force

$sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host ""
Write-Host "Done."
Write-Host "Zip:     $zipPath ($sizeMb MB)"
Write-Host "Folder:  $stage"
Write-Host ""
Write-Host "FileZilla: connect SFTP -> /var/www/lms -> upload zip contents (merge)."
Write-Host "SSH after: npm ci && npm run build && pm2 restart lms"
