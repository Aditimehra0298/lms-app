#!/usr/bin/env bash
# Make uploaded MP4s start instantly (moves the index to the front — no re-encode, no quality loss).
# Run on the VM from /var/www/lms:  bash scripts/optimize-videos.sh
# Optional 720p re-encode for very large files:  RESIZE_720=true bash scripts/optimize-videos.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESIZE_720="${RESIZE_720:-false}"
MIN_MB_FOR_RESIZE="${MIN_MB_FOR_RESIZE:-200}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "==> Installing ffmpeg"
  sudo apt-get update -y && sudo apt-get install -y ffmpeg
fi

fixed=0
skipped=0
for dir in "$ROOT/storage/private/admin" "$ROOT/public/uploads/admin" "$ROOT/data/uploads/admin"; do
  [[ -d "$dir" ]] || continue
  while IFS= read -r -d '' file; do
    order="$(ffprobe -v trace "$file" 2>&1 | grep -m2 -oE "type:'(moov|mdat)'" | tr '\n' ' ' || true)"
    size_mb=$(( $(stat -c '%s' "$file") / 1024 / 1024 ))
    resize=false
    if [[ "$RESIZE_720" == "true" && "$size_mb" -ge "$MIN_MB_FOR_RESIZE" ]]; then
      height="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$file" || echo 0)"
      [[ "${height:-0}" -gt 720 ]] && resize=true
    fi
    if [[ "$order" == type:\'moov\'* && "$resize" == false ]]; then
      skipped=$((skipped + 1))
      continue
    fi

    tmp="${file%.*}.optimizing.mp4"
    if [[ "$resize" == true ]]; then
      echo "==> 720p + faststart: $(basename "$file") (${size_mb} MB)"
      ffmpeg -nostdin -loglevel error -y -i "$file" -vf "scale=-2:720" -c:v libx264 -crf 23 -preset medium \
        -c:a aac -b:a 128k -movflags +faststart "$tmp"
    else
      echo "==> faststart: $(basename "$file") (${size_mb} MB)"
      ffmpeg -nostdin -loglevel error -y -i "$file" -c copy -movflags +faststart "$tmp"
    fi
    chown --reference="$file" "$tmp" 2>/dev/null || true
    chmod --reference="$file" "$tmp" 2>/dev/null || true
    mv -f "$tmp" "$file"
    fixed=$((fixed + 1))
  done < <(find "$dir" -maxdepth 1 -type f \( -iname '*.mp4' -o -iname '*.m4v' \) -print0)
done

echo "==> Done. optimised=$fixed already_fast=$skipped"
