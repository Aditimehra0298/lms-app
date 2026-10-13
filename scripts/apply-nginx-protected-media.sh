#!/usr/bin/env bash
# One-time: let nginx stream protected course videos (fast, native seeking) after Node authorises them.
# Run on the VM from /var/www/lms:  bash scripts/apply-nginx-protected-media.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNIPPET_SRC="$ROOT/scripts/nginx-protected-media.conf"
SNIPPET_DST="/etc/nginx/snippets/lms-protected-media.conf"
PM2_NAME="${PM2_APP_NAME:-lms}"

if [[ ! -d /etc/nginx ]]; then
  echo "ERROR: nginx is not installed on this server"
  exit 1
fi

sudo mkdir -p /etc/nginx/snippets
sed "s#/var/www/lms/#${ROOT}/#" "$SNIPPET_SRC" | sudo tee "$SNIPPET_DST" >/dev/null
echo "==> Wrote $SNIPPET_DST"

sudo python3 - <<'PY'
import pathlib

snippet = "    include /etc/nginx/snippets/lms-protected-media.conf;\n"
patched = 0
for root in ("/etc/nginx/sites-enabled", "/etc/nginx/sites-available", "/etc/nginx/conf.d"):
    base = pathlib.Path(root)
    if not base.is_dir():
        continue
    for path in sorted(base.iterdir()):
        if path.is_symlink() or not path.is_file() or path.name.startswith("."):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if "lms-protected-media.conf" in text:
            continue
        if "sftlms.com" not in text and "/var/www/lms" not in text and "proxy_pass http://127.0.0.1:3000" not in text:
            continue
        new = text.replace("    location / {", snippet + "    location / {")
        if new == text:
            new = text.replace("\tlocation / {", snippet + "\tlocation / {")
        if new != text:
            path.write_text(new, encoding="utf-8")
            print(f"patched {path}")
            patched += 1
print(f"patched_files={patched}")
PY

sudo nginx -t
sudo systemctl reload nginx
echo "==> nginx reloaded"

ENV_FILE="$ROOT/.env.local"
[[ -f "$ENV_FILE" ]] || ENV_FILE="$ROOT/.env"
if grep -q '^MEDIA_X_ACCEL=' "$ENV_FILE" 2>/dev/null; then
  sed -i 's/^MEDIA_X_ACCEL=.*/MEDIA_X_ACCEL=true/' "$ENV_FILE"
else
  printf '\nMEDIA_X_ACCEL=true\n' >> "$ENV_FILE"
fi
echo "==> MEDIA_X_ACCEL=true set in $ENV_FILE"

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
fi
echo "==> Done. Course videos are now streamed by nginx."
