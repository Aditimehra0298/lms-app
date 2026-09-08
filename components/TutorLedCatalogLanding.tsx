"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import {
  defaultTutorLedCatalogPageConfig,
  type TutorLedCatalogPageConfig,
  type TutorLedCatalogTheme,
} from "@/lib/content-schema";
import {
  buildLiveCatalogBatchRows,
  mergeCatalogProgramCards,
  resolveCatalogEnrollSlug,
} from "@/lib/tutor-led-catalog-batches";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import { resolveLucideIcon } from "@/lib/lucide-icon-resolve";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Leaf,
  Monitor,
  Plus,
} from "lucide-react";

type Props = {
  programs?: TutorLedProgramStored[];
  config?: TutorLedCatalogPageConfig;
};

const THEME_STYLES: Record<
  TutorLedCatalogTheme,
  { accent: string; border: string; button: string; iconBg: string; wash: string }
> = {
  emerald: {
    accent: "text-emerald-300",
    border: "border-emerald-500/45",
    button: "bg-emerald-500 hover:bg-emerald-400 text-black",
    iconBg: "bg-emerald-500/20 text-emerald-300",
    wash: "from-emerald-950/90 via-emerald-900/40 to-[#0b1020]",
  },
  sky: {
    accent: "text-sky-300",
    border: "border-sky-500/45",
    button: "bg-sky-500 hover:bg-sky-400 text-black",
    iconBg: "bg-sky-500/20 text-sky-300",
    wash: "from-sky-950/90 via-sky-900/40 to-[#0b1020]",
  },
  violet: {
    accent: "text-violet-300",
    border: "border-violet-500/45",
    button: "bg-violet-500 hover:bg-violet-400 text-white",
    iconBg: "bg-violet-500/20 text-violet-300",
    wash: "from-violet-950/90 via-violet-900/40 to-[#0b1020]",
  },
  gold: {
    accent: "text-[#FFB800]",
    border: "border-[#FFB800]/50",
    button: "bg-[#FFB800] hover:bg-[#e5a600] text-black",
    iconBg: "bg-[#FFB800]/20 text-[#FFB800]",
    wash: "from-amber-950/90 via-amber-900/35 to-[#0b1020]",
  },
};

