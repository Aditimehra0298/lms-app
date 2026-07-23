"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { isProtectedMediaUrl, resolveProtectedMediaUrl } from "@/lib/media-client";

type Props = {
  href: string;
  courseSlug: string;
  className?: string;
  children: ReactNode;
  /** Open in browser (PDF/audio play) or force download */
  mode?: "open" | "download";
};

/** Turn pasted links into a browser-openable absolute URL. */
export function normalizeExternalLearningUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) return url;
  if (/^\/\//.test(url)) return `https:${url}`;

  if (
    url.startsWith("/api/media/serve/") ||
    url.startsWith("/uploads/") ||
    url.startsWith("/storage/")
  ) {
    return url;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?]|$)/i.test(url)) {
    return `https://${url}`;
  }

  return url;
}

function withDownloadParam(url: string): string {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    u.searchParams.set("download", "1");
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return u.toString();
    }
    return u.pathname + u.search + u.hash;
  } catch {
    return url.includes("?") ? `${url}&download=1` : `${url}?download=1`;
  }
}

function clickAnchor(url: string, opts?: { download?: boolean }) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  if (opts?.download) a.setAttribute("download", "");
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function looksSigned(url: string): boolean {
  return url.includes("?t=") || url.includes("&t=");
}

/** Open or download course learning-tool files / additional resource links. */
export async function openCourseLearningResource(
  href: string,
  courseSlug: string,
  mode: "open" | "download" = "open",
): Promise<boolean> {
  const raw = normalizeExternalLearningUrl(href);
  if (!raw) return false;

  // External https links (Additional Resources URL) — open directly, never about:blank
  if (!isProtectedMediaUrl(raw)) {
    clickAnchor(raw, { download: mode === "download" });
    return true;
  }

  // Protected LMS files (PDF, PPT, podcast, etc.):
  // Open a temporary tab WITHOUT noopener so we can navigate it after the token is ready.
  // (Using noopener left users stuck on about:blank.)
  const popup =
    mode === "open"
      ? window.open("", "_blank")
      : null;
  if (popup) {
    try {
      popup.document.write(
        "<!doctype html><title>Opening…</title><body style='font-family:system-ui;padding:2rem;background:#0b1220;color:#fff'>Opening file…</body>",
      );
      popup.document.close();
    } catch {
      /* ignore */
    }
  }

  try {
    let signed = await resolveProtectedMediaUrl(raw, { courseSlug, scope: "learner" });
    if (!signed || (isProtectedMediaUrl(signed) && !looksSigned(signed))) {
      if (popup && !popup.closed) {
        try {
          popup.document.body.innerHTML =
            "<p style='font-family:system-ui;padding:2rem'>Could not open this file. Sign in and try again.</p>";
        } catch {
          popup.close();
        }
      }
      return false;
    }

    if (mode === "download") {
      signed = withDownloadParam(signed);
      popup?.close();
      clickAnchor(signed);
      return true;
    }

    const absolute =
      signed.startsWith("http://") || signed.startsWith("https://")
        ? signed
        : `${window.location.origin}${signed.startsWith("/") ? "" : "/"}${signed}`;

    if (popup && !popup.closed) {
      popup.location.replace(absolute);
      return true;
    }

    // Popup blocked — open via anchor as fallback
    clickAnchor(absolute);
    return true;
  } catch {
    popup?.close();
    return false;
  }
}

/** Opens course learning-tool files (PPT, PDF, podcast, additional resources). */
export default function CourseLearningResourceLink({
  href,
  courseSlug,
  className = "",
  children,
  mode = "open",
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeExternalLearningUrl(href);
  const isExternal = Boolean(normalized) && !isProtectedMediaUrl(normalized);

  // External Additional Resources URLs: native browser open (never blank)
  if (isExternal && mode === "open") {
    return (
      <a href={normalized} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  const onClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!normalized || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await openCourseLearningResource(normalized, courseSlug, mode);
      if (!ok) setError("Could not open file. Sign in and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <a href={normalized || href} onClick={(e) => void onClick(e)} className={className}>
        {busy ? (mode === "download" ? "Downloading…" : "Opening…") : children}
      </a>
      {error ? <span className="text-[10px] font-normal text-rose-300">{error}</span> : null}
    </span>
  );
}
