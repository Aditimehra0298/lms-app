/**
 * Browser helper: attach Coursera-style dual CSRF/XSRF headers on admin API calls.
 */

export const ADMIN_CSRF_COOKIE = "sft_admin_csrf";
export const ADMIN_XSRF_COOKIE = "sft_admin_xsrf";
export const ADMIN_CSRF_HEADER = "x-csrf-token";
export const ADMIN_XSRF_HEADER = "x-xsrf-token";

const FLAG = "__sft_admin_csrf_fetch__";

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function isAdminApiUrl(input: RequestInfo | URL): boolean {
  try {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    return (
      url.pathname.startsWith("/api/admin") ||
      url.pathname.startsWith("/api/tickets") ||
      url.pathname.startsWith("/api/issues")
    );
  } catch {
    return false;
  }
}

/** Patch window.fetch once so admin mutations send CSRF + XSRF headers. */
export function installAdminCsrfFetch(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const w = window as Window & { [FLAG]?: boolean };
  if (w[FLAG]) return () => undefined;
  w[FLAG] = true;

  const original = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isAdminApiUrl(input)) {
      return original(input, init);
    }

    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    );

    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const csrf = readCookie(ADMIN_CSRF_COOKIE);
      const xsrf = readCookie(ADMIN_XSRF_COOKIE);
      if (csrf && !headers.has(ADMIN_CSRF_HEADER)) {
        headers.set(ADMIN_CSRF_HEADER, csrf);
      }
      if (xsrf && !headers.has(ADMIN_XSRF_HEADER)) {
        headers.set(ADMIN_XSRF_HEADER, xsrf);
      }
    }

    return original(input, {
      ...init,
      headers,
      credentials: init?.credentials ?? "include",
    });
  };

  return () => {
    window.fetch = original;
    delete w[FLAG];
  };
}

export function getAdminCsrfToken(): string {
  return readCookie(ADMIN_CSRF_COOKIE);
}

export function getAdminXsrfToken(): string {
  return readCookie(ADMIN_XSRF_COOKIE);
}

/** Headers for admin mutations (JSON + double-submit CSRF/XSRF). */
export function adminMutationHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const csrf = getAdminCsrfToken();
  const xsrf = getAdminXsrfToken();
  if (csrf && !headers.has(ADMIN_CSRF_HEADER)) {
    headers.set(ADMIN_CSRF_HEADER, csrf);
  }
  if (xsrf && !headers.has(ADMIN_XSRF_HEADER)) {
    headers.set(ADMIN_XSRF_HEADER, xsrf);
  }
  return headers;
}

/** Prefer API `message` (auth/CSRF) or `error` (server) for admin UI toasts. */
export function adminApiErrorMessage(body: unknown, fallback = "Request failed"): string {
  if (body && typeof body === "object") {
    const o = body as { message?: unknown; error?: unknown };
    if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
    if (typeof o.error === "string" && o.error.trim()) return o.error.trim();
  }
  return fallback;
}
