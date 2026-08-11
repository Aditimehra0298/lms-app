"use client";

import { useEffect, useMemo, useState } from "react";
import { isProtectedMediaUrl, resolveProtectedMediaUrl } from "@/lib/media-client";
import { catalogCoverFallbackUrls, resolveCourseListThumbnail } from "@/lib/course-thumbnail";
import type { ManagedCourse } from "@/lib/content-schema";

type Props = {
  course: Pick<ManagedCourse, "image" | "hero" | "certificateConfig" | "slug" | "title">;
  className?: string;
};

/**
 * Admin catalog cover — native img so /uploads/covers and signed private
 * covers display (Next/Image fill often renders a black/broken box).
 */
export default function AdminCourseCoverThumb({ course, className }: Props) {
  const stored = (resolveCourseListThumbnail(course) || course.image || "").trim();
  const fallbacks = useMemo(() => catalogCoverFallbackUrls(stored), [stored]);
  const [src, setSrc] = useState(() =>
    stored && !isProtectedMediaUrl(stored) ? stored : fallbacks.find((u) => u.startsWith("/uploads/")) || "",
  );

  useEffect(() => {
    let cancelled = false;
    const next = stored;
    if (!next || next.startsWith("blob:")) {
      setSrc("");
      return;
    }
    if (!isProtectedMediaUrl(next)) {
      setSrc(next);
      return;
    }
    const publicGuess = fallbacks.find((u) => u.startsWith("/uploads/")) || "";
    setSrc(publicGuess);
    void (async () => {
      const catalog = await resolveProtectedMediaUrl(next, {
        courseSlug: course.slug,
        scope: "catalog",
      });
      if (cancelled) return;
      if (catalog && catalog.includes("?t=")) {
        setSrc(catalog);
        return;
      }
      const admin = await resolveProtectedMediaUrl(next, {
        courseSlug: course.slug,
        scope: "admin",
      });
      if (!cancelled) setSrc((admin && admin.includes("?t=") ? admin : "") || publicGuess || catalog || "");
    })();
    return () => {
      cancelled = true;
    };
  }, [stored, course.slug, fallbacks]);

  const box =
    className ??
    "relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50";

  if (!src) {
    return (
      <div className={`flex items-center justify-center text-[9px] text-gray-500 ${box}`}>
        No cover
      </div>
    );
  }

  return (
    <div className={box}>
      {/* Native img: exact uploaded file, no Next optimizer / fill layout issues */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={course.title || "Course cover"}
        className="h-full w-full object-cover object-center"
        onError={() => {
          const nextUrl = fallbacks.find((u) => u !== src && !u.includes("?t="));
          if (nextUrl) {
            setSrc(nextUrl);
            return;
          }
          setSrc("");
        }}
      />
    </div>
  );
}
