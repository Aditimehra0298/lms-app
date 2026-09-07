import { getClientIps, isPrivateIp } from "@/lib/request-ip";

/**
 * Client IP for security rate limits.
 * Do NOT use the leftmost X-Forwarded-For value — attackers can spoof it.
 * Prefer nginx X-Real-IP / CF-Connecting-IP, else the rightmost XFF hop.
 */
export function getTrustedClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.replace(/^\[|\]$/g, "");

  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.replace(/^\[|\]$/g, "");

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((s) => s.trim().replace(/^\[|\]$/g, ""))
      .filter(Boolean);
    // Rightmost is typically added by the reverse proxy (real client when one hop).
    for (let i = parts.length - 1; i >= 0; i--) {
      const ip = parts[i]!;
      if (!isPrivateIp(ip)) return ip;
    }
    if (parts.length > 0) return parts[parts.length - 1]!;
  }

  const ips = getClientIps(request);
  return ips.ipv4 || ips.ipv6 || "unknown";
}
