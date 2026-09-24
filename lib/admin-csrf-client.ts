/**
 * Browser helper: attach Coursera-style dual CSRF/XSRF headers on admin API calls.
 */

export const ADMIN_CSRF_COOKIE = "sft_admin_csrf";
export const ADMIN_XSRF_COOKIE = "sft_admin_xsrf";
export const ADMIN_CSRF_HEADER = "x-csrf-token";
export const ADMIN_XSRF_HEADER = "x-xsrf-token";

const FLAG = "__sft_admin_csrf_fetch__";
const XHR_FLAG = "__sft_admin_csrf_xhr__";

type CsrfXhr = XMLHttpRequest & {
  __sftAdminMethod?: string;
  __sftAdminUrl?: string;
  __sftCsrfApplied?: boolean;
};

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const matches = [...document.cookie.matchAll(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`, "g"))];
  const raw = matches[matches.length - 1]?.[1]?.trim() ?? "";
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isAdminApiPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/tickets") ||
    pathname.startsWith("/api/issues")
  );
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
    return isAdminApiPath(url.pathname);
  } catch {
    return false;
  }
}

function applyAdminCsrfToHeaders(headers: Headers): void {
  const csrf = readCookie(ADMIN_CSRF_COOKIE);
  const xsrf = readCookie(ADMIN_XSRF_COOKIE);
  if (csrf && !headers.has(ADMIN_CSRF_HEADER)) {
    headers.set(ADMIN_CSRF_HEADER, csrf);
  }
  if (xsrf && !headers.has(ADMIN_XSRF_HEADER)) {
    headers.set(ADMIN_XSRF_HEADER, xsrf);
  }
}

/** Attach CSRF/XSRF headers to XHR (video uploads bypass window.fetch). */
export function applyAdminCsrfToXhr(xhr: XMLHttpRequest): void {
  const tagged = xhr as CsrfXhr;
  if (tagged.__sftCsrfApplied) return;
  tagged.__sftCsrfApplied = true;
  const csrf = readCookie(ADMIN_CSRF_COOKIE);
  const xsrf = readCookie(ADMIN_XSRF_COOKIE);
  if (csrf) xhr.setRequestHeader(ADMIN_CSRF_HEADER, csrf);
  if (xsrf) xhr.setRequestHeader(ADMIN_XSRF_HEADER, xsrf);
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
      applyAdminCsrfToHeaders(headers);
    }

    return original(input, {
      ...init,
      headers,
      credentials: init?.credentials ?? "include",
    });
  };

  const wXhr = window as Window & { [XHR_FLAG]?: boolean };
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  if (!wXhr[XHR_FLAG]) {
    wXhr[XHR_FLAG] = true;
    XMLHttpRequest.prototype.open = function (
      this: CsrfXhr,
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ) {
      this.__sftAdminMethod = String(method || "GET");
      this.__sftAdminUrl = typeof url === "string" ? url : url.href;
      return origOpen.call(this, method, url, async ?? true, username, password);
    };
    XMLHttpRequest.prototype.send = function (this: CsrfXhr, body?: Document | XMLHttpRequestBodyInit | null) {
      const method = (this.__sftAdminMethod || "GET").toUpperCase();
      const rawUrl = this.__sftAdminUrl || "";
      try {
        const parsed = new URL(rawUrl, window.location.origin);
        if (
          parsed.origin === window.location.origin &&
          isAdminApiPath(parsed.pathname) &&
          method !== "GET" &&
          method !== "HEAD" &&
          method !== "OPTIONS"
        ) {
          applyAdminCsrfToXhr(this);
        }
      } catch {
        /* ignore */
      }
      return origSend.call(this, body);
    };
  }

  return () => {
    window.fetch = original;
    XMLHttpRequest.prototype.open = origOpen;
    XMLHttpRequest.prototype.send = origSend;
    delete w[FLAG];
    delete wXhr[XHR_FLAG];
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
  applyAdminCsrfToHeaders(headers);
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
