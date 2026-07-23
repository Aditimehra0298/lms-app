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

/** Turn pasted webhook / external links into a browser-openable absolute URL. */
export function normalizeExternalLearningUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return "";

  // Already absolute
  if (/^https?:\/\//i.test(url)) return url;
  if (/^\/\//.test(url)) return `https:${url}`;

  // Local protected paths — leave alone
  if (
    url.startsWith("/api/media/serve/") ||
    url.startsWith("/uploads/") ||
    url.startsWith("/storage/")
  ) {
    return url;
  }

  // Common paste without protocol: example.com/path or www.example.com
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

/** Open or download course learning-tool files / webhook links. */
export async function openCourseLearningResource(
  href: string,
  courseSlug: string,
  mode: "open" | "download" = "open",
): Promise<boolean> {
  const raw = normalizeExternalLearningUrl(href);
  if (!raw) return false;

  // External webhook / http(s) links — open immediately (no token).
  if (!isProtectedMediaUrl(raw)) {
    if (mode === "download") {
      const a = document.createElement("a");
      a.href = raw;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    }
    // Prefer a synthetic <a> click — more reliable than window.open for webhooks
    const a = document.createElement("a");
    a.href = raw;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }

  const popup = mode === "open" ? window.open("about:blank", "_blank", "noopener,noreferrer") : null;
  try {
    let signed = await resolveProtectedMediaUrl(raw, { courseSlug, scope: "learner" });
    if (!signed) {
      popup?.close();
      return false;
    }
    if (mode === "download") {
      signed = withDownloadParam(signed);
      const a = document.createElement("a");
      a.href = signed;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    }
    if (popup && !popup.closed) {
      popup.location.href = signed;
      return true;
    }
    window.open(signed, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    popup?.close();
    return false;
  }
}

/** Opens course learning-tool files (PPT, PDF, podcast, webhook) with signed media URLs when needed. */
export default function CourseLearningResourceLink({
  href,
  courseSlug,
  className = "",
  children,
  mode = "open",
}: Props) {
  const [busy, setBusy] = useState(false);
  const normalized = normalizeExternalLearningUrl(href);
  const isExternal = Boolean(normalized) && !isProtectedMediaUrl(normalized);

  // Webhooks / external URLs: let the browser open natively (most reliable).
  if (isExternal && mode === "open") {
    return (
      <a
        href={normalized}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => {
          // Still fire our helper so button grid + link stay consistent if needed later
        }}
      >
        {children}
      </a>
    );
  }

  const onClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!normalized || busy) return;
    setBusy(true);
    try {
      await openCourseLearningResource(normalized, courseSlug, mode);
    } finally {
      setBusy(false);
    }
  };

  return (
    <a href={normalized || href} onClick={(e) => void onClick(e)} className={className}>
      {busy ? (mode === "download" ? "Downloading…" : "Opening…") : children}
    </a>
  );
}
