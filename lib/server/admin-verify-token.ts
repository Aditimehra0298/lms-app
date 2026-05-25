import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    "change-admin-session-secret"
  );
}

/** Issued after correct admin password — required before Google completes login. */
export function createAdminVerifyToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const exp = Date.now() + TTL_MS;
  const payload = `${normalized}|${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifyAdminVerifyToken(token: string, email: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return false;
    const [tokenEmail, expStr, sig] = parts;
    const exp = Number(expStr);
    if (!tokenEmail || !Number.isFinite(exp) || !sig) return false;
    if (Date.now() > exp) return false;
    if (tokenEmail !== email.trim().toLowerCase()) return false;

    const payload = `${tokenEmail}|${exp}`;
    const expected = createHmac("sha256", secret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
