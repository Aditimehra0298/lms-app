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
