/**
 * Shared API / network error helpers for consistent LMS UX.
 */

export type ApiErrorKind =
  | "ok"
  | "unauthorized"
  | "forbidden"
  | "csrf"
  | "not_found"
  | "rate_limit"
  | "validation"
  | "server"
  | "network"
  | "unknown";

export type ApiErrorInfo = {
  kind: ApiErrorKind;
  status: number;
  message: string;
  /** Prefer redirecting the user to sign in. */
  needsSignIn: boolean;
  /** Prefer asking the user to refresh the page (CSRF / stale tab). */
  needsRefresh: boolean;
};

type LooseBody = {
  ok?: boolean;
  message?: string;
  error?: string;
  detail?: string;
};

export function extractApiMessage(body: unknown, fallback = "Something went wrong."): string {
  if (!body || typeof body !== "object") return fallback;
  const b = body as LooseBody;
  const raw = [b.message, b.error, b.detail].find((v) => typeof v === "string" && v.trim());
  return raw?.trim() || fallback;
}

export function classifyHttpStatus(status: number, message: string): ApiErrorKind {
  if (status >= 200 && status < 300) return "ok";
  if (status === 401) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit";
  if (status === 400 || status === 422) return "validation";
  if (status === 403) {
    const m = message.toLowerCase();
    if (m.includes("csrf") || m.includes("xsrf") || m.includes("refresh")) return "csrf";
    return "forbidden";
  }
  if (status >= 500) return "server";
  return "unknown";
}

export function describeApiError(
  status: number,
  body?: unknown,
  networkFailed = false,
): ApiErrorInfo {
  if (networkFailed) {
    return {
      kind: "network",
      status: 0,
      message: "Could not reach the server. Check your connection and try again.",
      needsSignIn: false,
      needsRefresh: false,
    };
  }

  const message = extractApiMessage(body, defaultMessageForStatus(status));
  const kind = classifyHttpStatus(status, message);
  return {
    kind,
    status,
    message: friendlyApiMessage(kind, message),
    needsSignIn: kind === "unauthorized",
    needsRefresh: kind === "csrf",
  };
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 401:
      return "Sign in required.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "We could not find what you were looking for.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    default:
      if (status >= 500) return "Server error. Please try again in a moment.";
      return "Something went wrong.";
  }
}

function friendlyApiMessage(kind: ApiErrorKind, message: string): string {
  if (kind === "csrf") {
    return message.includes("Refresh") || message.includes("refresh")
      ? message
      : "Your security token expired. Refresh the page and try again.";
  }
  if (kind === "unauthorized") {
    return message || "Your session expired. Please sign in again.";
  }
  return message;
}

export const SESSION_EXPIRED_EVENT = "sft_session_expired";
export const API_NOTICE_EVENT = "sft_api_notice";

export type ApiNoticeDetail = {
  message: string;
  kind: ApiErrorKind;
  needsSignIn?: boolean;
  needsRefresh?: boolean;
};

/** Browser-wide notice (banner) for auth/CSRF/network issues. */
export function publishApiNotice(detail: ApiNoticeDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(API_NOTICE_EVENT, { detail }));
  if (detail.needsSignIn || detail.kind === "unauthorized") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail }));
  }
}

export function handleFailedApiResponse(status: number, body?: unknown): ApiErrorInfo {
  const info = describeApiError(status, body, status === 0);
  if (info.needsSignIn || info.needsRefresh || info.kind === "network" || info.kind === "server") {
    publishApiNotice({
      message: info.message,
      kind: info.kind,
      needsSignIn: info.needsSignIn,
      needsRefresh: info.needsRefresh,
    });
  }
  return info;
}
