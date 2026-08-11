"use client";

import { useEffect, useMemo, useState } from "react";
import { isProtectedMediaUrl, resolveProtectedMediaUrl } from "@/lib/media-client";
import { catalogCoverFallbackUrls, isGenericCoursePlaceholder } from "@/lib/course-thumbnail";
import { getLearnerEmail } from "@/lib/learner-session-client";

type Props = {
  image?: string | null;
  title: string;
  courseSlug?: string;
  className?: string;
  /** `contain` shows the full artwork; `cover` fills the box (may crop). */
  fit?: "contain" | "cover";
};

/**
 * Course list / My Learning thumbnail — signs private media URLs and falls back
 * to public /uploads/covers before showing “No image”.
 */
export function CourseListThumbnail({
  image,
  title,
  courseSlug,
  className,
  fit = "cover",
}: Props) {
  const raw = (image ?? "").trim();
  const fallbacks = useMemo(() => catalogCoverFallbackUrls(raw), [raw]);
  const [src, setSrc] = useState(() =>
    raw && !isGenericCoursePlaceholder(raw) && !isProtectedMediaUrl(raw) ? raw : "",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setAttempt(0);
    const next = raw.trim();
    if (!next || isGenericCoursePlaceholder(next)) {
      setSrc("");
      return;
    }
    if (!isProtectedMediaUrl(next)) {
      setSrc(next);
      return;
    }
    setSrc("");
    const slug = courseSlug?.trim() || undefined;
    const email = getLearnerEmail()?.trim();
    void (async () => {
      const catalog = await resolveProtectedMediaUrl(next, {
        courseSlug: slug,
        scope: "catalog",
      });
      if (cancelled) return;
      if (catalog && catalog.includes("?t=")) {
        setSrc(catalog);
        return;
      }
      const learner =
        email && slug
          ? await resolveProtectedMediaUrl(next, {
              courseSlug: slug,
              scope: "learner",
            })
          : "";
      if (cancelled) return;
      if (learner && learner.includes("?t=")) {
        setSrc(learner);
        return;
      }
      setSrc(fallbacks[1] || fallbacks[0] || catalog || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [raw, courseSlug, fallbacks]);

  const box =
    className ??
    "relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30";

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center px-1 text-center text-[10px] leading-tight text-gray-500 ${box}`}
      >
        No image
      </div>
    );
  }

  return (
    <div className={box}>
      {/* Native img: Next/Image fill was blank/500 for many /_next and media URLs */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title}
        className={
          fit === "contain"
            ? "h-full w-full object-contain object-center"
            : "h-full w-full object-cover object-center"
        }
        onError={() => {
          const next = fallbacks[attempt + 1];
          if (next && next !== src) {
            setAttempt((n) => n + 1);
            setSrc(next);
            return;
          }
          setSrc("");
        }}
      />
    </div>
  );
}
