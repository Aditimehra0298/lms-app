"use client";

import { getLearnerEmail } from "@/lib/learner-session-client";
import { readJsonResponse } from "@/lib/safe-json";

/** True for LMS private storage paths that need a signed token. */
export function isProtectedMediaUrl(url: string): boolean {
  const t = url.trim();
  return (
    t.startsWith("/api/media/serve/") ||
    t.startsWith("/uploads/admin/") ||
    t.startsWith("/storage/private/")
  );
}

/** Turn a stored media path into a short-lived URL the browser can load (video/img/link). */
export async function resolveProtectedMediaUrl(
  storedUrl: string,
  options?: { courseSlug?: string; scope?: "admin" | "learner" | "catalog" },
): Promise<string> {
  const url = storedUrl.trim();
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.includes("?t=")) return url;
  const isLocal =
    url.startsWith("/uploads/admin/") ||
    url.startsWith("/api/media/serve/") ||
    url.startsWith("/storage/private/");
  if (!isLocal) return url;

  const email = getLearnerEmail()?.trim().toLowerCase() ?? "";
  try {
    const res = await fetch("/api/media/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        email: email || undefined,
        courseSlug: options?.courseSlug,
        scope: options?.scope,
      }),
    });
    const data = await readJsonResponse(res, {} as { ok?: boolean; playUrl?: string });
    if (res.ok && data.ok && data.playUrl) return data.playUrl;
  } catch {
    /* fall through */
  }
  return url;
}
