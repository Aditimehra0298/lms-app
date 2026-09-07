import {
  describeApiError,
  extractApiMessage,
  handleFailedApiResponse,
  type ApiErrorInfo,
} from "@/lib/api-error";

/** Parse JSON without throwing on empty or invalid input. */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  const text = raw?.trim();
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/** Read a fetch Response body as JSON; returns fallback when body is empty or invalid. */
export async function readJsonResponse<T>(res: Response, fallback: T): Promise<T> {
  try {
    const text = await res.text();
    return safeJsonParse(text, fallback);
  } catch {
    return fallback;
  }
}

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: T | null; error: ApiErrorInfo };

/**
 * Parse JSON and classify HTTP failures in one place.
 * Use for learner/admin writes where UX must react to 401/403/CSRF/network.
 */
export async function readApiResult<T extends object>(
  res: Response,
  fallback: T,
  options?: { notify?: boolean },
): Promise<ApiResult<T>> {
  const data = await readJsonResponse(res, fallback);
  if (res.ok) {
    return { ok: true, status: res.status, data };
  }
  const error =
    options?.notify === false
      ? describeApiError(res.status, data, false)
      : handleFailedApiResponse(res.status, data);
  return { ok: false, status: res.status, data, error };
}

/** Wrapper around fetch that never throws; returns classified ApiResult. */
export async function fetchApiResult<T extends object>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fallback: T,
  options?: { notify?: boolean },
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      credentials: init?.credentials ?? "include",
    });
    return readApiResult(res, fallback, options);
  } catch {
    const error = describeApiError(0, null, true);
    if (options?.notify !== false) {
      const { publishApiNotice } = await import("@/lib/api-error");
      publishApiNotice({
        message: error.message,
        kind: error.kind,
      });
    }
    return { ok: false, status: 0, data: null, error };
  }
}

export { extractApiMessage };
