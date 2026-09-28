#!/usr/bin/env bash
# Point nginx at .next/static on disk (correct CSS/JS MIME). Run on the VM.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNIPPET_SRC="$ROOT/scripts/nginx-next-static.conf"
SNIPPET_DST="/etc/nginx/snippets/lms-next-static.conf"

if [[ ! -f "$SNIPPET_SRC" ]]; then
  echo "ERROR: missing $SNIPPET_SRC"
  exit 1
fi

if [[ ! -d /etc/nginx ]]; then
  echo "==> nginx not installed — skip static MIME patch"
  exit 0
fi

sudo mkdir -p /etc/nginx/snippets
sudo cp -a "$SNIPPET_SRC" "$SNIPPET_DST"
echo "==> Wrote $SNIPPET_DST"

sudo python3 - "$SNIPPET_DST" <<'PY'
import pathlib, re, sys

snippet = "    include /etc/nginx/snippets/lms-next-static.conf;\n"
roots = [
    pathlib.Path("/etc/nginx/sites-enabled"),
    pathlib.Path("/etc/nginx/sites-available"),
    pathlib.Path("/etc/nginx/conf.d"),
]
patched = 0
for root in roots:
    if not root.is_dir():
        continue
    for path in sorted(root.iterdir()):
        if not path.is_file() or path.name.startswith("."):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if "lms-next-static.conf" in text:
            continue
        if "sftlms.com" not in text and "/var/www/lms" not in text and "proxy_pass http://127.0.0.1:3000" not in text:
            continue
        new, n = re.subn(
            r"\n\s*location\s+/_next/static/\s*\{.*?\n\s*\}",
            "\n" + snippet.rstrip() + "\n",
            text,
            flags=re.S,
        )
        if n == 0:
            new = text.replace("    location / {", snippet + "    location / {", 1)
            if new == text:
                new = text.replace("\tlocation / {", snippet + "\tlocation / {", 1)
        if new != text:
            path.write_text(new, encoding="utf-8")
            print(f"patched {path}")
            patched += 1
print(f"patched_files={patched}")
PY

sudo nginx -t
sudo systemctl reload nginx
echo "==> nginx reloaded — /_next/static now served as files from $ROOT/.next/static"
