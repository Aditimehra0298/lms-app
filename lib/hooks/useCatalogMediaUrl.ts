"use client";

import { useEffect, useState } from "react";
import { resolveProtectedMediaUrl } from "@/lib/media-client";

function needsCatalogToken(url: string): boolean {
  return (
    url.startsWith("/api/media/serve/") ||
    url.startsWith("/uploads/admin/") ||
    url.startsWith("/storage/private/")
  );
}

/** Resolves private upload URLs for published course marketing images (hero, certificate preview, team). */
export function useCatalogMediaUrl(
  storedUrl: string | undefined,
  courseSlug: string,
): string {
  const [resolved, setResolved] = useState("");

  useEffect(() => {
    const url = (storedUrl ?? "").trim();
    if (!url) {
      setResolved("");
      return;
    }
    if (!needsCatalogToken(url)) {
      setResolved(url);
      return;
    }
    const slug = courseSlug.trim();
    if (!slug) {
      setResolved("");
      return;
    }

    let cancelled = false;
    void resolveProtectedMediaUrl(url, { courseSlug: slug, scope: "catalog" }).then((playUrl) => {
      if (!cancelled) setResolved(playUrl || "");
    });
    return () => {
      cancelled = true;
    };
  }, [storedUrl, courseSlug]);

  return resolved;
}
