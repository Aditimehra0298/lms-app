import { createHmac, timingSafeEqual } from "node:crypto";

export type MediaAccessScope = "admin" | "learner" | "catalog";

export type MediaAccessPayload = {
  f: string;
  exp: number;
  scope: MediaAccessScope;
  course?: string;
  email?: string;
};

function signingSecret(): string {
  const s =
    process.env.MEDIA_SIGNING_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!s) {
    throw new Error("Set MEDIA_SIGNING_SECRET or ADMIN_SESSION_SECRET in .env.local");
  }
  return s;
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function createMediaAccessToken(
  payload: Omit<MediaAccessPayload, "exp"> & { ttlSeconds?: number },
): string {
  const ttl = payload.ttlSeconds ?? (payload.scope === "admin" ? 60 * 60 * 24 * 7 : 60 * 60 * 4);
  const body: MediaAccessPayload = {
    f: payload.f,
    exp: Math.floor(Date.now() / 1000) + ttl,
    scope: payload.scope,
    ...(payload.course ? { course: payload.course } : {}),
    ...(payload.email ? { email: payload.email } : {}),
  };
  const data = b64urlEncode(JSON.stringify(body));
  const sig = createHmac("sha256", signingSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyMediaAccessToken(token: string): MediaAccessPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = createHmac("sha256", signingSecret()).update(data).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(b64urlDecode(data)) as MediaAccessPayload;
    if (!payload?.f || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.f.includes("..") || payload.f.includes("/")) return null;
    return payload;
  } catch {
    return null;
  }
}
