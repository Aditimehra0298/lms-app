"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { isProtectedMediaUrl, resolveProtectedMediaUrl } from "@/lib/media-client";
import { isGenericCoursePlaceholder } from "@/lib/course-thumbnail";

type Props = {
  image?: string | null;
  title: string;
  courseSlug?: string;
  className?: string;
};

/**
 * Course list / My Learning thumbnail — signs private media URLs and falls back
 * to “No image” instead of showing a shared placeholder or a broken icon.
 */
export function CourseListThumbnail({ image, title, courseSlug, className }: Props) {
  const raw = (image ?? "").trim();
  const [src, setSrc] = useState(() =>
    raw && !isGenericCoursePlaceholder(raw) && !isProtectedMediaUrl(raw) ? raw : "",
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
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
    void resolveProtectedMediaUrl(next, {
      courseSlug: courseSlug?.trim() || undefined,
      scope: courseSlug?.trim() ? "learner" : "catalog",
    }).then((resolved) => {
      if (!cancelled) setSrc(resolved || "");
    });
    return () => {
      cancelled = true;
    };
  }, [raw, courseSlug]);

  const box =
    className ??
    "relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30";

  if (!src || failed) {
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
      <Image
        src={src}
        alt={title}
        fill
        unoptimized
        className="object-cover"
        sizes="112px"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
