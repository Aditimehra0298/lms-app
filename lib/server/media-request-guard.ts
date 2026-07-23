/** Request guards for learner video streams (reduce link sharing / hotlinking). */

export function learnerMediaStreamAllowed(
  request: Request,
  options?: { allowDocument?: boolean },
): boolean {
  if (process.env.MEDIA_REQUIRE_SAME_SITE === "false") return true;

  const site = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (site === "cross-site") return false;

  const dest = request.headers.get("sec-fetch-dest")?.trim().toLowerCase();
  if (!options?.allowDocument && (dest === "document" || dest === "iframe" || dest === "embed")) {
    return false;
  }

  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (!host) return true;

  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    try {
      if (new URL(origin).hostname.toLowerCase() !== host) return false;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer")?.trim();
  if (referer) {
    try {
      if (new URL(referer).hostname.toLowerCase() !== host) return false;
    } catch {
      return false;
    }
  }

  return true;
}

export function parseByteRange(
  rangeHeader: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!rangeHeader?.trim() || size <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;

  let start = match[1] ? Number.parseInt(match[1], 10) : 0;
  let end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0) start = 0;
  if (end >= size) end = size - 1;
  if (start > end || start >= size) return null;
  return { start, end };
}
