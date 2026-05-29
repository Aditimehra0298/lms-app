"use client";

import Image, { type ImageProps } from "next/image";
import { useCatalogMediaUrl } from "@/lib/hooks/useCatalogMediaUrl";

type Props = Omit<ImageProps, "src"> & {
  storedSrc: string;
  courseSlug: string;
};

/** Course landing image — signs /api/media/serve URLs for anonymous catalog visitors. */
export function CatalogMediaImage({ storedSrc, courseSlug, alt, className, ...rest }: Props) {
  const src = useCatalogMediaUrl(storedSrc, courseSlug);

  if (!src) {
    return (
      <div
        className={className?.includes("absolute") ? className : `animate-pulse bg-zinc-800 ${className ?? ""}`}
        aria-hidden
      />
    );
  }

  return <Image src={src} alt={alt} className={className} unoptimized {...rest} />;
}
