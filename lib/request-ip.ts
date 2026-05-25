/** Extract client IPv4 and IPv6 from proxy headers (Vercel, nginx, Cloudflare, etc.). */
export function getClientIps(request: Request): { ipv4: string | null; ipv6: string | null } {
  const candidates: string[] = [];

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    candidates.push(...forwarded.split(",").map((s) => s.trim()));
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) candidates.push(realIp.trim());

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) candidates.push(cfIp.trim());

  let ipv4: string | null = null;
  let ipv6: string | null = null;

  for (const raw of candidates) {
    if (!raw) continue;
    const ip = raw.replace(/^\[|\]$/g, "");
    if (ip.includes(":")) {
      if (!ipv6) ipv6 = ip;
    } else if (!ipv4) {
      ipv4 = ip;
    }
  }

  return { ipv4, ipv6 };
}

/** Prefer IPv4 for geo lookup; fall back to IPv6. */
export function primaryGeoIp(ips: { ipv4: string | null; ipv6: string | null }): string | null {
  if (ips.ipv4 && !isPrivateIp(ips.ipv4)) return ips.ipv4;
  if (ips.ipv6 && !isPrivateIp(ips.ipv6)) return ips.ipv6;
  return ips.ipv4 ?? ips.ipv6;
}

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("fe80:")) return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")) return true;
  return false;
}
