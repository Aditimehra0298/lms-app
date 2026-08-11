"use client";

import { useEffect, useState } from "react";
import { isProtectedMediaUrl, resolveProtectedMediaUrl } from "@/lib/media-client";
import { resolveCourseListThumbnail } from "@/lib/course-thumbnail";
import type { ManagedCourse } from "@/lib/content-schema";

type Props = {
  course: Pick<ManagedCourse, "image" | "hero" | "certificateConfig" | "slug" | "title">;
  className?: string;
};

/**
 * Admin catalog cover — uses a native img so /uploads/covers and public assets
 * always display (Next/Image fill often renders a black/broken box in table cells).
 */
export default function AdminCourseCoverThumb({ course, className }: Props) {
  const stored = resolveCourseListThumbnail(course) || (course.image ?? "").trim();
  const [src, setSrc] = useState(() =>
    stored && !isProtectedMediaUrl(stored) ? stored : "",
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    const next = (resolveCourseListThumbnail(course) || course.image || "").trim();
    if (!next || next.startsWith("blob:")) {
      setSrc("");
      return;
    }
    if (!isProtectedMediaUrl(next)) {
      setSrc(next);
      return;
    }
    setSrc("");
    void resolveProtectedMediaUrl(next, {
      courseSlug: course.slug,
      scope: "admin",
    }).then((signed) => {
      if (!cancelled) setSrc(signed || next);
    });
    return () => {
      cancelled = true;
    };
  }, [course]);

  const box =
    className ??
    "relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50";

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center text-[9px] text-gray-500 ${box}`}>
        No cover
      </div>
    );
  }

  return (
    <div className={box}>
      {/* Native img: exact uploaded file, no Next optimizer / fill layout issues */}
      <img
        src={src}
        alt={course.title || "Course cover"}
        className="h-full w-full object-cover object-center"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
