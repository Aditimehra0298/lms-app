"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import sfWhiteLogo from "@/SF-WHITE-LOGO.png";
import sfLightLogo from "@/Untitled design (4).png";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

type Props = {
  className?: string;
  /** Force dark (white) logo — use on dark LMS panels. */
  forceDark?: boolean;
  /** Force light logo — use on light backgrounds. */
  forceLight?: boolean;
  priority?: boolean;
  alt?: string;
  width?: number;
  height?: number;
};

function subscribeTheme(onStoreChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getThemeIsLight(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.theme === "light";
}

function getServerThemeIsLight(): boolean {
  return false;
}

/**
 * Same logo files as SiteHeader — use this everywhere in the LMS
 * so branding matches the site header.
 */
export default function BrandLogo({
  className = "h-10 w-auto object-contain",
  forceDark = false,
  forceLight = false,
  priority = false,
  alt = COMPANY_DISPLAY_NAME,
  width = 200,
  height = 64,
}: Props) {
  // Subscribe must be a stable function reference (do not recreate per render).
  const themeIsLight = useSyncExternalStore(
    subscribeTheme,
    getThemeIsLight,
    getServerThemeIsLight,
  );

  const useLight = forceLight ? true : forceDark ? false : themeIsLight;

  return (
    <Image
      src={useLight ? sfLightLogo : sfWhiteLogo}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
