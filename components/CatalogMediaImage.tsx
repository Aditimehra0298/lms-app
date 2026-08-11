"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalogMediaUrl } from "@/lib/hooks/useCatalogMediaUrl";
import { catalogCoverFallbackUrls } from "@/lib/course-thumbnail";

type Props = {
  storedSrc: string;
  courseSlug: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
};

/** Course card / landing image — native img so covers load without Next optimizer 404/500. */
export function CatalogMediaImage({ storedSrc, courseSlug, alt, className, fill }: Props) {
  const signed = useCatalogMediaUrl(storedSrc, courseSlug);
  const fallbacks = useMemo(() => catalogCoverFallbackUrls(storedSrc), [storedSrc]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [storedSrc, signed]);

  const chain = useMemo(() => {
    const list = signed ? [signed, ...fallbacks.filter((u) => u !== storedSrc.trim())] : fallbacks;
    return [...new Set(list.filter(Boolean))];
  }, [signed, fallbacks, storedSrc]);
  const src = chain[attempt] ?? "";

  if (!src) {
    return (
      <div
        className={
          className?.includes("absolute") || fill
            ? className
            : `flex items-center justify-center bg-zinc-800 text-[10px] text-gray-500 ${className ?? ""}`
        }
        aria-hidden
      />
    );
  }

  const imgClass = fill
    ? `absolute inset-0 h-full w-full object-cover ${className ?? ""}`
    : className;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={imgClass}
      onError={() => setAttempt((n) => n + 1)}
    />
  );
}
