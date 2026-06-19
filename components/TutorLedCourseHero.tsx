"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import CourseEnrollActions from "@/components/CourseEnrollActions";
import { tutorLedLandingHref } from "@/lib/course-landing";
import {
  TUTOR_LED_CERTIFICATE_SAMPLE_SRC,
  TUTOR_LED_CLASSROOM_IMAGE_SRC,
} from "@/lib/tutor-led-marketing-assets";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  GraduationCap,
  MessageCircle,
  Play,
  Star,
  Video,
} from "lucide-react";

const HIGHLIGHT_WORDS = ["Cyber", "Security", "Safety", "Professional", "Advanced", "Food", "HACCP"];

const HERO_FEATURE_STRIP_SKIP = new Set([
  "Live Expert Training",
  "Public Discussion",
  "Peer Interaction",
  "Peer Learning",
]);

function HeroTitle({ title }: { title: string }) {
  const words = title.trim().split(/\s+/);
  const highlightIdx = words.findIndex((w) =>
    HIGHLIGHT_WORDS.some((h) => w.toLowerCase().includes(h.toLowerCase())),
  );
  if (highlightIdx >= 0) {
    return (
      <>
        {words.map((word, i) => (
          <span key={`${word}-${i}`}>
            {i > 0 ? " " : ""}
            {i === highlightIdx ? <span className="text-[#FFB800]">{word}</span> : word}
          </span>
        ))}
      </>
    );
  }
  if (words.length >= 3) {
    const mid = Math.floor(words.length / 2);
    return (
      <>
        {words.map((word, i) => (
          <span key={`${word}-${i}`}>
            {i > 0 ? " " : ""}
            {i === mid ? <span className="text-[#FFB800]">{word}</span> : word}
          </span>
        ))}
      </>
    );
  }
  return title;
}

function scheduleTimeIst(schedule: string): string {
  const paren = schedule.match(/\(([^)]+)\)/);
  if (paren) {
    const inner = paren[1].trim();
    if (/IST/i.test(inner)) return inner.replace(/\s*IST\s*/i, " (IST)");
    return `${inner} (IST)`;
  }
  return schedule;
}


const heroPills: { icon: typeof Video; label: string }[] = [
  { icon: Video, label: "Live Training" },
  { icon: GraduationCap, label: "Expert Trainer" },
  { icon: Award, label: "Certificate Included" },
  { icon: MessageCircle, label: "Doubt Support" },
  { icon: BookOpen, label: "Beginner Friendly" },
];

export type TutorLedHeroBreadcrumb = { label: string; href: string };

export type TutorLedHeroCourse = {
  title: string;
  subtitle: string;
  badge: string;
  trainer: { name: string; role: string; experience: string; avatar?: string };
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

type Props = {
  breadcrumbs: TutorLedHeroBreadcrumb[];
  course: TutorLedHeroCourse;
  countdown?: { days: number; hours: number; mins: number; secs: number };
  heroSrc?: string;
  heroAlt?: string;
  thumbnailSrc?: string;
  primaryCta?: { kind: "link"; href: string; label: string } | { kind: "register"; slug: string; label: string };
  reviewCountLabel?: string;
};

function featureThumbnail(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("recording")) return TUTOR_LED_CLASSROOM_IMAGE_SRC;
  if (t.includes("certificate")) return TUTOR_LED_CERTIFICATE_SAMPLE_SRC;
  return null;
}

