#!/usr/bin/env bash
# Run on GCE after deploy to force 100% progress for every Admin "Completed" (ready certificate).
# Usage: bash scripts/heal-ready-certificate-progress.sh
set -euo pipefail
cd "$(dirname "$0")/.."

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
  echo "Set ADMIN_EMAIL and ADMIN_PASSWORD, then re-run."
  echo "Example:"
  echo "  ADMIN_EMAIL=you@sftrainings.org ADMIN_PASSWORD='***' bash scripts/heal-ready-certificate-progress.sh"
  exit 1
fi

echo "Logging in as admin…"
curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" >/dev/null

echo "Healing progress from ready certificates…"
curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/admin/progress/heal-certificates" \
  -H "Content-Type: application/json" | tee /tmp/heal-progress.json
echo
echo "Done. Ask Isha to hard-refresh My Learning."
