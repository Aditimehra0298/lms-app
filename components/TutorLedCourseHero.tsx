"use client";

import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Calendar,
  ChevronRight,
  Clock,
  Globe,
  Heart,
  MessageCircle,
  MonitorPlay,
  Play,
  Video,
  Users,
} from "lucide-react";

const GOLD = "#FFB800";

export type TutorLedHeroBreadcrumb = { label: string; href: string };

export type TutorLedHeroCourse = {
  title: string;
  subtitle: string;
  badge: string;
  trainer: { name: string; role: string; experience: string };
  nextBatchDate: string;
  schedule: string;
  language: string;
  batchLabel: string;
  seatsFilling: boolean;
  price: number;
  originalPrice: number;
  discount: string;
  batchDetails: { icon: LucideIcon; label: string; value: string }[];
  seatsLeft: number;
  features: { icon: LucideIcon; title: string; desc: string }[];
};

const innerBarItems: { icon: LucideIcon; label: string }[] = [
  { icon: Video, label: "Live on Zoom" },
  { icon: MonitorPlay, label: "Interactive Sessions" },
  { icon: MessageCircle, label: "Live Q&A" },
  { icon: Users, label: "Doubt Solving" },
  { icon: Award, label: "Certificate of Completion" },
];

type Props = {
  breadcrumbs: TutorLedHeroBreadcrumb[];
  course: TutorLedHeroCourse;
  countdown: { days: number; hours: number; mins: number; secs: number };
  wishlisted: boolean;
  setWishlisted: (v: boolean) => void;
  heroSrc?: string;
  heroAlt?: string;
  /** Primary CTA (e.g. checkout enroll link or learner schedule). */
  primaryCta?: { href: string; label: string };
};

