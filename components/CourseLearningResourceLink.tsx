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
  /** Shown in the audio player tab title (podcast) */
  title?: string;
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

export function isLearningAudioUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (/\.(mp3|m4a|wav|ogg|aac|mpeg)(\?|#|$)/i.test(t)) return true;
  if (/^audio\//i.test(t)) return true;
  return false;
}

function absoluteMediaUrl(signed: string): string {
  if (signed.startsWith("http://") || signed.startsWith("https://")) return signed;
  return `${window.location.origin}${signed.startsWith("/") ? "" : "/"}${signed}`;
}

function writeAudioPlayerDocument(popup: Window, src: string, title = "Podcast") {
  const safeSrc = src.replace(/"/g, "&quot;");
  const safeTitle = title.replace(/</g, "&lt;");
  try {
    popup.document.open();
    popup.document.write(`<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${safeTitle}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1220;color:#fff;font-family:system-ui,sans-serif}
  .card{width:min(520px,92vw);padding:1.5rem;border-radius:1rem;border:1px solid rgba(255,255,255,.12);background:#121a2e}
  h1{margin:0 0 .75rem;font-size:1.1rem}
  audio{width:100%;margin-top:.5rem}
  p{margin:.75rem 0 0;font-size:.8rem;color:#94a3b8}
</style></head><body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <audio controls controlsList="nodownload noplaybackrate" autoplay preload="metadata" src="${safeSrc}" oncontextmenu="return false"></audio>
    <p>Stream only — downloading is disabled for this resource.</p>
  </div>
</body></html>`);
    popup.document.close();
  } catch {
    popup.location.replace(src);
  }
}

/** Resolve a signed stream URL for in-LMS audio (podcast) — never download. */
export async function resolveCourseLearningAudioUrl(
  href: string,
  courseSlug: string,
): Promise<string | null> {
  const raw = normalizeExternalLearningUrl(href);
  if (!raw) return null;
  if (!isProtectedMediaUrl(raw)) {
    return isLearningAudioUrl(raw) ? raw : null;
  }
  try {
    const signed = await resolveProtectedMediaUrl(raw, { courseSlug, scope: "learner" });
    if (!signed || (isProtectedMediaUrl(signed) && !looksSigned(signed))) return null;
    return absoluteMediaUrl(signed);
  } catch {
    return null;
  }
}

/** Open or download course learning-tool files / additional resource links. */
export async function openCourseLearningResource(
  href: string,
  courseSlug: string,
  mode: "open" | "download" = "open",
  options?: { title?: string; preferInPageAudio?: boolean },
): Promise<boolean | "audio-in-page"> {
  const raw = normalizeExternalLearningUrl(href);
  if (!raw) return false;

  const audio = isLearningAudioUrl(raw);
  const title = options?.title?.trim() || "Podcast";
  const forceOpenOnly =
    audio ||
    /podcast/i.test(title) ||
    /additional resources/i.test(title);
  const effectiveMode = forceOpenOnly ? "open" : mode;

  // Prefer in-page listen for podcast/audio (caller shows embedded player).
  if (options?.preferInPageAudio && (audio || /podcast/i.test(title))) {
    return "audio-in-page";
  }

  // External https links (Additional Resources URL) — open directly, never about:blank
  if (!isProtectedMediaUrl(raw)) {
    if (effectiveMode === "open" && audio) {
      const popup = window.open("", "_blank");
      if (popup) {
        writeAudioPlayerDocument(popup, raw, title);
        return true;
      }
    }
    // Never force-download podcast/audio or Additional Resources.
    clickAnchor(raw, { download: effectiveMode === "download" });
    return true;
  }

  // Protected LMS files (PDF, PPT, podcast, etc.):
  // Open a temporary tab WITHOUT noopener so we can navigate it after the token is ready.
  // (Using noopener left users stuck on about:blank.)
  const popup =
    effectiveMode === "open"
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

    if (effectiveMode === "download") {
      // Audio must never download — stream in player instead.
      if (audio || isLearningAudioUrl(signed)) {
        popup?.close();
        const absolute = absoluteMediaUrl(signed);
        const player = window.open("", "_blank");
        if (player) {
          writeAudioPlayerDocument(player, absolute, title);
          return true;
        }
        return false;
      }
      signed = withDownloadParam(signed);
      popup?.close();
      clickAnchor(signed);
      return true;
    }

    const absolute = absoluteMediaUrl(signed);

    if (popup && !popup.closed) {
      if (audio || isLearningAudioUrl(absolute)) {
        writeAudioPlayerDocument(popup, absolute, title);
      } else {
        popup.location.replace(absolute);
      }
      return true;
    }

  // Popup blocked — for audio, still try a same-tab player page; else anchor fallback
    if (audio || isLearningAudioUrl(absolute)) {
      const player = window.open("", "_blank");
      if (player) {
        writeAudioPlayerDocument(player, absolute, title);
        return true;
      }
    }
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
  title,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeExternalLearningUrl(href);
  const isExternal = Boolean(normalized) && !isProtectedMediaUrl(normalized);

  // External Additional Resources URLs: native browser open (never blank) — except audio
  if (isExternal && mode === "open" && !isLearningAudioUrl(normalized)) {
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
      const ok = await openCourseLearningResource(normalized, courseSlug, mode, {
        title: title || (isLearningAudioUrl(normalized) ? "Podcast" : undefined),
      });
      if (!ok) setError("Could not open file. Sign in, allow pop-ups, and try again.");
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
