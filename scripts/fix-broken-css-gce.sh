#!/usr/bin/env bash
# Fix unstyled sftlms.com after a GCE deploy (CSS/JS 500 + text/plain MIME).
# Run ON the VM as the app user (not root):
#   cd /var/www/lms && bash scripts/fix-broken-css-gce.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_USER="$(stat -c '%U' "$ROOT")"
APP_GROUP="$(stat -c '%G' "$ROOT")"
if [[ $EUID -eq 0 && "$APP_USER" != "root" ]]; then
  echo "==> Re-running as $APP_USER (root-owned .next makes CSS/JS return 500 text/plain)"
  exec sudo -u "$APP_USER" -H bash "$ROOT/scripts/fix-broken-css-gce.sh"
fi

echo "==> Working directory: $ROOT (user=$(id -un))"

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

# If any step ran as root earlier, PM2 still cannot read these files.
sudo chown -R "$APP_USER:$APP_GROUP" .next || chown -R "$APP_USER:$APP_GROUP" .next || true
chmod -R a+rX .next

echo "==> BUILD_ID=$(cat .next/BUILD_ID)"
echo "==> Sample CSS files:"
find .next/static/css -name "*.css" 2>/dev/null | head -5 || echo "(no css folder yet)"

echo "==> Start PM2"
pm2 start ecosystem.config.cjs
pm2 save
pm2 status

if [[ -x "$ROOT/scripts/apply-nginx-next-static.sh" ]] || [[ -f "$ROOT/scripts/apply-nginx-next-static.sh" ]]; then
  echo "==> Point nginx at .next/static so CSS is text/css (not a Next 500 page)"
  bash "$ROOT/scripts/apply-nginx-next-static.sh" || echo "WARNING: nginx MIME patch skipped"
fi

echo ""
echo "==> Local MIME check (must be text/css, not text/plain):"
CSS_FILE="$(find .next/static/css -name '*.css' | head -1 || true)"
if [[ -n "$CSS_FILE" ]]; then
  CSS_NAME="$(basename "$CSS_FILE")"
  curl -sI "http://127.0.0.1:3000/_next/static/css/${CSS_NAME}" | head -20 || true
fi

echo ""
echo "==> Done. Commit: $(git rev-parse --short HEAD)"
echo "Next:"
echo "  1) Cloudflare → Caching → Purge Everything"
echo "  2) Close all sftlms.com tabs, open Incognito → https://sftlms.com/"
echo "  3) Network tab: CSS must be 200 and Content-Type text/css"
echo "  4) Do NOT keep using the old URL .../426d66b9c5b10db2.css — that file is from the broken build"