export default function TutorLedCourseHero({
  breadcrumbs,
  course,
  countdown: cd,
  wishlisted,
  setWishlisted,
  heroSrc = "/h1.png",
  heroAlt = "Live tutor-led session preview",
  primaryCta,
}: Props) {
  const seatCap = 40;
  const filledPct = Math.min(100, Math.max(12, ((seatCap - course.seatsLeft) / seatCap) * 100));

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-black">
        <div className="relative mx-auto w-full max-w-[1760px] px-4 pb-8 pt-4 sm:px-6 md:px-8 xl:px-10">
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500 md:mb-5">
            {breadcrumbs.map((crumb, i) => (
              <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={11} className="text-zinc-600" aria-hidden />}
                <Link href={crumb.href} className="transition hover:text-[#FFB800]">
                  {crumb.label}
                </Link>
              </span>
            ))}
            <ChevronRight size={11} className="text-zinc-600" aria-hidden />
            <span className="font-medium text-[#FFB800]">{course.title}</span>
          </nav>

          <div className="grid grid-cols-1 gap-6 lg:gap-6 xl:grid-cols-12 xl:items-start xl:gap-x-6 xl:gap-y-0 2xl:gap-x-8">
            {/* Left — copy, trainer, meta, inner bar (~5/12) */}
            <div className="min-w-0 xl:col-span-5 2xl:col-span-5">
              <div className="mb-4 flex flex-wrap items-center gap-3 md:mb-5">
                <span className="rounded border border-[#FFB800]/80 bg-transparent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">
                  {course.badge}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  Live
                </span>
              </div>

              <h1 className="mb-4 text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:mb-5 lg:text-[2.75rem] lg:leading-[1.08] 2xl:text-5xl">
                {course.title}
              </h1>
              <p className="mb-7 max-w-none text-sm leading-relaxed text-zinc-300 sm:text-[15px] lg:mb-8 lg:max-w-[52ch] xl:max-w-none 2xl:text-base 2xl:leading-relaxed">
                {course.subtitle}
              </p>

              <div className="mb-8 grid gap-6 lg:mb-10 lg:grid-cols-[auto,minmax(0,1fr)] lg:items-start lg:gap-x-10">
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[#FFB800]/50 bg-zinc-900 text-xl font-bold text-[#FFB800] sm:h-16 sm:w-16 sm:text-2xl">
                    {course.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-white sm:text-base">{course.trainer.name}</p>
                    <p className="text-xs text-zinc-400 sm:text-sm">{course.trainer.role}</p>
                    <p className="text-[11px] text-zinc-500">{course.trainer.experience}</p>
                  </div>
                </div>

                <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:gap-3">
                  {[
                    { icon: Calendar, label: "Next Batch Starts", value: course.nextBatchDate },
                    { icon: Clock, label: "Schedule", value: course.schedule },
                    { icon: Globe, label: "Language", value: course.language },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex min-h-[52px] items-center gap-3 rounded-lg border border-white/5 bg-zinc-950/80 px-3 py-2.5 sm:px-4"
                    >
                      <row.icon className="h-4 w-4 shrink-0 text-[#FFB800] sm:h-[18px] sm:w-[18px]" aria-hidden />
                      <div className="min-w-0 text-sm leading-snug">
                        <span className="block text-[11px] text-zinc-500">{row.label}</span>
                        <span className="font-semibold text-white">{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-3.5 sm:px-5 sm:py-4">
                <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-1 lg:gap-y-0">
                  {innerBarItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex min-w-0 items-center justify-center gap-2 text-center text-[11px] font-medium leading-tight text-zinc-200 lg:justify-start lg:text-left"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0 text-[#FFB800] lg:h-4 lg:w-4" aria-hidden />
                      <span className="min-w-0 lg:leading-snug">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center — Zoom visual + countdown (~4/12) */}
            <div className="flex min-w-0 flex-col items-stretch xl:col-span-4 2xl:col-span-4">
              <p className="mb-2 text-center text-xs font-semibold tracking-wide text-zinc-500 xl:text-left">zoom</p>
              <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
                <Image
                  src={heroSrc}
                  alt={heroAlt}
                  width={1200}
                  height={675}
                  className="mx-auto block h-auto w-full max-h-[min(52vh,520px)] object-contain object-center sm:max-h-[min(50vh,480px)] xl:max-h-[min(55vh,560px)]"
                  sizes="(max-width: 1024px) 100vw, (max-width: 1536px) 40vw, 720px"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
                  <button
                    type="button"
                    className="pointer-events-auto grid h-16 w-16 place-items-center rounded-full bg-white/25 text-white shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-white/35"
                    aria-label="Play preview"
                  >
                    <Play size={28} fill="currentColor" className="ml-0.5" />
                  </button>
                </div>
              </div>

              <div className="mt-5 w-full rounded-xl border border-white/10 bg-[#141414] px-3 py-4 sm:px-5 sm:py-5">
                <p className="mb-3 text-center text-xs font-medium text-zinc-500 xl:text-left">Batch starts in</p>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { v: cd.days, l: "Days" },
                    { v: cd.hours, l: "Hours" },
                    { v: cd.mins, l: "Mins" },
                    { v: cd.secs, l: "Secs" },
                  ].map(({ v, l }) => (
                    <div key={l} className="flex min-w-0 flex-col items-center">
                      <span className="w-full rounded-lg bg-black/50 py-2.5 text-center text-xl font-extrabold tabular-nums text-[#FFB800] sm:py-3 sm:text-2xl 2xl:text-3xl">
                        {String(v).padStart(2, "0")}
                      </span>
                      <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — CTA card (~3/12) */}
            <aside className="flex min-w-0 flex-col gap-4 self-stretch xl:col-span-3 2xl:col-span-3 xl:sticky xl:top-24">
              <div className="h-full overflow-hidden rounded-2xl border border-[#FFB800]/35 bg-gradient-to-b from-zinc-900 to-black shadow-[0_0_0_1px_rgba(255,184,0,0.08)]">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5">
                  <span className="text-sm font-bold text-white">{course.batchLabel}</span>
                  {course.seatsFilling ? (
                    <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      Seats Filling Fast
                    </span>
                  ) : null}
                </div>
                <div className="space-y-5 p-4 sm:p-5">
                  <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                    <span className="text-3xl font-extrabold tracking-tight text-white">₹{course.price.toLocaleString("en-IN")}</span>
                    <span className="text-base text-zinc-500 line-through">₹{course.originalPrice.toLocaleString("en-IN")}</span>
                    <span className="rounded border border-[#FFB800]/40 bg-[#FFB800]/12 px-2 py-0.5 text-[11px] font-bold text-[#FFB800]">
                      {course.discount}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {course.batchDetails.map((d, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <d.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{d.label}</p>
                          <p className="text-sm text-zinc-200">{d.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {primaryCta ? (
                    <Link
                      href={primaryCta.href}
                      className="flex w-full items-center justify-center rounded-xl bg-[#FFB800] py-3.5 text-sm font-extrabold text-black shadow-[0_8px_24px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500]"
                    >
                      {primaryCta.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-xl bg-[#FFB800] py-3.5 text-sm font-extrabold text-black shadow-[0_8px_24px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500]"
                    >
                      Reserve Your Seat
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setWishlisted(!wishlisted)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm text-zinc-300 transition hover:border-[#FFB800]/40 hover:text-[#FFB800]"
                  >
                    <Heart size={16} fill={wishlisted ? GOLD : "none"} className={wishlisted ? "text-[#FFB800]" : ""} />
                    {wishlisted ? "Added to Wishlist" : "Add to Wishlist"}
                  </button>

                  <div>
                    <p className="mb-2 text-center text-xs text-zinc-500">
                      Only <span className="font-bold text-[#FFB800]">{course.seatsLeft} Seats Left</span>
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FFB800] to-amber-600 transition-[width]"
                        style={{ width: `${filledPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-black px-4 py-5 sm:px-6 md:px-8 xl:px-10 xl:py-6">
        <div className="mx-auto w-full max-w-[1760px] rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6 lg:gap-x-4 xl:gap-x-6">
            {course.features.map((f, i) => (
              <div key={i} className="flex min-w-0 flex-col items-center gap-2.5 px-1 text-center sm:px-2">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#FFB800]/10 sm:h-12 sm:w-12">
                  <f.icon className="h-[18px] w-[18px] text-[#FFB800] sm:h-5 sm:w-5" aria-hidden />
                </div>
                <p className="text-xs font-bold leading-tight text-white sm:text-sm">{f.title}</p>
                <p className="max-w-[140px] text-[10px] leading-snug text-zinc-500 sm:max-w-[11rem] sm:text-[11px]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
