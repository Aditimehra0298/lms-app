/**
 * Cookie Domain so apex + www share auth sessions (e.g. sftlms.com / www.sftlms.com).
 * Never set Domain for localhost / private IPs.
 */
export function sharedAuthCookieDomain(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return undefined;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local") ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(host) ||
      host.startsWith("192.168.") ||
      host.startsWith("10.")
    ) {
      return undefined;
    }
    const base = host.startsWith("www.") ? host.slice(4) : host;
    if (!base.includes(".")) return undefined;
    return `.${base}`;
  } catch {
    return undefined;
  }
}
