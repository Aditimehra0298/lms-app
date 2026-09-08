#!/usr/bin/env bash
# Deploy latest LMS main to this GCE/server box.
# Run from /var/www/lms (or set LMS_ROOT):
#   bash scripts/deploy-gce.sh
set -euo pipefail

LMS_ROOT="${LMS_ROOT:-/var/www/lms}"
BRANCH="${DEPLOY_BRANCH:-main}"
PM2_NAME="${PM2_APP_NAME:-lms}"

cd "$LMS_ROOT"

echo "==> LMS deploy in $LMS_ROOT (branch $BRANCH)"
echo "==> Expected GitHub tip: 4a144a9+ (admin takeover, country pricing, CSRF, OTP, security)"

if [[ ! -d .git ]]; then
  echo "ERROR: $LMS_ROOT is not a git repo"
  exit 1
fi

echo "==> git fetch / pull"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
echo "    HEAD=$(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

if [[ ! -f .env.local ]] && [[ ! -f .env ]]; then
  echo "WARNING: No .env.local or .env found — set SMTP + secrets before go-live"
fi

echo "==> npm install (include build tools: Tailwind/PostCSS/TypeScript)"
# Do NOT use --omit=dev: Next production build needs @tailwindcss/postcss, typescript, prisma CLI.
npm install

echo "==> Prisma generate + db push (users blockedAt, admin active session table)"
npx prisma generate
npx prisma db push

echo "==> Ensure data dir for session fallback file"
mkdir -p data
chmod 775 data || true

echo "==> Production build"
npm run build

echo "==> PM2 restart"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_NAME" --update-env
  else
    pm2 start ecosystem.config.cjs
  fi
  pm2 save || true
  pm2 status "$PM2_NAME" || pm2 status
else
  echo "WARNING: pm2 not found — start manually: npm run start:server"
fi

echo ""
echo "==> Deploy complete."
echo "Post-deploy checks:"
echo "  1) Sign out / sign in (new CSRF + XSRF cookies)"
echo "  2) Admin one-device lock (only active device can sign out)"
echo "  3) Signup OTP email (SMTP_* in .env.local)"
echo "  4) Country prices after login"
echo "  5) curl -sI https://sftlms.com | head"
echo ""
echo "Required .env.local keys:"
echo "  NEXT_PUBLIC_APP_URL=https://sftlms.com"
echo "  ADMIN_SESSION_SECRET=...  DATABASE_URL=..."
echo "  SMTP_HOST SMTP_USER SMTP_PASS OTP_USE_SMTP=true"
echo "  MAIN_ADMIN_EMAIL=..."
