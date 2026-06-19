"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { TUTOR_LED_HIGHLIGHTS_BADGE_SRC } from "@/lib/tutor-led-marketing-assets";

type BadgeProps = {
  className?: string;
};

/** Golden shield — full image visible beside highlights (no crop). */
export function TutorLedHighlightsBadge({ className = "" }: BadgeProps) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center ${className}`}
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-[-12%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,184,0,0.2),transparent_65%)]" />
      <div className="relative h-[160px] w-[140px] sm:h-[180px] sm:w-[158px] md:h-[200px] md:w-[176px]">
        <Image
          src={TUTOR_LED_HIGHLIGHTS_BADGE_SRC}
          alt=""
          fill
          className="object-contain object-center drop-shadow-[0_0_28px_rgba(255,184,0,0.4)]"
          sizes="(max-width: 640px) 140px, 176px"
        />
      </div>
    </div>
  );
}

type ContentProps = {
  highlights: string[];
  className?: string;
  itemClassName?: string;
  limit?: number;
};

/** Highlights list + shield floated on the right via flex (not CSS grid). */
export function TutorLedHighlightsContent({
  highlights,
  className = "",
  itemClassName = "text-xs text-zinc-300",
  limit = 6,
}: ContentProps) {
  return (
    <div className={`mt-3 flex items-center justify-between gap-3 overflow-visible sm:gap-5 ${className}`}>
      <ul className="min-w-0 flex-1 space-y-2">
        {highlights.slice(0, limit).map((h) => (
          <li key={h} className={`flex items-start gap-2 leading-snug ${itemClassName}`}>
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <TutorLedHighlightsBadge />
    </div>
  );
}
