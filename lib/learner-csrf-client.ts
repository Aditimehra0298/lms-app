/**
 * Browser helper: attach learner CSRF double-submit header on private write APIs.
 */

export const LEARNER_CSRF_COOKIE = "sft_learner_csrf";
export const LEARNER_CSRF_HEADER = "x-csrf-token";

const FLAG = "__sft_learner_csrf_fetch__";

const MUTATION_PREFIXES = [
  "/api/learner/",
  "/api/purchases",
  "/api/payments/",
  "/api/certificates/request",
  "/api/certificates/",
  "/api/tickets",
  "/api/issues",
  "/api/organization/",
  "/api/pricing/region",
  "/api/auth/record",
];

function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LEARNER_CSRF_COOKIE}=([^;]*)`),
  );
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1].trim());
  } catch {
    return match[1].trim();
  }
}

function needsLearnerCsrf(pathname: string): boolean {
  if (pathname.startsWith("/api/admin")) return false;
  return MUTATION_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`) || pathname.startsWith(p),
  );
}

function isSameOriginApi(input: RequestInfo | URL): { ok: boolean; pathname: string } {
  try {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(raw, window.location.origin);
    return {
      ok: url.origin === window.location.origin && url.pathname.startsWith("/api/"),
      pathname: url.pathname,
    };
  } catch {
    return { ok: false, pathname: "" };
  }
}

/** Patch window.fetch so learner mutations send X-CSRF-Token automatically. */
export function installLearnerCsrfFetch(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const w = window as Window & { [FLAG]?: boolean };
  if (w[FLAG]) return () => undefined;
  w[FLAG] = true;

  const original = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { ok, pathname } = isSameOriginApi(input);
    if (!ok || !needsLearnerCsrf(pathname)) {
      return original(input, init);
    }

    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined),
    );

    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const csrf = readCsrfCookie();
      // Don't overwrite admin dual-token headers if both cookies exist on /api/tickets from admin UI.
      if (csrf && !headers.has(LEARNER_CSRF_HEADER)) {
        headers.set(LEARNER_CSRF_HEADER, csrf);
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

export function getLearnerCsrfToken(): string {
  return readCsrfCookie();
}
