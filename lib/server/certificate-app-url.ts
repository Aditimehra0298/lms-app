/** Public LMS base URL (browser links, verify URLs). */
export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Base URL n8n uses to POST /api/certificates/n8n-callback (use ngrok in local dev). */
export function n8nCallbackBaseUrl(): string {
  const override = process.env.N8N_CALLBACK_BASE_URL?.trim();
  if (override) return override.replace(/\/$/, "");
  return appBaseUrl();
}

export function toAbsoluteAppUrl(pathOrUrl: string, base = appBaseUrl()): string {
  const raw = pathOrUrl.trim();
  if (!raw) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const root = base.replace(/\/$/, "");
  return `${root}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

/** n8n Cloud cannot reach localhost or private LAN IPs. */
export function isPrivateOrLocalBaseUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return true;
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
    return false;
  } catch {
    return true;
  }
}

export function shouldUseLocalCertificateFallback(): boolean {
  if (process.env.CERTIFICATE_LOCAL_FALLBACK?.trim().toLowerCase() === "true") return true;
  if (process.env.CERTIFICATE_LOCAL_FALLBACK?.trim().toLowerCase() === "false") return false;
  return isPrivateOrLocalBaseUrl(n8nCallbackBaseUrl());
}
