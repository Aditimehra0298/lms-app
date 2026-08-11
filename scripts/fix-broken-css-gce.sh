#!/usr/bin/env bash
# Fix unstyled sftlms.com after a GCE deploy (old /_next CSS/JS 404 + 500).
# Run ON the VM:  cd /var/www/lms && bash scripts/fix-broken-css-gce.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Working directory: $ROOT"

if [[ ! -f .env.local ]]; then
  echo "ERROR: .env.local missing. Aborting so production secrets are not lost."
  exit 1
fi

if [[ -f data/admin-content.json ]]; then
  cp -a data/admin-content.json data/admin-content.json.server-backup
  echo "==> Backed up data/admin-content.json"
fi

echo "==> Reset code to origin/main"
git fetch origin main
git reset --hard origin/main

if [[ -f data/admin-content.json.server-backup ]]; then
  cp -a data/admin-content.json.server-backup data/admin-content.json
  echo "==> Restored live admin-content.json"
fi

echo "==> Stop PM2 + leftover next processes"
pm2 delete lms || true
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
echo "==> Sample CSS files:"
find .next/static/css -name "*.css" 2>/dev/null | head -5 || echo "(no css folder yet)"

echo "==> Start PM2"
pm2 start ecosystem.config.cjs
pm2 save
pm2 status

echo ""
echo "==> Done. Commit: $(git rev-parse --short HEAD)"
echo "Next:"
echo "  1) Cloudflare → Caching → Purge Everything"
echo "  2) Close all sftlms.com tabs, open Incognito → https://sftlms.com/"
echo "  3) CSS URL in Network tab must be 200 and MUST NOT be 83142a8d24e5c81d.css"
