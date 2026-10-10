"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgePercent,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Gift,
  Megaphone,
  Radio,
  Star,
  UserPlus,
} from "lucide-react";
import type { CoursesPageHeroPromoType } from "@/lib/content-schema";
import { isFreePriceText, type ResolvedHeroSlide } from "@/lib/courses-page-featured";

const THEMES: Record<
  CoursesPageHeroPromoType,
  { Icon: typeof Star; badge: string; accent: string; button: string; glow: string }
> = {
  featured: {
    Icon: Star,
    badge: "border-amber-300/40 bg-amber-500/10 text-amber-200",
    accent: "text-amber-300",
    button: "bg-amber-400 text-black",
    glow: "from-amber-500/25",
  },
  free: {
    Icon: Gift,
    badge: "border-emerald-300/40 bg-emerald-500/15 text-emerald-200",
    accent: "text-emerald-300",
    button: "bg-emerald-400 text-black",
    glow: "from-emerald-500/25",
  },
  discount: {
    Icon: BadgePercent,
    badge: "border-rose-300/40 bg-rose-500/15 text-rose-200",
    accent: "text-rose-300",
    button: "bg-rose-500 text-white",
    glow: "from-rose-500/25",
  },
  live: {
    Icon: Radio,
    badge: "border-red-300/40 bg-red-500/15 text-red-200",
    accent: "text-red-300",
    button: "bg-red-500 text-white",
    glow: "from-red-500/25",
  },
  announcement: {
    Icon: Megaphone,
    badge: "border-sky-300/40 bg-sky-500/15 text-sky-200",
    accent: "text-sky-300",
    button: "bg-sky-400 text-black",
    glow: "from-sky-500/25",
  },
  "new-tutor": {
    Icon: UserPlus,
    badge: "border-violet-300/40 bg-violet-500/15 text-violet-200",
    accent: "text-violet-300",
    button: "bg-violet-500 text-white",
    glow: "from-violet-500/25",
  },
};

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

function useNow(enabled: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [enabled]);
  return now;
}

function formatEventDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function countdownParts(diffMs: number): { label: string; value: number }[] {
  const s = Math.max(0, Math.floor(diffMs / 1000));
  return [
    { label: "Days", value: Math.floor(s / 86400) },
    { label: "Hrs", value: Math.floor((s % 86400) / 3600) },
    { label: "Min", value: Math.floor((s % 3600) / 60) },
    { label: "Sec", value: s % 60 },
  ];
}

function SlideTitle({ title, highlight, accent }: { title: string; highlight: string; accent: string }) {
  const word = highlight.trim();
  const at = word ? title.indexOf(word) : -1;
  if (at < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, at)}
      <span className={accent}>{word}</span>
      {title.slice(at + word.length)}
    </>
  );
}

