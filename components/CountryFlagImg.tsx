"use client";

import { useEffect, useMemo, useState } from "react";
import { countryFlagDisplays, type FlagDisplay } from "@/lib/country-flag-image";

type Props = {
  code: string;
  className?: string;
  /** flagcdn width param */
  width?: number;
};

/** Flag image with CDN fallbacks, then emoji. */
export function CountryFlagImg({ code, className = "h-4 w-6", width = 40 }: Props) {
  const sources = useMemo(() => countryFlagDisplays(code, width), [code, width]);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [code]);

  const current: FlagDisplay | undefined = sources[sourceIndex];

  if (!code?.trim() || !current) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-sm bg-zinc-700 text-[10px] font-bold text-zinc-300 ${className}`}
      >
        {code?.toUpperCase() || "?"}
      </span>
    );
  }

  if (current.kind === "emoji") {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center text-lg leading-none ${className}`}>
        {current.text}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current.url}
      alt=""
      width={width}
      height={Math.round(width * (2 / 3))}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`block shrink-0 object-cover ${className}`}
      onError={() => setSourceIndex((i) => Math.min(i + 1, sources.length - 1))}
    />
  );
}
