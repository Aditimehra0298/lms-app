/**
 * In-memory OTP rate limits (single PM2 process).
 * Email attemptCounts in MySQL are the durable lockout; IP buckets stop spray/brute.
 */

type Bucket = { count: number; resetAt: number; lastAt: number };

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult =
  | { ok: true; remaining: number; retryAfterSec: number }
  | { ok: false; message: string; retryAfterSec: number };

export function hitRateLimit(
  key: string,
  max: number,
  windowMs: number,
  message: string,
): RateLimitResult {
  const now = Date.now();
  prune(now);
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs, lastAt: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  b.lastAt = now;
  const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  if (b.count > max) {
    return { ok: false, message, retryAfterSec };
  }
  return { ok: true, remaining: Math.max(0, max - b.count), retryAfterSec };
}

/** Enforce a minimum gap between actions for the same key. */
export function enforceMinGap(
  key: string,
  minGapMs: number,
  message: string,
): RateLimitResult {
  const now = Date.now();
  const gapKey = `gap:${key}`;
  const prev = buckets.get(gapKey);
  if (prev && now - prev.lastAt < minGapMs) {
    const retryAfterSec = Math.max(1, Math.ceil((minGapMs - (now - prev.lastAt)) / 1000));
    return { ok: false, message, retryAfterSec };
  }
  buckets.set(gapKey, { count: 1, resetAt: now + minGapMs * 2, lastAt: now });
  return { ok: true, remaining: 1, retryAfterSec: 0 };
}

export function clearRateLimitKey(key: string) {
  buckets.delete(key);
  buckets.delete(`gap:${key}`);
}

/** Read current limit state without incrementing (for lockout checks). */
export function getRateLimitStatus(
  key: string,
  max: number,
): { limited: boolean; count: number; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    return { limited: false, count: 0, retryAfterSec: 0 };
  }
  const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
  return {
    limited: b.count >= max,
    count: b.count,
    retryAfterSec,
  };
}

