import { sharedAuthCookieDomain } from "@/lib/server/auth-cookie-domain";

export type CookieRequestScope = {
  domain?: string;
  secure: boolean;
};

function hostnameFrom(value: string): string {
  return value.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

function isLocalHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local")
  );
}

function envWantsSecure(): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  return appUrl.startsWith("https://") || process.env.NODE_ENV === "production";
}

/** Host + protocol of the request that is setting the cookie. */
export function cookieScopeFromRequest(request?: Request): CookieRequestScope {
  if (!request) {
    return { domain: sharedAuthCookieDomain(), secure: envWantsSecure() };
  }

  const host = hostnameFrom(
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "",
  );
  if (isLocalHost(host)) {
    return { domain: undefined, secure: false };
  }

  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  let secure = forwarded === "https";
  if (!forwarded) {
    try {
      secure = new URL(request.url).protocol === "https:";
    } catch {
      secure = envWantsSecure();
    }
  }

  const domain = sharedAuthCookieDomain();
  const domainHost = domain?.replace(/^\./, "") ?? "";
  const domainMatches = Boolean(domainHost && (host === domainHost || host.endsWith(`.${domainHost}`)));
  return { domain: domainMatches ? domain : undefined, secure };
}
