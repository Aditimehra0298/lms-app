#!/usr/bin/env bash
# Production deploy for SFT LMS (run on the VPS as the app user).
# Usage: cd /var/www/lms && bash scripts/deploy-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Branch: $(git rev-parse --abbrev-ref HEAD)"
echo "==> Commit: $(git rev-parse --short HEAD)"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local in $ROOT"
  exit 1
fi

if [[ -f data/admin-content.json ]]; then
  cp -a data/admin-content.json "data/admin-content.json.bak-$(date +%F-%H%M%S)"
  cp -a data/admin-content.json data/admin-content.json.server-backup
  echo "==> Backed up live data/admin-content.json"
fi

echo "==> Pull latest main"
git fetch origin main
# Local live JSON must not block the pull.
git checkout -- data/admin-content.json 2>/dev/null || true
git pull --ff-only origin main

if [[ -f data/admin-content.json.server-backup ]]; then
  cp -a data/admin-content.json.server-backup data/admin-content.json
  echo "==> Restored live data/admin-content.json (not replaced by GitHub)"
fi

echo "==> Apply chatbot / ticket MySQL columns (safe to re-run)"
node scripts/apply-chatbot-schema.js

echo "==> Install deps + Prisma generate + production build"
pm2 stop lms || true
rm -rf .next
npm ci
npx prisma generate
npm run build

echo "==> Start PM2"
pm2 start ecosystem.config.cjs || pm2 restart lms
pm2 save

echo "==> Done. Live commit: $(git rev-parse --short HEAD)"
pm2 status lms
