# Zip only this release's source files (no live JSON, no .next, no secrets).
# Run: powershell -ExecutionPolicy Bypass -File scripts\make-gce-this-release.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "package.json"))) { $root = (Get-Location).Path }

$outDir = Join-Path $root "deploy-filezilla-ready"
$stage = Join-Path $outDir "this-release"
$zipPath = Join-Path $outDir "sftlms-this-release.zip"

$files = @(
  "app/api/admin/content/route.ts",
  "app/api/payments/demo/route.ts",
  "app/api/payments/razorpay/create-order/route.ts",
  "app/api/promotions/validate/route.ts",
  "app/cart/page.tsx",
  "app/checkout/page.tsx",
  "components/CheckoutPromoCode.tsx",
  "components/SelfPacedCourseCurriculum.tsx",
  "components/SelfPacedPostHeroSections.tsx",
  "components/admin/AdminCouponsReferralsPanel.tsx",
  "components/admin/AdminCoursesWorkspace.tsx",
  "components/admin/AdminLessonEditor.tsx",
  "components/admin/AdminSelfPacedCoursesPanel.tsx",
  "components/admin/LessonTypeAddControl.tsx",
  "lib/checkout-regional-pricing.ts",
  "lib/checkout-totals.ts",
  "lib/content-schema.ts",
  "lib/course-detail-template.ts",
  "lib/curriculum-landing-copy.ts",
  "lib/promotions.ts",
  "lib/server/checkout-promo.ts",
  "lib/server/content-store.ts",
  "lib/server/course-content-mysql-sync.ts",
  "lib/server/course-mysql-sync.ts",
  "lib/server/payment-record-service.ts",
  "lib/server/razorpay-service.ts",
  "scripts/apply-gce-upload.sh",
  "scripts/apply-standard-course-pricing.mjs"
)

New-Item -ItemType Directory -Path $stage -Force | Out-Null
foreach ($rel in $files) {
  $src = Join-Path $root $rel
  if (-not (Test-Path $src)) { throw "Missing: $rel" }
  $dest = Join-Path $stage $rel
  $destDir = Split-Path -Parent $dest
  New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  Copy-Item -Force $src $dest
  Write-Host "  $rel"
}

@'
SFT LMS — this release (put on GCE)

Includes:
- Admin course delete (JSON + MySQL, no hydrate restore)
- Coupons / referral codes + checkout/Razorpay discount
- Course landing curriculum: Lecture / Document / Assessment one-line copy
- No "N lectures" under module titles

Does NOT include data/admin-content.json (keep live courses on the server).

1) FileZilla SFTP to /var/www/lms
   Extract this zip OVER the existing folders (merge). Do not delete server files.

2) SSH:
   cd /var/www/lms
   cp -a data/admin-content.json data/admin-content.json.bak-$(date +%F)
   bash scripts/apply-gce-upload.sh

3) Hard-refresh https://sftlms.com/

Optional (pricing sheet on every live course):
   cd /var/www/lms && node scripts/apply-standard-course-pricing.mjs
'@ | Set-Content -Encoding utf8 (Join-Path $stage "PUT_ON_GCE.txt")

New-Item -ItemType Directory -Path $outDir -Force | Out-Null
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zipPath -CompressionLevel Fastest -Force

$sizeKb = [math]::Round((Get-Item $zipPath).Length / 1KB, 1)
Write-Host ""
Write-Host "Zip:    $zipPath ($sizeKb KB)"
Write-Host "Folder: $stage"
Write-Host "Upload zip contents into /var/www/lms then run: bash scripts/apply-gce-upload.sh"