export default function TutorLedCourseHero({
  breadcrumbs,
  course,
  countdown,
  heroSrc = "/h1.png",
  heroAlt = "Live tutor-led session preview",
  thumbnailSrc,
  primaryCta,
  reviewCountLabel = "800+ Reviews",
}: Props) {
  const router = useRouter();
  const timeIst = scheduleTimeIst(course.schedule);
  const duration =
    course.batchDetails.find((d) => d.label === "Duration")?.value?.trim() || "4 Days";
  const enrollThumb = thumbnailSrc?.trim() || heroSrc;
  const previewSrc = heroSrc?.trim() || TUTOR_LED_CLASSROOM_IMAGE_SRC;

  const pricingRows = [
    { label: "Batch Starts", value: course.nextBatchDate },
    { label: "Time", value: timeIst },
    { label: "Duration", value: duration },
    { label: "Mode", value: "Live on Zoom" },
    { label: "Certificate Included", value: null },
  ];

  const discountLabel = (() => {
    const d = course.discount?.trim();
    if (!d) return null;
    if (d.startsWith("-")) return d;
    const pct = d.match(/(\d+)\s*%/);
    if (pct) return `-${pct[1]}% OFF`;
    return d;
  })();

  return (
    <>
      <section className="relative overflow-hidden border-b border-white/10 bg-black">
        {/* Ambient background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 15% 20%, rgba(255,184,0,0.08) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 85% 30%, rgba(45,140,255,0.06) 0%, transparent 50%), radial-gradient(ellipse 70% 40% at 50% 100%, rgba(255,184,0,0.05) 0%, transparent 45%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative mx-auto w-full max-w-[1760px] px-4 pb-8 pt-4 sm:px-6 md:px-8 md:pb-10 md:pt-5 xl:px-10">
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
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

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12 lg:gap-3 xl:gap-4">
            {/* ── Left: copy + trainer ── */}
            <div className="flex h-full flex-col lg:col-span-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#FFB800]/50 bg-[#FFB800]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFB800]">
                  {course.badge || "Tutor Led Training"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
                  </span>
                  Live
                </span>
              </div>

              <h1 className="text-[1.85rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[2.25rem] lg:text-[2.45rem] xl:text-[2.6rem]">
                <HeroTitle title={course.title} />
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 md:text-[15px] md:leading-7">
                {course.subtitle}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { icon: Calendar, label: "Next Batch", value: course.nextBatchDate, accent: "text-[#FFB800]" },
                  { icon: Clock, label: "Time", value: timeIst, accent: "text-white" },
                  { icon: Globe, label: "Language", value: course.language, accent: "text-white" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-[#FFB800]/30 bg-[#FFB800]/[0.06] px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,184,0,0.1)] sm:px-3 sm:py-3"
                  >
                    <stat.icon className="mb-1 h-4 w-4 text-[#FFB800]" aria-hidden />
                    <p className="text-[9px] font-bold uppercase tracking-wide text-[#FFB800]/75">{stat.label}</p>
                    <p className={`mt-0.5 text-[11px] font-bold leading-snug sm:text-xs ${stat.accent}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#FFB800]/30 bg-gradient-to-br from-[#FFB800]/10 via-zinc-950/90 to-black/60 p-3 shadow-[0_0_24px_rgba(255,184,0,0.08)] sm:p-3.5">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-[#FFB800]/45 bg-zinc-900 ring-2 ring-[#FFB800]/10">
                  {course.trainer.avatar?.trim() ? (
                    <Image
                      src={course.trainer.avatar}
                      alt={course.trainer.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xl font-bold text-[#FFB800]">
                      {course.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white sm:text-base">{course.trainer.name}</p>
                  <p className="text-xs text-[#FFB800]/90">{course.trainer.role}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{course.trainer.experience}</p>
                </div>
                <div className="hidden shrink-0 flex-col items-end gap-0.5 sm:flex">
                  <div className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" aria-hidden />
                    <span className="text-sm font-bold text-white">4.8</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{reviewCountLabel}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {heroPills.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-1.5 rounded-full border border-[#FFB800]/35 bg-[#FFB800]/10 px-2.5 py-1.5"
                  >
                    <item.icon className="h-3 w-3 text-[#FFB800]" aria-hidden />
                    <span className="whitespace-nowrap text-[10px] font-bold text-[#FFB800]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-1 flex-col rounded-2xl border border-[#FFB800]/35 bg-gradient-to-b from-[#FFB800]/10 via-zinc-950/90 to-black/60 p-3.5 shadow-[0_0_32px_rgba(255,184,0,0.1),inset_0_1px_0_rgba(255,184,0,0.12)] sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">
                    Included in this batch
                  </p>
                  <span className="rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-300">
                    {course.seatsLeft} seats left
                  </span>
                </div>

                <ul className="mt-3 grid flex-1 gap-2 sm:grid-cols-2">
                  {course.batchDetails.map((row) => (
                    <li
                      key={row.label}
                      className="flex items-start gap-2 rounded-xl border border-[#FFB800]/20 border-l-[3px] border-l-[#FFB800] bg-black/40 px-2.5 py-2"
                    >
                      <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#FFB800]/75">{row.label}</p>
                        <p className="mt-0.5 text-[11px] font-semibold leading-snug text-white">{row.value}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <Link
                  href="#course-details"
                  className="mt-3 inline-flex items-center justify-center gap-1 rounded-lg bg-[#FFB800] px-3 py-2.5 text-[11px] font-extrabold text-black shadow-[0_6px_20px_rgba(255,184,0,0.35)] transition hover:bg-[#e5a600]"
                >
                  View full curriculum
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </div>

            {/* ── Center: live preview + countdown ── */}
            <div className="flex h-full flex-col gap-3 lg:col-span-4">
              <div className="relative flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_24px_64px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] sm:min-h-[260px]">
                <div
                  className="pointer-events-none absolute inset-0 z-[1] opacity-50"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 25% 35%, rgba(45,140,255,0.25) 0%, transparent 50%), radial-gradient(circle at 75% 65%, rgba(255,184,0,0.12) 0%, transparent 45%)",
                  }}
                  aria-hidden
                />
                <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-lg bg-[#2D8CFF] px-2.5 py-1 text-[11px] font-bold tracking-tight text-white shadow-lg">
                    zoom
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-300 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    Live
                  </span>
                </div>
                <div className="absolute inset-0">
                  <Image
                    src={previewSrc}
                    alt={heroAlt}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
                </div>
                <div className="relative z-10 mt-auto p-3 sm:p-4">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      className="group grid h-12 w-12 place-items-center rounded-full border border-[#FFB800]/50 bg-[#FFB800]/20 text-white shadow-[0_0_32px_rgba(255,184,0,0.25)] backdrop-blur-sm transition hover:scale-105 hover:bg-[#FFB800]/30 sm:h-14 sm:w-14"
                      aria-label="Play preview"
                    >
                      <Play size={22} fill="currentColor" className="ml-0.5 text-[#FFB800]" />
                    </button>
                    <p className="max-w-[260px] text-center text-[11px] font-semibold leading-snug text-white sm:text-xs">
                      Live interactive sessions with your expert trainer
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {["HD video", "Live Q&A", "Recordings"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-zinc-300 backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {countdown ? (
                <div className="shrink-0 rounded-2xl border border-[#FFB800]/25 bg-gradient-to-r from-[#FFB800]/10 to-transparent p-3 sm:p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFB800]">
                    Batch starts in
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-1.5 sm:gap-2">
                    {[
                      { label: "Days", value: countdown.days },
                      { label: "Hours", value: countdown.hours },
                      { label: "Mins", value: countdown.mins },
                      { label: "Sec", value: countdown.secs },
                    ].map((slot) => (
                      <div
                        key={slot.label}
                        className="rounded-lg border border-white/10 bg-black/40 px-1.5 py-2 text-center sm:rounded-xl sm:px-2 sm:py-2.5"
                      >
                        <p className="text-base font-extrabold tabular-nums text-white sm:text-lg">
                          {String(slot.value).padStart(2, "0")}
                        </p>
                        <p className="mt-0.5 text-[8px] uppercase tracking-wide text-zinc-500 sm:text-[9px]">
                          {slot.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── Right: enrollment card ── */}
            <aside id="course-enroll" className="scroll-mt-24 lg:col-span-3">
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#FFB800]/35 bg-gradient-to-b from-zinc-950 to-black shadow-[0_0_40px_rgba(255,184,0,0.08),inset_0_1px_0_rgba(255,184,0,0.1)]">
                <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-zinc-900">
                  <Image
                    src={enrollThumb}
                    alt={course.title}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 1024px) 100vw, 22vw"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                  {discountLabel ? (
                    <span className="absolute right-3 top-3 rounded-lg bg-[#FFB800] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black shadow-lg">
                      {discountLabel}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 px-4 py-2.5 sm:px-5">
                  <span className="text-sm font-bold text-white">Upcoming Live Batch</span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {course.seatsFilling ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        {course.batchLabel}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-[#FFB800]/35 bg-[#FFB800]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FFB800]">
                      {course.seatsLeft} seats left
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4 sm:p-5">
                  <CourseEnrollActions
                    courseTitle={course.title}
                    description={course.subtitle}
                    descriptionHref={
                      primaryCta?.kind === "register"
                        ? `${tutorLedLandingHref(primaryCta.slug)}#course-details`
                        : "#course-details"
                    }
                    highlights={course.features
                      .filter((f) => !HERO_FEATURE_STRIP_SKIP.has(f.title))
                      .map((f) => f.title)}
                    priceInr={course.price}
                    oldPriceInr={course.originalPrice}
                    discountBadge={discountLabel}
                    fixedInrOnly
                  />

                  <ul className="grid gap-2 border-y border-zinc-800/80 py-3 sm:grid-cols-2">
                    {pricingRows.map((row) => (
                      <li key={row.label} className="flex items-start gap-2 text-[11px] sm:text-xs">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                        {row.value ? (
                          <span className="text-zinc-300">
                            <span className="text-zinc-500">{row.label}: </span>
                            {row.value}
                          </span>
                        ) : (
                          <span className="font-medium text-zinc-200">{row.label}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {primaryCta?.kind === "link" ? (
                    <Link
                      href={primaryCta.href}
                      className="flex w-full items-center justify-center rounded-xl bg-[#FFB800] py-3.5 text-sm font-extrabold text-black shadow-[0_8px_24px_rgba(255,184,0,0.3)] transition hover:bg-[#e5a600]"
                    >
                      {primaryCta.label}
                    </Link>
                  ) : primaryCta?.kind === "register" ? (
                    <button
                      type="button"
                      onClick={() => registerTutorLedFromTemplate(router, primaryCta.slug)}
                      className="flex w-full items-center justify-center rounded-xl bg-[#FFB800] py-3.5 text-sm font-extrabold text-black shadow-[0_8px_24px_rgba(255,184,0,0.3)] transition hover:bg-[#e5a600]"
                    >
                      {primaryCta.label}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-xl bg-[#FFB800] py-3.5 text-sm font-extrabold text-black shadow-[0_8px_24px_rgba(255,184,0,0.3)]"
                    >
                      Reserve Your Seat
                    </button>
                  )}

                  <Link
                    href="/contact"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-600/80 bg-transparent py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white sm:text-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                    Ask a Question
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto w-full max-w-[1760px] px-4 py-5 sm:px-6 md:px-8 xl:px-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-0 xl:divide-x xl:divide-white/10">
            {course.features
              .filter((f) => !HERO_FEATURE_STRIP_SKIP.has(f.title))
              .map((f, i) => {
              const thumb = featureThumbnail(f.title);
              return (
                <div key={i} className="flex items-start gap-3 px-0 xl:px-4 xl:first:pl-0 xl:last:pr-0">
                  {thumb ? (
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#FFB800]/35 bg-zinc-900 shadow-[0_0_16px_rgba(255,184,0,0.1)]">
                      <Image
                        src={thumb}
                        alt=""
                        fill
                        className={
                          f.title.toLowerCase().includes("certificate")
                            ? "object-contain bg-white p-0.5"
                            : "object-cover object-center"
                        }
                        sizes="44px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#FFB800]/25 bg-[#FFB800]/10">
                      <f.icon className="h-[18px] w-[18px] text-[#FFB800]" aria-hidden />
                    </div>
                  )}
                  <div className="min-w-0 pt-0.5">
                    <p className="text-xs font-bold leading-tight text-white sm:text-sm">{f.title}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
