/**
 * Browser helper: attach JWT CSRF double-submit header on admin API calls.
 * Install once on the /admin page so all existing fetch() calls stay protected.
 */

export const ADMIN_CSRF_COOKIE = "sft_admin_csrf";
export const ADMIN_CSRF_HEADER = "x-csrf-token";

const FLAG = "__sft_admin_csrf_fetch__";

function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_CSRF_COOKIE}=([^;]*)`),
  );
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
    return url.origin === window.location.origin && url.pathname.startsWith("/api/admin");
  } catch {
    return false;
  }
}

/** Patch window.fetch once so admin mutations send X-CSRF-Token automatically. */
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
      const csrf = readCsrfCookie();
      if (csrf && !headers.has(ADMIN_CSRF_HEADER)) {
        headers.set(ADMIN_CSRF_HEADER, csrf);
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
  return readCsrfCookie();
}
