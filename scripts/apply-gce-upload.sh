#!/usr/bin/env bash
# After FileZilla/SFTP merge into /var/www/lms — rebuild and restart.
# Does NOT git reset and does NOT replace live data/admin-content.json.
# Usage: cd /var/www/lms && bash scripts/apply-gce-upload.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> LMS apply upload from $(pwd)"

if [[ ! -f .env.local ]]; then
  echo "ERROR: .env.local missing. Aborting so production secrets are not lost."
  exit 1
fi

if [[ -f data/admin-content.json ]]; then
  cp -a data/admin-content.json "data/admin-content.json.bak-$(date +%F-%H%M%S)"
  echo "==> Backed up data/admin-content.json"
fi

echo "==> Stop PM2 + leftover Next on :3000"
pm2 stop lms || true
pkill -f "next start" || true
pkill -f "node_modules/next/dist/bin/next" || true || true

echo "==> Clean rebuild"
rm -rf .next
npm ci
npx prisma generate
npm run build

if [[ ! -f .next/BUILD_ID ]]; then
  echo "ERROR: npm run build did not create .next/BUILD_ID"
  exit 1
fi

echo "==> BUILD_ID=$(cat .next/BUILD_ID)"

echo "==> Start PM2"
pm2 start ecosystem.config.cjs || pm2 restart lms --update-env
pm2 save
pm2 status

echo ""
echo "==> Done. Hard-refresh https://sftlms.com/ (or Incognito)."
echo "    Live courses JSON was not replaced."
echo "    Check: Admin course delete, coupons/pricing, course-content descriptions."
