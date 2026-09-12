"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import CourseEnrollActions from "@/components/CourseEnrollActions";
import { tutorLedLandingHref } from "@/lib/course-landing";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  MessageCircle,
  Radio,
} from "lucide-react";

const HERO_FEATURE_STRIP_SKIP = new Set([
  "Live Expert Training",
  "Public Discussion",
  "Peer Interaction",
  "Peer Learning",
]);

function scheduleTimeIst(schedule: string): string {
  const paren = schedule.match(/\(([^)]+)\)/);
  if (paren) {
    const inner = paren[1].trim();
    if (/IST/i.test(inner)) return inner.replace(/\s*IST\s*/i, " (IST)");
    return `${inner} (IST)`;
  }
  return schedule;
}

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
  /** When set, show this country price (from Admin → Pricing) instead of a fixed INR number. */
  priceLabel?: string;
  oldPriceLabel?: string;
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
  primaryCta?:
    | { kind: "link"; href: string; label: string }
    | { kind: "register"; slug: string; label: string };
  reviewCountLabel?: string;
};

export default function TutorLedCourseHero({
  breadcrumbs,
  course,
  countdown,
  heroSrc = "/h1.png",
  heroAlt = "Live tutor-led session preview",
  thumbnailSrc,
  primaryCta,
}: Props) {
  const router = useRouter();
  const timeIst = scheduleTimeIst(course.schedule);
  const duration =
    course.batchDetails.find((d) => d.label === "Duration")?.value?.trim() || "4 Days";
  const enrollThumb = thumbnailSrc?.trim() || heroSrc;
  const previewSrc = heroSrc?.trim() || "/h1.png";

  const discountLabel = (() => {
    const d = course.discount?.trim();
    if (!d) return null;
    if (d.startsWith("-")) return d;
    const pct = d.match(/(\d+)\s*%/);
    if (pct) return `-${pct[1]}% OFF`;
    return d;
  })();

  const onReserve = () => {
    if (primaryCta?.kind === "register") {
      registerTutorLedFromTemplate(router, primaryCta.slug);
    }
  };

  return (
    <section className="relative min-h-[min(92vh,880px)] overflow-hidden border-b border-white/10 bg-black">
      {/* Full-bleed hero image */}
      <div className="absolute inset-0">
        <Image
          src={previewSrc}
          alt={heroAlt}
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.78) 42%, rgba(0,0,0,0.45) 68%, rgba(0,0,0,0.55) 100%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 55% at 20% 40%, rgba(255,184,0,0.14) 0%, transparent 55%)",
          }}
          aria-hidden
        />
      </div>

      <div className="relative mx-auto flex min-h-[min(92vh,880px)] w-full max-w-[1760px] flex-col px-4 pb-10 pt-4 sm:px-6 md:px-8 md:pb-12 md:pt-5 xl:px-10">
        <nav className="mb-8 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={11} className="text-zinc-600" aria-hidden />}
              <Link href={crumb.href} className="transition hover:text-[#FFB800]">
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>

        <div className="grid flex-1 items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,380px)] lg:items-center lg:gap-12">
          {/* Copy — one composition */}
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-[family-name:var(--font-display,inherit)] text-xs font-semibold uppercase tracking-[0.28em] text-[#FFB800]">
                SF Trainings
              </p>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-300">
                <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />
                Live on Zoom
              </span>
            </div>

            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
              {course.badge || "Tutor-led training"}
            </p>

            <h1 className="mt-3 text-[2.1rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[2.75rem] lg:text-[3.15rem]">
              {course.title}
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-300 md:text-[1.05rem] md:leading-7">
              {course.subtitle}
            </p>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-300">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#FFB800]" aria-hidden />
                {course.nextBatchDate}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#FFB800]" aria-hidden />
                {timeIst}
              </span>
              <span className="inline-flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#FFB800]" aria-hidden />
                {course.language} · {duration}
              </span>
            </div>

            {countdown ? (
              <div className="mt-6 flex flex-wrap items-end gap-3">
                <p className="w-full text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFB800]/90">
                  Batch starts in
                </p>
                {[
                  { label: "Days", value: countdown.days },
                  { label: "Hours", value: countdown.hours },
                  { label: "Mins", value: countdown.mins },
                  { label: "Sec", value: countdown.secs },
                ].map((slot) => (
                  <div key={slot.label} className="min-w-[3.5rem]">
                    <p className="text-2xl font-extrabold tabular-nums text-white sm:text-3xl">
                      {String(slot.value).padStart(2, "0")}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">{slot.label}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {primaryCta?.kind === "link" ? (
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center justify-center rounded-md bg-[#FFB800] px-7 py-3.5 text-sm font-extrabold text-black transition hover:bg-[#e5a600]"
                >
                  {primaryCta.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onReserve}
                  className="inline-flex items-center justify-center rounded-md bg-[#FFB800] px-7 py-3.5 text-sm font-extrabold text-black transition hover:bg-[#e5a600]"
                >
                  {primaryCta?.label ?? "Reserve Your Seat"}
                </button>
              )}
              <Link
                href="#course-details"
                className="inline-flex items-center gap-1 rounded-md border border-white/25 px-5 py-3.5 text-sm font-semibold text-white transition hover:border-[#FFB800]/50 hover:text-[#FFB800]"
              >
                View schedule
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#FFB800]/40 bg-zinc-900">
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
                <p className="text-sm font-semibold text-white">{course.trainer.name}</p>
                <p className="text-xs text-zinc-400">
                  {course.trainer.role}
                  {course.trainer.experience ? ` · ${course.trainer.experience}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Enroll panel — interaction container */}
          <aside
            id="course-enroll"
            className="scroll-mt-24 w-full border border-white/15 bg-black/75 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-6"
          >
            <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden bg-zinc-900">
              <Image
                src={enrollThumb}
                alt={course.title}
                fill
                className="object-cover object-center"
                sizes="380px"
                priority
              />
              {discountLabel ? (
                <span className="absolute right-3 top-3 bg-[#FFB800] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black">
                  {discountLabel}
                </span>
              ) : null}
            </div>

            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-white">Upcoming live batch</p>
              <span className="text-[11px] font-semibold text-[#FFB800]">
                {course.seatsLeft} seats left
              </span>
            </div>

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
                .map((f) => f.title)
                .slice(0, 4)}
              priceInr={course.priceLabel ? undefined : course.price}
              oldPriceInr={course.priceLabel ? undefined : course.originalPrice}
              priceLabel={course.priceLabel}
              oldPriceLabel={course.oldPriceLabel}
              exactPriceLabels={Boolean(course.priceLabel)}
              discountBadge={discountLabel}
              fixedInrOnly={!course.priceLabel}
            />

            <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
              {[
                { label: "Batch starts", value: course.nextBatchDate },
                { label: "Time", value: timeIst },
                { label: "Duration", value: duration },
                { label: "Mode", value: "Live on Zoom" },
              ].map((row) => (
                <li key={row.label} className="flex items-start gap-2 text-xs text-zinc-300">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                  <span>
                    <span className="text-zinc-500">{row.label}: </span>
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>

            {primaryCta?.kind === "link" ? (
              <Link
                href={primaryCta.href}
                className="mt-5 flex w-full items-center justify-center bg-[#FFB800] py-3.5 text-sm font-extrabold text-black transition hover:bg-[#e5a600]"
              >
                {primaryCta.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onReserve}
                className="mt-5 flex w-full items-center justify-center bg-[#FFB800] py-3.5 text-sm font-extrabold text-black transition hover:bg-[#e5a600]"
              >
                {primaryCta?.label ?? "Reserve Your Seat"}
              </button>
            )}

            <Link
              href="/contact"
              className="mt-3 flex w-full items-center justify-center gap-2 border border-white/15 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              Ask a question
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
