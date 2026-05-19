"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import { useLearnerPricing } from "@/lib/hooks/useLearnerPricing";
import { CoursePrice } from "@/components/CoursePrice";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  MessageCircle,
  Play,
  Star,
  Users,
  Video,
} from "lucide-react";

const TITLE_HIGHLIGHT = "Cyber Security";

function HeroTitle({ title }: { title: string }) {
  if (title.includes(TITLE_HIGHLIGHT)) {
    const idx = title.indexOf(TITLE_HIGHLIGHT);
    const before = title.slice(0, idx);
    const after = title.slice(idx + TITLE_HIGHLIGHT.length);
    return (
      <>
        {before}
        <span className="text-[#FFB800]">{TITLE_HIGHLIGHT}</span>
        {after}
      </>
    );
  }
  const words = title.trim().split(/\s+/);
  if (words.length === 3) {
    return (
      <>
        {words[0]} <span className="text-[#FFB800]">{words[1]}</span> {words[2]}
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

function batchDuration(course: TutorLedHeroCourse): string {
  const row = course.batchDetails.find((d) => d.label === "Duration");
  if (!row) return "12 Weeks";
  const v = row.value;
  if (/week/i.test(v)) return v;
  return "12 Weeks";
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
  primaryCta?: { kind: "link"; href: string; label: string } | { kind: "register"; slug: string; label: string };
  reviewCountLabel?: string;
};

export default function TutorLedCourseHero({
  breadcrumbs,
  course,
  heroSrc = "/h1.png",
  heroAlt = "Live tutor-led session preview",
  primaryCta,
  reviewCountLabel = "800+ Reviews",
}: Props) {
  const router = useRouter();
  const { showPrices, ready } = useLearnerPricing();
  const timeIst = scheduleTimeIst(course.schedule);
  const duration = batchDuration(course);

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
        <div className="relative mx-auto w-full max-w-[1760px] px-4 pb-6 pt-4 sm:px-6 md:px-8 xl:px-10">
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

          <div className="flex flex-col gap-6 md:gap-8 lg:flex-row lg:items-stretch">
            {/* Left — title, trainer, pills */}
            <div className="flex h-full w-full min-w-0 flex-1 flex-col lg:w-1/3">
              <div className="flex h-full min-h-0 flex-1 flex-col">
                <div className="flex-1">
                  <h1 className="mb-4 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.35rem] lg:leading-[1.12]">
                    <HeroTitle title={course.title} />
                  </h1>
                  <p className="mb-6 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
                    {course.subtitle}
                  </p>

                  <div className="mb-6 flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#FFB800]/40 bg-zinc-900 sm:h-14 sm:w-14">
                    {course.trainer.avatar?.trim() ? (
                      <Image
                        src={course.trainer.avatar}
                        alt={course.trainer.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg font-bold text-[#FFB800]">
                        {course.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white sm:text-base">{course.trainer.name}</p>
                    <p className="text-xs text-zinc-400">{course.trainer.role}</p>
                    <p className="text-[11px] text-zinc-500">{course.trainer.experience}</p>
                  </div>
                </div>
                <div className="inline-flex shrink-0 items-center gap-1.5">
                      <Star className="h-4 w-4 fill-[#FFB800] text-[#FFB800]" aria-hidden />
                      <span className="text-sm font-bold text-white">4.8</span>
                      <span className="text-xs text-zinc-500">({reviewCountLabel})</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:mt-auto lg:grid-cols-5">
                  {heroPills.map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-1.5 py-2.5 text-center"
                    >
                      <item.icon className="h-4 w-4 text-[#FFB800]" aria-hidden />
                      <span className="text-[9px] font-semibold leading-tight text-zinc-300 sm:text-[10px]">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center — Zoom preview */}
            <div className="flex w-full min-w-0 flex-1 flex-col lg:w-1/3">
              <div className="relative h-full min-h-[280px] flex-1 overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-br from-[#0c1e3a] via-zinc-950 to-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] lg:min-h-0">
                <div
                  className="pointer-events-none absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 40%, rgba(45,140,255,0.35) 0%, transparent 55%), radial-gradient(circle at 70% 60%, rgba(45,140,255,0.2) 0%, transparent 50%)",
                  }}
                />
                <div className="absolute left-3 top-3 z-10 sm:left-4 sm:top-4">
                  <span className="inline-flex items-center rounded-md bg-[#2D8CFF] px-2.5 py-1 text-[11px] font-bold tracking-tight text-white">
                    zoom
                  </span>
                </div>
                <div className="absolute inset-0">
                  <Image
                    src={heroSrc}
                    alt={heroAlt}
                    fill
                    className="object-cover object-center p-2 sm:p-3"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    priority
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/25 px-4">
                    <button
                      type="button"
                      className="grid h-14 w-14 place-items-center rounded-full border border-white/30 bg-white/20 text-white shadow-lg backdrop-blur-sm transition hover:bg-white/30 sm:h-16 sm:w-16"
                      aria-label="Play preview"
                    >
                      <Play size={26} fill="currentColor" className="ml-0.5" />
                    </button>
                    <p className="max-w-[260px] text-center text-xs font-semibold text-white drop-shadow-md sm:text-sm">
                      Live Interactive Sessions with Expert Trainer
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — pricing card */}
            <aside className="flex w-full min-w-0 flex-1 flex-col lg:w-1/3">
              <div className="flex h-full min-h-[280px] flex-col overflow-hidden rounded-xl border border-[#FFB800]/30 bg-zinc-950 lg:min-h-0">
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3.5 sm:px-5">
                  <span className="text-sm font-bold text-white">{course.batchLabel}</span>
                  {course.seatsFilling ? (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                      Limited Seats
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col justify-between space-y-4 p-4 sm:p-5">
                  {ready && showPrices ? (
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <CoursePrice inr={course.price} className="text-[1.75rem] font-extrabold leading-none text-white sm:text-3xl" />
                        <CoursePrice
                          inr={course.originalPrice}
                          className="text-sm text-zinc-500 line-through sm:text-base"
                        />
                        {discountLabel ? (
                          <span className="rounded-md bg-[#FFB800] px-2 py-0.5 text-[10px] font-bold text-black sm:text-[11px]">
                            {discountLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <CoursePrice variant="hero" className="w-full" />
                  )}

                  <ul className="space-y-2.5 border-b border-zinc-800/80 pb-4">
                    {pricingRows.map((row) => (
                      <li key={row.label} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
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
                      className="flex w-full items-center justify-center rounded-lg bg-[#FFB800] py-3.5 text-sm font-extrabold text-black transition hover:bg-[#e5a600]"
                    >
                      {primaryCta.label}
                    </Link>
                  ) : primaryCta?.kind === "register" ? (
                    <button
                      type="button"
                      onClick={() => registerTutorLedFromTemplate(router, primaryCta.slug)}
                      className="flex w-full items-center justify-center rounded-lg bg-[#FFB800] py-3.5 text-sm font-extrabold text-black transition hover:bg-[#e5a600]"
                    >
                      {primaryCta.label}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-lg bg-[#FFB800] py-3.5 text-sm font-extrabold text-black"
                    >
                      Reserve Your Seat
                    </button>
                  )}

                  <Link
                    href="/contact"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-transparent py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Ask a Question
                  </Link>

                  <p className="flex items-center justify-center gap-1.5 text-center text-xs">
                    <Users className="h-3.5 w-3.5 text-[#FFB800]" aria-hidden />
                    <span className="text-zinc-400">
                      Only <span className="font-bold text-[#FFB800]">{course.seatsLeft} Seats Left!</span>
                    </span>
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Bottom feature strip */}
      <section className="border-b border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto w-full max-w-[1760px] px-4 py-5 sm:px-6 md:px-8 xl:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between lg:flex-nowrap lg:gap-4">
            {course.features.map((f, i) => (
              <div key={i} className="flex min-w-[140px] flex-1 items-start gap-3 lg:min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FFB800]/20 bg-[#FFB800]/10">
                  <f.icon className="h-[18px] w-[18px] text-[#FFB800]" aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-xs font-bold leading-tight text-white sm:text-sm">{f.title}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-zinc-500 sm:text-[11px]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
