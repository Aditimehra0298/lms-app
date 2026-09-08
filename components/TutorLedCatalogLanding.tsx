"use client";

import Image from "next/image";
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
  /** Optional catalog programs — used only to resolve enroll slugs when titles match. */
  programs?: TutorLedProgramStored[];
  /** Admin-managed landing copy & images. */
  config?: TutorLedCatalogPageConfig;
};

const THEME_STYLES: Record<
  TutorLedCatalogTheme,
  { accent: string; border: string; button: string; iconBg: string }
> = {
  emerald: {
    accent: "text-emerald-300",
    border: "border-emerald-500/45",
    button: "bg-emerald-500 hover:bg-emerald-400 text-black",
    iconBg: "bg-emerald-500/20 text-emerald-300",
  },
  sky: {
    accent: "text-sky-300",
    border: "border-sky-500/45",
    button: "bg-sky-500 hover:bg-sky-400 text-black",
    iconBg: "bg-sky-500/20 text-sky-300",
  },
  violet: {
    accent: "text-violet-300",
    border: "border-violet-500/45",
    button: "bg-violet-500 hover:bg-violet-400 text-white",
    iconBg: "bg-violet-500/20 text-violet-300",
  },
  gold: {
    accent: "text-[#FFB800]",
    border: "border-[#FFB800]/50",
    button: "bg-[#FFB800] hover:bg-[#e5a600] text-black",
    iconBg: "bg-[#FFB800]/20 text-[#FFB800]",
  },
};

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
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image
            src={page.hero.backgroundImage || page.pageThumbnail || "/tutor-led-iso-hero.png"}
            alt={page.hero.backgroundAlt || ""}
            fill
            priority
            className="object-cover object-[72%_center]"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, rgba(5,8,18,0.96) 0%, rgba(5,8,18,0.88) 40%, rgba(5,8,18,0.52) 68%, rgba(5,8,18,0.78) 100%)",
            }}
            aria-hidden
          />
        </div>

        <div className="relative mx-auto grid max-w-[1760px] gap-6 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] md:items-center md:gap-8 md:px-8 md:py-10 xl:px-10">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-300">
              {page.hero.eyebrow}
            </p>
            <h1 className="mt-2 text-[1.9rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[2.45rem] lg:text-[2.85rem]">
              {page.hero.heading}{" "}
              <span className="text-[#FFB800]">{page.hero.headingHighlight}</span>
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-[0.95rem] md:leading-6">
              {page.hero.subtitle}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#FFB800] px-5 py-2.5 text-sm font-extrabold text-black transition hover:bg-[#e5a600]"
            >
              {page.hero.ctaText}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <aside className="relative justify-self-end sm:max-w-md">
            <p
              className="mb-2.5 max-w-[16rem] text-right font-serif text-xl italic leading-snug text-white/95 sm:text-[1.45rem]"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.65)" }}
            >
              {page.hero.asideQuote}
            </p>
            <div className="border border-[#FFB800]/40 bg-black/60 p-4 backdrop-blur-md">
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

      {/* Programs */}
      <section id="programs" className="scroll-mt-24 border-b border-white/10 bg-[#070b16]">
        <div className="mx-auto max-w-[1760px] px-4 py-8 sm:px-6 md:px-8 md:py-9 xl:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl">
              {page.programsSection.title}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">{page.programsSection.subtitle}</p>
          </div>

          <div className="mt-6 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
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
                  className={`relative flex flex-col border bg-[#0b1020] p-4 ${theme.border} ${
                    card.popular ? "ring-1 ring-[#FFB800]/55" : ""
                  }`}
                >
                  {card.popular ? (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#FFB800] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-black">
                      ★ Most Popular
                    </span>
                  ) : null}

                  {thumb ? (
                    <div className="relative mb-3 h-24 w-full overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                      <Image src={thumb} alt="" fill className="object-cover" sizes="280px" />
                    </div>
                  ) : (
                    <div className={`mb-3 grid h-10 w-10 place-items-center rounded-full ${theme.iconBg}`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                  )}

                  <h3 className={`text-base font-bold ${theme.accent}`}>{card.title}</h3>
                  <p className="mt-0.5 text-sm font-medium text-zinc-200">{card.tagline}</p>

                  <ul className="mt-3 flex-1 space-y-1.5">
                    {card.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${theme.accent}`} aria-hidden />
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
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why train */}
      <section className="border-b border-white/10 bg-[#060b16]">
        <div className="mx-auto max-w-[1760px] px-4 py-7 sm:px-6 md:px-8 md:py-8 xl:px-10">
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

      {/* Who should attend */}
      <section className="border-b border-white/10 bg-[#050910]">
        <div className="mx-auto grid max-w-[1760px] gap-3.5 px-4 py-7 sm:px-6 md:grid-cols-[1.65fr_1fr] md:px-8 md:py-8 xl:px-10">
          <div className="rounded-xl border border-white/10 bg-[#0b1220] p-4 md:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFB800]">
              {page.audience.eyebrow}
            </p>
            <div className="mt-1.5 h-0.5 w-12 bg-[#FFB800]" aria-hidden />
            <h2 className="mt-2.5 text-xl font-bold text-white md:text-[1.5rem]">{page.audience.title}</h2>
            <p className="mt-1.5 text-sm text-zinc-400">{page.audience.subtitle}</p>
            <div className="mt-3.5 flex flex-wrap gap-2">
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

          <aside className="flex overflow-hidden rounded-xl border border-[#FFB800]/30 bg-[#0b1220]">
            <div className="flex flex-1 flex-col justify-center p-4 md:p-5">
              <Leaf className="h-5 w-5 text-[#FFB800]" aria-hidden />
              <p className="mt-2 text-base font-bold leading-snug text-white whitespace-pre-line">
                {page.audience.investTitle}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{page.audience.investBody}</p>
            </div>
            <div className="relative hidden w-[38%] shrink-0 sm:block">
              <Image
                src={page.audience.investImage || "/tutor-led-invest-knowledge.png"}
                alt={page.audience.investImageAlt || ""}
                fill
                className="object-cover"
                sizes="240px"
              />
            </div>
          </aside>
        </div>
      </section>

      {/* Batches + trainer + FAQ */}
      <section className="border-b border-white/10 bg-[#060b16]">
        <div className="mx-auto grid max-w-[1760px] gap-3.5 px-4 py-7 sm:px-6 lg:grid-cols-[1.45fr_0.85fr_0.85fr] md:px-8 md:py-8 xl:px-10">
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
                                onClick={() => card && enrollCard(card)}
                                className="rounded-md bg-[#FFB800] px-2.5 py-1 text-[10px] font-extrabold text-black hover:bg-[#e5a600]"
                              >
                                Enroll Now
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  {!useLiveBatches && page.batches.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-zinc-500">
                        No upcoming batches yet. Set Next batch date in Admin → Tutor Led / Batches.
                      </td>
                    </tr>
                  ) : null}
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
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#FFB800]/35 bg-zinc-900">
                  <Image
                    src={page.trainer.photo || "/tutor-led-rajesh-kumar.png"}
                    alt={page.trainer.photoAlt || page.trainer.name}
                    fill
                    className="object-cover"
                    sizes="64px"
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

      {/* Final CTA */}
      <section className="bg-[#050910]">
        <div className="mx-auto max-w-[1760px] px-4 py-6 sm:px-6 md:px-8 xl:px-10">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#FFB800]/35 bg-[#0b1220] px-4 py-4 sm:flex-row sm:justify-between sm:px-6 sm:py-5">
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