/** Native img so admin uploads (/uploads/covers, Cloudinary, etc.) always show. */
function AdminCatalogImg({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const url = src.trim();
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TutorLedCatalogLanding({
  programs = [],
  config = defaultTutorLedCatalogPageConfig,
}: Props) {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const page = config ?? defaultTutorLedCatalogPageConfig;

  const liveBatches = buildLiveCatalogBatchRows(programs);
  const useLiveBatches = liveBatches.length > 0;
  const programCards = mergeCatalogProgramCards(page.programs, programs);

  const heroSrc =
    page.hero.backgroundImage?.trim() ||
    page.pageThumbnail?.trim() ||
    "/tutor-led-iso-hero.png";

  const enrollBySlug = (slug: string) => {
    registerTutorLedFromTemplate(router, slug);
  };

  const enrollCard = (card: (typeof programCards)[number]) => {
    const slug = card.resolvedSlug || resolveCatalogEnrollSlug(card, programs);
    if (slug) {
      enrollBySlug(slug);
      return;
    }
    const q = new URLSearchParams({
      subject: `Enroll — ${page.hero.heading} ${card.title}`,
      program: card.title,
    });
    router.push(`/contact?${q.toString()}`);
  };

  const themeForProgramSlug = (slug: string) => {
    const card = page.programs.find(
      (p) =>
        p.enrollSlug === slug ||
        p.id === slug ||
        resolveCatalogEnrollSlug(p, programs) === slug,
    );
    return THEME_STYLES[card?.theme ?? "gold"] ?? THEME_STYLES.gold;
  };

  const iconForProgramSlug = (slug: string) => {
    const card = page.programs.find(
      (p) =>
        p.enrollSlug === slug ||
        p.id === slug ||
        resolveCatalogEnrollSlug(p, programs) === slug,
    );
    return resolveLucideIcon(card?.icon ?? "Trophy");
  };

  return (
    <div className="min-h-screen bg-[#05070f] text-white">
      {/* Full-bleed hero — admin hero / page thumbnail */}
      <section className="relative min-h-[min(72vh,640px)] overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <AdminCatalogImg
            src={heroSrc}
            alt={page.hero.backgroundAlt || page.hero.heading}
            priority
            className="h-full w-full object-cover object-[68%_center]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, rgba(5,8,18,0.94) 0%, rgba(5,8,18,0.78) 42%, rgba(5,8,18,0.35) 70%, rgba(5,8,18,0.55) 100%)",
            }}
            aria-hidden
          />
        </div>

        <div className="relative mx-auto grid max-w-[1760px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)] md:items-end md:gap-10 md:px-8 md:py-16 xl:px-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-300">
              {page.hero.eyebrow}
            </p>
            <h1 className="mt-3 text-[2rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[2.6rem] lg:text-[3rem]">
              {page.hero.heading}{" "}
              <span className="text-[#FFB800]">{page.hero.headingHighlight}</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-[0.98rem] md:leading-7">
              {page.hero.subtitle}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {page.hero.chips.map((item) => {
                const Icon = resolveLucideIcon(item.icon);
                return (
                  <div key={item.label} className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                    <span className="text-[11px] font-semibold leading-snug text-zinc-200">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <Link
              href={page.hero.ctaHref || "#programs"}
              className="mt-7 inline-flex items-center gap-2 rounded-md bg-[#FFB800] px-5 py-2.5 text-sm font-extrabold text-black transition hover:bg-[#e5a600]"
            >
              {page.hero.ctaText}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <aside className="relative justify-self-end sm:max-w-md">
            <p
              className="mb-3 max-w-[17rem] text-right font-serif text-xl italic leading-snug text-white/95 sm:text-[1.5rem]"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.65)" }}
            >
              {page.hero.asideQuote}
            </p>
            <div className="border border-[#FFB800]/40 bg-black/65 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-[#FFB800]">
                <Leaf className="h-5 w-5" aria-hidden />
                <p className="text-sm font-bold uppercase tracking-wide">{page.hero.certCardTitle}</p>
              </div>
              <p className="mt-2 text-base font-semibold leading-snug text-white">
                {page.hero.certCardSubtitle}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {page.hero.certCardQuote}
                <span className="mt-1 block font-medium text-zinc-300">
                  {page.hero.certCardAttribution}
                </span>
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Programs — admin card thumbnails are the visual lead */}
      <section id="programs" className="scroll-mt-24 border-b border-white/10 bg-[#070b16]">
        <div className="mx-auto max-w-[1760px] px-4 py-10 sm:px-6 md:px-8 md:py-12 xl:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              {page.programsSection.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">{page.programsSection.subtitle}</p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {programCards.map((card) => {
              const theme = THEME_STYLES[card.theme] ?? THEME_STYLES.gold;
              const Icon = resolveLucideIcon(card.icon);
              const thumb = card.thumbnail?.trim();
              const detailHref = card.resolvedSlug
                ? liveTutorCourseHref(card.resolvedSlug)
                : null;
              return (
                <article
                  key={card.id}
                  className={`relative flex flex-col overflow-hidden border bg-[#0b1020] ${theme.border} ${
                    card.popular ? "ring-1 ring-[#FFB800]/55" : ""
                  }`}
                >
                  {card.popular ? (
                    <span className="absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#FFB800] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-black shadow-lg">
                      ★ Most Popular
                    </span>
                  ) : null}

                  {/* Large thumbnail from Admin → program card thumbnail */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-900">
                    {thumb ? (
                      <AdminCatalogImg
                        src={thumb}
                        alt={card.title}
                        className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br ${theme.wash}`}
                      >
                        <div className={`grid h-14 w-14 place-items-center rounded-2xl ${theme.iconBg}`}>
                          <Icon className="h-7 w-7" aria-hidden />
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-wider ${theme.accent}`}>
                          {card.title}
                        </p>
                      </div>
                    )}
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b1020] to-transparent"
                      aria-hidden
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-4 pt-3">
                    <h3 className={`text-base font-bold ${theme.accent}`}>{card.title}</h3>
                    <p className="mt-0.5 text-sm font-medium text-zinc-200">{card.tagline}</p>

                    <ul className="mt-3 flex-1 space-y-1.5">
                      {card.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-xs text-zinc-300">
                          <CheckCircle2
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${theme.accent}`}
                            aria-hidden
                          />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-[11px]">
                      <p className="flex items-center gap-2 text-zinc-300">
                        <Clock className="h-3.5 w-3.5 text-[#FFB800]" aria-hidden />
                        {card.durationLabel}
                      </p>
                      <p className="flex items-center gap-2 text-zinc-300">
                        <Monitor className="h-3.5 w-3.5 text-[#FFB800]" aria-hidden />
                        {card.modeLabel}
                      </p>
                      <p className="flex items-center gap-2 text-zinc-300">
                        <GraduationCap className="h-3.5 w-3.5 text-[#FFB800]" aria-hidden />
                        {card.certificateLabel}
                      </p>
                    </div>

                    <p className="mt-3 text-xl font-extrabold text-white">{formatInr(card.price)}</p>
                    <p className="text-[11px] text-zinc-500">(Incl. of taxes)</p>

                    <button
                      type="button"
                      onClick={() => enrollCard(card)}
                      className={`mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md py-2.5 text-sm font-extrabold transition ${theme.button}`}
                    >
                      Enroll Now
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                    {detailHref ? (
                      <Link
                        href={detailHref}
                        className="mt-2 inline-flex w-full items-center justify-center text-[11px] font-semibold text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                      >
                        View program details
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why train */}
      <section className="border-b border-white/10 bg-[#060b16]">
        <div className="mx-auto max-w-[1760px] px-4 py-8 sm:px-6 md:px-8 md:py-10 xl:px-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(200px,0.8fr)_minmax(0,2.2fr)] lg:items-start lg:gap-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFB800]">
                {page.why.eyebrow}
              </p>
              <div className="mt-1.5 h-0.5 w-12 bg-[#FFB800]" aria-hidden />
              <h2 className="mt-2.5 text-xl font-bold leading-tight text-white md:text-[1.55rem]">
                {page.why.titleLine1}
                <br />
                {page.why.titleLine2}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
              {page.why.items.map((item) => {
                const Icon = resolveLucideIcon(item.icon);
                return (
                  <div key={item.title} className="text-left sm:text-center lg:text-left">
                    <div className="grid h-9 w-9 place-items-center rounded-lg border border-[#FFB800]/35 bg-[#FFB800]/10 sm:mx-auto lg:mx-0">
                      <Icon className="h-4 w-4 text-[#FFB800]" aria-hidden />
                    </div>
                    <h3 className="mt-2 text-sm font-bold leading-snug text-white">{item.title}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Who should attend + invest image from admin */}
      <section className="border-b border-white/10 bg-[#050910]">
        <div className="mx-auto grid max-w-[1760px] gap-4 px-4 py-8 sm:px-6 md:grid-cols-[1.55fr_1fr] md:px-8 md:py-10 xl:px-10">
          <div className="rounded-xl border border-white/10 bg-[#0b1220] p-4 md:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFB800]">
              {page.audience.eyebrow}
            </p>
            <div className="mt-1.5 h-0.5 w-12 bg-[#FFB800]" aria-hidden />
            <h2 className="mt-2.5 text-xl font-bold text-white md:text-[1.5rem]">{page.audience.title}</h2>
            <p className="mt-1.5 text-sm text-zinc-400">{page.audience.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {page.audience.items.map((item) => {
                const Icon = resolveLucideIcon(item.icon);
                return (
                  <div
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111827] px-3 py-1.5"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                    <span className="text-xs font-semibold text-zinc-200">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="flex min-h-[220px] overflow-hidden rounded-xl border border-[#FFB800]/30 bg-[#0b1220]">
            <div className="flex flex-1 flex-col justify-center p-4 md:p-5">
              <Leaf className="h-5 w-5 text-[#FFB800]" aria-hidden />
              <p className="mt-2 text-base font-bold leading-snug text-white whitespace-pre-line">
                {page.audience.investTitle}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{page.audience.investBody}</p>
            </div>
            <div className="relative hidden w-[42%] shrink-0 sm:block">
              <AdminCatalogImg
                src={page.audience.investImage || "/tutor-led-invest-knowledge.png"}
                alt={page.audience.investImageAlt || ""}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </aside>
        </div>
      </section>

      {/* Batches + trainer + FAQ */}
      <section className="border-b border-white/10 bg-[#060b16]">
        <div className="mx-auto grid max-w-[1760px] gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[1.45fr_0.85fr_0.85fr] md:px-8 md:py-10 xl:px-10">
          <div className="flex flex-col rounded-xl border border-white/10 bg-[#0b1220] p-3.5 sm:p-4 lg:min-w-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">
                {page.batches.eyebrow}
              </p>
              <div className="mt-1.5 h-0.5 w-10 bg-[#FFB800]" aria-hidden />
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-[11px]">
                <thead className="text-[9px] uppercase tracking-wide text-zinc-500">
                  <tr className="border-b border-white/10">
                    <th className="pb-1.5 pr-2 font-semibold">Date</th>
                    <th className="pb-1.5 pr-2 font-semibold">Time (IST)</th>
                    <th className="pb-1.5 pr-2 font-semibold">Program</th>
                    <th className="pb-1.5 pr-2 font-semibold">Seats Left</th>
                    <th className="pb-1.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {useLiveBatches
                    ? liveBatches.map((row) => {
                        const theme = themeForProgramSlug(row.slug);
                        const Icon = iconForProgramSlug(row.slug);
                        const seatsTone = row.seats >= 25 ? "text-emerald-400" : "text-rose-400";
                        return (
                          <tr key={`${row.date}-${row.slug}`}>
                            <td className="whitespace-nowrap py-2 pr-2 font-semibold text-white">
                              {row.date}
                            </td>
                            <td className="whitespace-nowrap py-2 pr-2 text-zinc-400">{row.time}</td>
                            <td className="py-2 pr-2">
                              <span className={`inline-flex items-center gap-1.5 font-semibold ${theme.accent}`}>
                                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                {row.programLabel}
                              </span>
                            </td>
                            <td className={`whitespace-nowrap py-2 pr-2 font-semibold ${seatsTone}`}>
                              {row.seats} Left
                            </td>
                            <td className="py-2">
                              <button
                                type="button"
                                onClick={() => enrollBySlug(row.slug)}
                                className="rounded-md bg-[#FFB800] px-2.5 py-1 text-[10px] font-extrabold text-black hover:bg-[#e5a600]"
                              >
                                Enroll Now
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    : page.batches.rows.map((row) => {
                        const card =
                          page.programs.find((p) => p.id === row.programId) ?? page.programs[0];
                        const theme = THEME_STYLES[card?.theme ?? "gold"] ?? THEME_STYLES.gold;
                        const Icon = resolveLucideIcon(card?.icon ?? "Trophy");
                        const seatsTone = row.seats >= 25 ? "text-emerald-400" : "text-rose-400";
                        return (
                          <tr key={`${row.date}-${row.programId}`}>
                            <td className="whitespace-nowrap py-2 pr-2 font-semibold text-white">
                              {row.date}
                            </td>
                            <td className="whitespace-nowrap py-2 pr-2 text-zinc-400">{row.time}</td>
                            <td className="py-2 pr-2">
                              <span className={`inline-flex items-center gap-1.5 font-semibold ${theme.accent}`}>
                                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                {row.programLabel}
                              </span>
                            </td>
                            <td className={`whitespace-nowrap py-2 pr-2 font-semibold ${seatsTone}`}>
                              {row.seats} Left
                            </td>
                            <td className="py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const slug = resolveCatalogEnrollSlug(card, programs);
                                  if (slug) enrollBySlug(slug);
                                  else router.push("/contact");
                                }}
                                className="rounded-md bg-[#FFB800] px-2.5 py-1 text-[10px] font-extrabold text-black hover:bg-[#e5a600]"
                              >
                                Enroll Now
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-white/10 bg-[#0b1220] p-3.5 sm:p-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">
                {page.trainer.eyebrow}
              </p>
              <div className="mt-1.5 h-0.5 w-10 bg-[#FFB800]" aria-hidden />
            </div>

            <div className="mt-3 flex flex-1 flex-col">
              <div className="flex gap-3">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#FFB800]/35 bg-zinc-900">
                  <AdminCatalogImg
                    src={page.trainer.photo || "/tutor-led-rajesh-kumar.png"}
                    alt={page.trainer.photoAlt || page.trainer.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-bold text-white">{page.trainer.name}</p>
                  <p className="mt-0.5 text-xs text-[#FFB800]">{page.trainer.role}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{page.trainer.experience}</p>
                </div>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-zinc-400">{page.trainer.bio}</p>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-white/10 bg-[#0b1220] p-3.5 sm:p-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">
                {page.faqsSection.eyebrow}
              </p>
              <div className="mt-1.5 h-0.5 w-10 bg-[#FFB800]" aria-hidden />
            </div>

            <div className="mt-2.5 flex-1 space-y-0">
              {page.faqs.map((faq, i) => {
                const open = openFaq === i;
                return (
                  <div key={faq.q} className="border-b border-white/10 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-3 py-2 text-left"
                    >
                      <span className="text-[12px] font-semibold leading-snug text-zinc-100">
                        {faq.q}
                      </span>
                      <Plus
                        className={`h-3.5 w-3.5 shrink-0 text-[#FFB800] transition ${open ? "rotate-45" : ""}`}
                        aria-hidden
                      />
                    </button>
                    {open ? (
                      <p className="pb-2 text-[11px] leading-relaxed text-zinc-400">{faq.a}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <Link
              href={page.faqsSection.viewAllHref || "#programs"}
              className="mt-2 self-end text-[11px] font-semibold text-sky-400 hover:text-sky-300"
            >
              {page.faqsSection.viewAllLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#050910]">
        <div className="mx-auto max-w-[1760px] px-4 py-8 sm:px-6 md:px-8 xl:px-10">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#FFB800]/35 bg-[#0b1220] px-4 py-5 sm:flex-row sm:justify-between sm:px-6">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#FFB800]/15 ring-1 ring-[#FFB800]/40">
                <GraduationCap className="h-5 w-5 text-[#FFB800]" aria-hidden />
              </div>
              <div>
                <p className="text-base font-bold text-white md:text-lg">{page.cta.heading}</p>
                <p className="mt-0.5 max-w-xl text-sm text-zinc-400">{page.cta.description}</p>
              </div>
            </div>
            <Link
              href={page.cta.buttonHref || "#programs"}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#FFB800] px-5 py-2.5 text-sm font-extrabold text-black transition hover:bg-[#e5a600]"
            >
              {page.cta.buttonText}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
