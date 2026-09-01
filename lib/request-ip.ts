/** Extract and classify client IPv4 / IPv6 from proxy headers (Vercel, nginx, Cloudflare, etc.). */

export type ClientIps = { ipv4: string | null; ipv6: string | null };

function stripIp(raw: string): string {
  return raw.replace(/^\[|\]$/g, "").trim();
}

/** Classify a raw IP string into ipv4 / ipv6 (handles ::ffff:x.x.x.x). */
export function classifyIp(ip: string | null | undefined): ClientIps {
  if (!ip?.trim()) return { ipv4: null, ipv6: null };
  const cleaned = stripIp(ip);
  if (cleaned.toLowerCase().startsWith("::ffff:")) {
    return { ipv4: cleaned.slice(7), ipv6: null };
  }
  if (cleaned.includes(":")) return { ipv4: null, ipv6: cleaned };
  return { ipv4: cleaned, ipv6: null };
}

export function isPrivateIp(ip: string): boolean {
  const cleaned = stripIp(ip);
  if (cleaned === "127.0.0.1" || cleaned === "::1" || cleaned === "0.0.0.0") return true;
  if (cleaned.toLowerCase().startsWith("fe80:") || cleaned.toLowerCase().startsWith("fc") || cleaned.toLowerCase().startsWith("fd")) {
    return true;
  }
  if (cleaned.startsWith("10.") || cleaned.startsWith("192.168.") || cleaned.startsWith("169.254.")) return true;
  // RFC1918 172.16.0.0 – 172.31.255.255
  const m = /^172\.(\d+)\./.exec(cleaned);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export function getClientIps(request: Request): ClientIps {
  const candidates: string[] = [];

  const headerNames = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "true-client-ip",
    "x-client-ip",
    "x-cluster-client-ip",
    "fly-client-ip",
  ];

  for (const name of headerNames) {
    const value = request.headers.get(name);
    if (!value) continue;
    if (name === "x-forwarded-for") {
      candidates.push(...value.split(",").map((s) => s.trim()));
    } else {
      candidates.push(value.trim());
    }
  }

  let ipv4: string | null = null;
  let ipv6: string | null = null;

  for (const raw of candidates) {
    if (!raw) continue;
    const parts = classifyIp(raw);
    if (parts.ipv4 && !ipv4) ipv4 = parts.ipv4;
    if (parts.ipv6 && !ipv6) ipv6 = parts.ipv6;
    if (ipv4 && ipv6) break;
  }

  return { ipv4, ipv6 };
}

/** Prefer public IPv4 for geo lookup; fall back to public IPv6, then any IP. */
export function primaryGeoIp(ips: ClientIps): string | null {
  if (ips.ipv4 && !isPrivateIp(ips.ipv4)) return ips.ipv4;
  if (ips.ipv6 && !isPrivateIp(ips.ipv6)) return ips.ipv6;
  return ips.ipv4 ?? ips.ipv6;
}

/**
 * Prefer header IPs; if missing/private, fill from a public IP discovered by geo lookup
 * (e.g. ipwho.is auto-detect when running on localhost without proxy headers).
 */
export function mergeClientIps(fromHeaders: ClientIps, detectedPublicIp?: string | null): ClientIps {
  const headerHasPublic =
    (fromHeaders.ipv4 && !isPrivateIp(fromHeaders.ipv4)) ||
    (fromHeaders.ipv6 && !isPrivateIp(fromHeaders.ipv6));
  if (headerHasPublic) return fromHeaders;
  if (!detectedPublicIp) return fromHeaders;
  const detected = classifyIp(detectedPublicIp);
  return {
    ipv4: fromHeaders.ipv4 && !isPrivateIp(fromHeaders.ipv4) ? fromHeaders.ipv4 : detected.ipv4 ?? fromHeaders.ipv4,
    ipv6: fromHeaders.ipv6 && !isPrivateIp(fromHeaders.ipv6) ? fromHeaders.ipv6 : detected.ipv6 ?? fromHeaders.ipv6,
  };
}