function EventStrip({ slide, now }: { slide: ResolvedHeroSlide; now: number | null }) {
  const at = slide.eventAt ? Date.parse(slide.eventAt) : NaN;
  if (!Number.isFinite(at)) return null;
  const theme = THEMES[slide.promoType];
  const dateLabel = formatEventDate(at);

  if (now == null) {
    return (
      <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-gray-200">
        <CalendarClock size={14} className={theme.accent} /> {dateLabel}
      </p>
    );
  }

  const diff = at - now;
  if (diff <= 0) {
    const liveNow = slide.promoType === "live" && -diff < LIVE_WINDOW_MS;
    return (
      <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-semibold">
        {liveNow ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-red-200">LIVE NOW</span>
          </>
        ) : (
          <>
            <CalendarClock size={14} className={theme.accent} /> Started {dateLabel}
          </>
        )}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-300">
        <CalendarClock size={13} className={theme.accent} />
        {slide.promoType === "live" ? "Goes live" : "Starts"} {dateLabel}
      </p>
      <div className="flex gap-2">
        {countdownParts(diff).map((p) => (
          <div
            key={p.label}
            className="min-w-[52px] rounded-lg border border-white/15 bg-black/45 px-2 py-1.5 text-center backdrop-blur-sm"
          >
            <p className={`text-lg font-bold tabular-nums leading-none ${theme.accent}`}>
              {String(p.value).padStart(2, "0")}
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-gray-400">{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceRow({ slide }: { slide: ResolvedHeroSlide }) {
  const price = slide.priceText?.trim() ?? "";
  const rawOld = slide.oldPriceText?.trim() ?? "";
  const old = rawOld && !isFreePriceText(rawOld) ? rawOld : "";
  if (slide.promoType === "free") {
    return (
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-3xl font-extrabold text-emerald-300">FREE</span>
        {old ? <span className="text-sm text-gray-400 line-through">{old}</span> : null}
      </div>
    );
  }
  if (!price) return null;
  if (slide.promoType !== "discount" && slide.promoType !== "featured") return null;
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-3">
      <span className="text-3xl font-extrabold text-white">{price}</span>
      {old && old !== price ? <span className="text-sm text-gray-400 line-through">{old}</span> : null}
      {slide.discountLabel ? (
        <span className="rounded-md bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{slide.discountLabel}</span>
      ) : null}
    </div>
  );
}

function TutorCard({ slide }: { slide: ResolvedHeroSlide }) {
  const name = slide.tutorName?.trim();
  if (!name) return null;
  if (slide.promoType !== "new-tutor" && slide.promoType !== "live") return null;
  const theme = THEMES[slide.promoType];
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="mt-5 flex max-w-xs items-center gap-3 rounded-2xl border border-white/15 bg-black/45 p-3 backdrop-blur-md md:absolute md:bottom-6 md:right-6 md:mt-0">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white/30 bg-white/10">
        {slide.tutorPhoto ? (
          <Image src={slide.tutorPhoto} alt={name} fill unoptimized className="object-cover" />
        ) : (
          <span className={`flex h-full w-full items-center justify-center text-lg font-bold ${theme.accent}`}>
            {initials}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${theme.accent}`}>
          {slide.promoType === "new-tutor" ? "Just joined" : "Your tutor"}
        </p>
        <p className="truncate text-sm font-bold">{name}</p>
        {slide.tutorRole ? <p className="truncate text-xs text-gray-300">{slide.tutorRole}</p> : null}
      </div>
    </div>
  );
}

export default function CoursesHeroBanner({
  slides,
  autoRotateSeconds = 6,
}: {
  slides: ResolvedHeroSlide[];
  autoRotateSeconds?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const needsClock = slides.some((s) => Boolean(s.eventAt));
  const now = useNow(needsClock);

  useEffect(() => {
    if (count < 2 || paused) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), Math.max(3, autoRotateSeconds) * 1000);
    return () => window.clearTimeout(t);
  }, [index, count, paused, autoRotateSeconds]);

  if (count === 0) return null;
  const go = (i: number) => setIndex(((i % count) + count) % count);

  return (
    <article
      className="courses-hero-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="grid">
        {slides.map((slide, i) => {
          const theme = THEMES[slide.promoType] ?? THEMES.featured;
          const active = i === index;
          return (
            <div
              key={slide.id}
              aria-hidden={!active}
              className={`relative col-start-1 row-start-1 min-h-[360px] p-6 transition-opacity duration-700 md:p-8 ${
                active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
              }`}
            >
              {slide.backgroundImage ? (
                <Image
                  src={slide.backgroundImage}
                  alt={slide.title || "Course banner"}
                  fill
                  unoptimized
                  priority={i === 0}
                  className="object-cover opacity-80"
                />
              ) : null}
              <div className="courses-hero-overlay absolute inset-0 bg-linear-to-r from-[#091224]/95 via-[#091224]/55 via-45% to-transparent" />
              <div className={`absolute -left-16 -top-16 h-56 w-56 rounded-full bg-radial ${theme.glow} to-transparent blur-2xl`} />

              {slide.promoType === "discount" && slide.discountLabel ? (
                <div className="absolute right-5 top-5 z-10 flex h-20 w-20 rotate-12 flex-col items-center justify-center rounded-full bg-rose-500 text-center font-extrabold leading-none text-white shadow-lg shadow-rose-500/40">
                  <span className="text-lg">{slide.discountLabel.replace(/\s*OFF$/i, "")}</span>
                  <span className="text-[10px] tracking-widest">OFF</span>
                </div>
              ) : null}
              {slide.promoType === "free" ? (
                <div className="absolute right-5 top-5 z-10 rotate-6 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-extrabold tracking-wider text-black shadow-lg shadow-emerald-500/40">
                  FREE
                </div>
              ) : null}

              <div className="relative z-10 max-w-md">
                <p
                  className={`courses-hero-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${theme.badge}`}
                >
                  {slide.promoType === "live" ? (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                  ) : (
                    <theme.Icon size={13} />
                  )}
                  {slide.badgeText}
                </p>
                <h1 className="mt-4 text-4xl font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] md:text-5xl">
                  <SlideTitle title={slide.title} highlight={slide.highlightWord} accent={theme.accent} />
                </h1>
                {slide.subtitle ? (
                  <p className="mt-4 line-clamp-3 text-sm text-gray-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">{slide.subtitle}</p>
                ) : null}
                <PriceRow slide={slide} />
                <EventStrip slide={slide} now={now} />
                <div className="mt-6 flex flex-wrap gap-3">
                  {slide.ctaPrimary ? (
                    <Link
                      href={slide.href}
                      tabIndex={active ? undefined : -1}
                      className={`rounded-full px-5 py-2.5 text-sm font-bold transition hover:brightness-110 ${theme.button}`}
                    >
                      {slide.ctaPrimary}
                    </Link>
                  ) : null}
                  {slide.ctaSecondary ? (
                    <Link
                      href={slide.href}
                      tabIndex={active ? undefined : -1}
                      className="courses-secondary-btn rounded-full border border-white/25 bg-black/40 px-5 py-2.5 text-sm font-semibold"
                    >
                      {slide.ctaSecondary}
                    </Link>
                  ) : null}
                </div>
              </div>
              <TutorCard slide={slide} />
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/40 p-1.5 text-white/80 transition hover:bg-black/70 md:block"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/40 p-1.5 text-white/80 transition hover:bg-black/70 md:block"
          >
            <ChevronRight size={16} />
          </button>
        </>
      ) : null}
    </article>
  );
}
