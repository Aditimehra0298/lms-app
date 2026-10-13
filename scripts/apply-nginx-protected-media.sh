#!/usr/bin/env bash
# One-time nginx speed-up (safe to re-run):
#   1) nginx streams protected course videos after Node authorises them (X-Accel-Redirect)
#   2) nginx serves public/ images + hero video from disk with a 7-day cache
# Run on the VM from /var/www/lms:  bash scripts/apply-nginx-protected-media.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PM2_NAME="${PM2_APP_NAME:-lms}"

if [[ ! -d /etc/nginx ]]; then
  echo "ERROR: nginx is not installed on this server"
  exit 1
fi

sudo mkdir -p /etc/nginx/snippets
for name in protected-media public-assets; do
  sed "s#/var/www/lms/#${ROOT}/#g; s#/var/www/lms;#${ROOT};#g" "$ROOT/scripts/nginx-${name}.conf" \
    | sudo tee "/etc/nginx/snippets/lms-${name}.conf" >/dev/null
  echo "==> Wrote /etc/nginx/snippets/lms-${name}.conf"
done

BACKUP_DIR="$(mktemp -d /tmp/lms-nginx-backup.XXXXXX)"
sudo BACKUP_DIR="$BACKUP_DIR" python3 - <<'PY'
import os, pathlib, shutil

backup = pathlib.Path(os.environ["BACKUP_DIR"])
includes = [
    "    include /etc/nginx/snippets/lms-protected-media.conf;\n",
    "    include /etc/nginx/snippets/lms-public-assets.conf;\n",
]
patched = 0
for root in ("/etc/nginx/sites-enabled", "/etc/nginx/sites-available", "/etc/nginx/conf.d"):
    base = pathlib.Path(root)
    if not base.is_dir():
        continue
    for path in sorted(base.iterdir()):
        if path.is_symlink() or not path.is_file() or path.name.startswith("."):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if "sftlms.com" not in text and "/var/www/lms" not in text and "proxy_pass http://127.0.0.1:3000" not in text:
            continue
        missing = "".join(line for line in includes if line.strip() not in text)
        if not missing:
            continue
        new = text.replace("    location / {", missing + "    location / {")
        if new == text:
            new = text.replace("\tlocation / {", missing + "\tlocation / {")
        if new != text:
            shutil.copy2(path, backup / path.name)
            (backup / ".paths").open("a").write(f"{path}\n")
            path.write_text(new, encoding="utf-8")
            print(f"patched {path}")
            patched += 1
print(f"patched_files={patched}")
PY

if ! sudo nginx -t; then
  echo "ERROR: nginx rejected the new config — restoring previous files"
  if [[ -f "$BACKUP_DIR/.paths" ]]; then
    while IFS= read -r original; do
      sudo cp -a "$BACKUP_DIR/$(basename "$original")" "$original"
    done < "$BACKUP_DIR/.paths"
  fi
  sudo nginx -t && echo "==> Restored. Nothing changed." || true
  exit 1
fi
sudo systemctl reload nginx
echo "==> nginx reloaded"

# 3) gzip for JSON/CSS/JS/SVG (Ubuntu's default only compresses text/html).
GZIP_CONF=/etc/nginx/conf.d/lms-gzip.conf
if [[ ! -f "$GZIP_CONF" ]]; then
  sudo tee "$GZIP_CONF" >/dev/null <<'NGX'
gzip_types text/plain text/css text/xml application/json application/javascript application/xml image/svg+xml font/woff2;
gzip_min_length 1024;
gzip_comp_level 5;
gzip_proxied any;
gzip_vary on;
NGX
  if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "==> gzip enabled for JSON/CSS/JS"
  else
    sudo rm -f "$GZIP_CONF"
    echo "==> gzip settings already defined elsewhere — skipped"
  fi
fi

# 4) HTTP/2 on the HTTPS listeners (many parallel requests over one connection).
mapfile -t SSL_FILES < <(sudo grep -lE 'listen\s+(\[::\]:)?443\s+ssl' /etc/nginx/sites-available/* /etc/nginx/conf.d/*.conf 2>/dev/null || true)
for file in "${SSL_FILES[@]}"; do
  [[ -f "$file" ]] || continue
  sudo grep -qE 'listen[^;]*443[^;]*http2|^\s*http2\s+on' "$file" && continue
  sudo cp -a "$file" "$file.bak-http2"
  sudo sed -i -E 's/(listen\s+(\[::\]:)?443\s+ssl)([ ;])/\1 http2\3/' "$file"
  if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "==> HTTP/2 enabled in $file"
  else
    sudo cp -a "$file.bak-http2" "$file"
    echo "==> HTTP/2 not supported by this nginx config — left unchanged ($file)"
  fi
done

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
echo "==> Done. Videos are streamed by nginx and website images are cached."
