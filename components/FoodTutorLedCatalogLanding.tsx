"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Award,
  Check,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { CatalogMediaImage } from "@/components/CatalogMediaImage";
import { DescriptionButton } from "@/components/CourseActionButtons";
import type { TutorLedCatalogPageConfig, TutorLedCatalogProgramCard, TutorLedCatalogTheme } from "@/lib/content-schema";
import { markCourseLandingViewed } from "@/lib/course-landing";
import { resolveLucideIcon } from "@/lib/lucide-icon-resolve";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import { registerTutorLedFromTemplate, registerTutorLedBundle } from "@/lib/push-checkout-or-login";
import { multiItemBundlePercent, multiItemBundleRate } from "@/lib/checkout-totals";

type Props = {
  page: TutorLedCatalogPageConfig;
};

const THEME: Record<
  TutorLedCatalogTheme,
  { ring: string; title: string; price: string; icon: string; btn: string }
> = {
  emerald: {
    ring: "border-emerald-500/45 hover:border-emerald-400/70",
    title: "text-emerald-300",
    price: "text-emerald-400",
    icon: "text-emerald-400",
    btn: "bg-emerald-500 text-black hover:bg-emerald-400",
  },
  sky: {
    ring: "border-sky-500/45 hover:border-sky-400/70",
    title: "text-sky-300",
    price: "text-sky-400",
    icon: "text-sky-400",
    btn: "bg-sky-500 text-black hover:bg-sky-400",
  },
  violet: {
    ring: "border-violet-500/45 hover:border-violet-400/70",
    title: "text-violet-300",
    price: "text-violet-400",
    icon: "text-violet-400",
    btn: "bg-violet-500 text-white hover:bg-violet-400",
  },
  gold: {
    ring: "border-amber-400/70 hover:border-amber-300",
    title: "text-amber-300",
    price: "text-amber-300",
    icon: "text-amber-300",
    btn: "bg-amber-400 text-black hover:bg-amber-300",
  },
};

function inr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function cardCourseTitle(program: TutorLedCatalogProgramCard): string {
  return program.title?.trim() || "Live training";
}

const CARD_HOVER: Record<string, { about: string; forWho: string }> = {
  basic: {
    about:
      "Start with ISO 22000:2018 language, food-safety principles, and how an FSMS protects people and brands.",
    forWho: "New joiners, operators, and anyone who needs a clear awareness of the standard.",
  },
  implementation: {
    about:
      "Turn the standard into a working system: PRPs, documentation, hazard control, and day-to-day FSMS routines.",
    forWho: "QA officers, supervisors, and teams who will implement ISO 22000 in the plant.",
  },
  "internal-auditor": {
    about:
      "Plan audits, gather evidence, write non-conformities, and check whether controls really work on the floor.",
    forWho: "Internal auditors, QA, and staff who will audit the organisation’s own FSMS.",
  },
  "lead-auditor": {
    about:
      "Lead audit teams, manage certification-style audits, and apply ISO 19011 reporting with confidence.",
    forWho: "Experienced auditors and professionals on the Lead Auditor certification pathway.",
  },
};

function ChipIcon({ name }: { name: string }) {
  const Icon = resolveLucideIcon(name) as LucideIcon;
  return <Icon className="h-4 w-4" strokeWidth={2} />;
}

function EnrollButton({
  slug,
  className,
  children,
}: {
  slug: string;
  className: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        markCourseLandingViewed(slug);
        registerTutorLedFromTemplate(router, slug);
      }}
      className={className}
    >
      {children}
    </button>
  );
}

function CardActions({ slug, enrollClassName }: { slug: string; enrollClassName: string }) {
  return (
    <div className="mt-4 flex min-w-0 gap-2">
      <EnrollButton slug={slug} className={`min-w-0 flex-1 ${enrollClassName}`}>
        Enroll Now
        <ChevronRight className="h-3.5 w-3.5" />
      </EnrollButton>
      <DescriptionButton href={liveTutorCourseHref(slug)} className="flex-1" />
    </div>
  );
}

function programEnrollSlug(
  program: TutorLedCatalogProgramCard,
  enrollById: Record<string, string>,
): string {
  return program.enrollSlug?.trim() || enrollById[program.id] || program.id;
}

function BuyAllProgramsBanner({
  programs,
  enrollById,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  programs: TutorLedCatalogProgramCard[];
  enrollById: Record<string, string>;
  selected: Set<string>;
  onToggle: (slug: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const allSlugs = programs.map((p) => programEnrollSlug(p, enrollById)).filter(Boolean);
  if (allSlugs.length < 2) return null;

  const picked = programs.filter((p) => selected.has(programEnrollSlug(p, enrollById)));
  const count = picked.length;
  const subtotal = picked.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const percent = multiItemBundlePercent(count);
  const bundle = Math.round(subtotal * (1 - multiItemBundleRate(count)));
  const ctaSlugs = picked.map((p) => programEnrollSlug(p, enrollById));

  const ctaLabel =
    count === 0
      ? "Tick 2, 3 or all batches"
      : count === 1
        ? "Enroll in 1 batch"
        : count === allSlugs.length
          ? `Buy all ${count} batches · ${percent}% off`
          : `Buy ${count} batches · ${percent}% off`;

  return (
    <div
      id="buy-all-batches"
      className="mt-8 flex flex-col gap-4 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-950/50 to-emerald-950/30 p-5 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">Mix your pathway</p>
        <h3 className="mt-1 text-lg font-bold text-white md:text-xl">Buy any 2, any 3, or all {allSlugs.length}</h3>
        <p className="mt-1 max-w-xl text-sm text-zinc-400">
          Tick the live batches you want. 2 programs save 10%, 3 save 15%, all {allSlugs.length} save 20%.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {programs.map((p) => {
            const slug = programEnrollSlug(p, enrollById);
            const on = selected.has(slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() => onToggle(slug)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  on
                    ? "border-amber-400 bg-amber-400 text-black"
                    : "border-white/15 bg-black/30 text-zinc-300 hover:border-amber-400/50"
                }`}
              >
                {cardCourseTitle(p).replace(/^ISO 22000:2018\s+/i, "")}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-amber-200 hover:border-amber-400/60"
          >
            Select all
          </button>
          {count > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          ) : null}
        </div>
        {count >= 2 && subtotal > 0 ? (
          <p className="mt-2 text-sm">
            <span className="text-lg font-extrabold text-amber-300">{inr(bundle)}</span>
            <span className="ml-2 text-xs text-zinc-500 line-through">{inr(subtotal)}</span>
            <span className="ml-2 rounded bg-violet-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {percent}% OFF
            </span>
          </p>
        ) : count === 1 && subtotal > 0 ? (
          <p className="mt-2 text-sm text-zinc-400">
            Add one more batch for 10% off · this one is {inr(subtotal)}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={count === 0}
        onClick={() => {
          if (count === 1) registerTutorLedFromTemplate(router, ctaSlugs[0]);
          else if (count > 1) registerTutorLedBundle(router, ctaSlugs);
        }}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#f4c150] px-5 py-3 text-sm font-bold text-black shadow-[0_8px_28px_rgba(244,193,80,0.35)] transition hover:bg-[#f9d06a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ctaLabel}
        {count > 0 ? <ChevronRight className="h-4 w-4" /> : null}
      </button>
    </div>
  );
}

/**
 * Designed ISO 22000 tutor-led catalog — opens from Description on Food category cards.
 */
export default function FoodTutorLedCatalogLanding({ page }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const heroBg = page.hero.backgroundImage?.trim() || "/tutor-led-iso-hero.png";
  const enrollById: Record<string, string> = {
    basic: "iso-22000-basic",
    implementation: "iso-22000-implementation",
    "internal-auditor": "iso-22000-internal-auditor",
    "lead-auditor": "iso-22000-lead-auditor",
  };

  const toggleSlug = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div className="overflow-hidden bg-[#07090f] text-white">
      <section className="relative isolate grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative z-10 px-5 py-12 md:px-10 md:py-16 lg:pr-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-300">
            {page.hero.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white md:text-5xl md:leading-[1.08]">
            {page.hero.heading}
            <span className="mt-1 block bg-gradient-to-r from-amber-300 to-[#eb9422] bg-clip-text text-transparent">
              {page.hero.headingHighlight}
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-base">
            {page.hero.subtitle}
          </p>
          <ul className="mt-7 flex flex-wrap gap-2">
            {page.hero.chips.map((chip) => (
              <li
                key={chip.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[11px] text-zinc-200"
              >
                <span className="text-amber-300">
                  <ChipIcon name={chip.icon} />
                </span>
                {chip.label}
              </li>
            ))}
          </ul>
          <a
            href={page.hero.ctaHref || "#food-tutor-led-programs"}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-[#eb9422] px-5 py-2.5 text-sm font-bold text-black shadow-[0_8px_24px_rgba(235,148,34,0.35)]"
          >
            {page.hero.ctaText}
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
        <div className="relative min-h-[280px] overflow-hidden lg:min-h-[420px]">
          <Image
            src={heroBg}
            alt={page.hero.backgroundAlt || ""}
            fill
            priority
            className="object-cover object-[70%_center]"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07090f] via-[#07090f]/25 to-transparent lg:from-[#07090f]/80" />
          <p className="absolute left-6 top-8 max-w-[220px] whitespace-pre-line font-serif text-2xl italic leading-tight text-white drop-shadow-lg md:text-3xl">
            {page.hero.asideQuote.replace(/,\s*/g, "\n")}
          </p>
          <aside className="absolute right-5 top-5 max-w-[200px] rounded-2xl border border-white/20 bg-black/55 p-4 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
              {page.hero.certCardTitle}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{page.hero.certCardSubtitle}</p>
          </aside>
          <p className="absolute bottom-6 right-5 max-w-[240px] text-right text-xs italic text-zinc-200">
            {page.hero.certCardQuote}
            <span className="mt-1 block text-[10px] not-italic text-zinc-400">
              {page.hero.certCardAttribution}
            </span>
          </p>
        </div>
      </section>

      <section id="food-tutor-led-programs" className="scroll-mt-28 px-5 py-12 md:px-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300">Our Programs</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">{page.programsSection.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">{page.programsSection.subtitle}</p>
          </div>
          <p className="max-w-[180px] text-right font-serif text-sm italic text-amber-200/90">
            Same Standard Different Goals A Brighter Tomorrow
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {page.programs.map((program) => {
            const theme = THEME[program.theme] ?? THEME.gold;
            const slug = program.enrollSlug || enrollById[program.id] || program.id;
            const courseTitle = cardCourseTitle(program);
            const extra = /iso\s*22000/i.test(courseTitle)
              ? CARD_HOVER[program.id]
              : {
                  about: program.tagline || program.bullets[0] || "Live Zoom training for this level.",
                  forWho: program.bullets.filter(Boolean).slice(0, 2).join(" · ") || "Professionals on this pathway.",
                };
            const thumb = program.thumbnail?.trim() || "/tutor-led-iso-hero.png";
            return (
              <article
                key={program.id}
                tabIndex={0}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-[#0d1118] outline-none transition duration-500 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.45)] focus-within:-translate-y-1 ${theme.ring} ${
                  selected.has(slug) ? "ring-2 ring-amber-400" : ""
                }`}
              >
                <button
                  type="button"
                  aria-pressed={selected.has(slug)}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSlug(slug);
                  }}
                  className={`absolute left-3 top-3 z-40 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-lg ${
                    selected.has(slug)
                      ? "border-amber-400 bg-amber-400 text-black"
                      : "border-white/20 bg-black/70 text-white hover:border-amber-400/70"
                  }`}
                >
                  <span
                    className={`grid h-3.5 w-3.5 place-items-center rounded-sm border ${
                      selected.has(slug) ? "border-black bg-black/20" : "border-white/50"
                    }`}
                  >
                    {selected.has(slug) ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                  {selected.has(slug) ? "Added" : "Add"}
                </button>
                {program.popular ? (
                  <span className="absolute right-3 top-3 z-30 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                    Most Popular
                  </span>
                ) : null}
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-black">
                  <div className="absolute inset-0 transition duration-700 ease-out group-hover:scale-110 group-focus-within:scale-110">
                    <CatalogMediaImage
                      storedSrc={thumb}
                      courseSlug={slug}
                      alt={courseTitle}
                      fill
                      className="object-contain"
                      extraFallback="/tutor-led-iso-hero.png"
                    />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className={`text-[15px] font-bold leading-snug ${theme.title}`}>{courseTitle}</h3>
                  <p className="mt-1 text-sm font-medium text-white">{program.tagline}</p>
                  <p className="mt-4 text-[11px] font-medium text-amber-200/90">Own Zoom class &amp; batch</p>
                  <p className={`mt-2 text-2xl font-extrabold ${theme.price}`}>{inr(program.price)}</p>
                  <p className="text-[11px] text-zinc-500">(Incl. of taxes)</p>
                  <p className="mt-4 text-[11px] text-zinc-500 group-hover:hidden group-focus-within:hidden">
                    Hover to see what this level covers
                  </p>
                  <CardActions slug={slug} enrollClassName={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-bold ${theme.btn}`} />
                </div>

                <div className="pointer-events-none absolute inset-0 z-20 flex translate-y-[18%] flex-col justify-end bg-gradient-to-t from-black via-black/92 to-black/35 p-4 opacity-0 transition-all duration-500 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <div className="translate-y-4 rounded-xl border border-white/15 bg-black/70 p-3.5 shadow-2xl backdrop-blur-md transition duration-500 delay-75 group-hover:translate-y-0 group-focus-within:translate-y-0">
                    {extra ? (
                      <>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.title}`}>
                          About this level
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-zinc-200">{extra.about}</p>
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90">
                          Who it is for
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-300">{extra.forWho}</p>
                      </>
                    ) : null}
                    <ul className="mt-3 space-y-1.5">
                      {program.bullets.map((b) => (
                        <li key={b} className="flex gap-2 text-[11px] text-zinc-200">
                          <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${theme.icon}`} />
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-zinc-400">
                      <span className="rounded-md border border-white/10 px-2 py-1">{program.durationLabel}</span>
                      <span className="rounded-md border border-white/10 px-2 py-1">{program.modeLabel}</span>
                      <span className="rounded-md border border-white/10 px-2 py-1">{program.certificateLabel}</span>
                    </div>
                    <CardActions
                      slug={slug}
                      enrollClassName={`inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-xs font-bold ${theme.btn}`}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {page.programs.length > 1 ? (
          <BuyAllProgramsBanner
            programs={page.programs}
            enrollById={enrollById}
            selected={selected}
            onToggle={toggleSlug}
            onSelectAll={() =>
              setSelected(
                new Set(page.programs.map((p) => programEnrollSlug(p, enrollById)).filter(Boolean)),
              )
            }
            onClear={() => setSelected(new Set())}
          />
        ) : null}
      </section>

      <section className="px-5 py-10 md:px-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300">{page.why.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold text-white">
          {page.why.titleLine1}{" "}
          <span className="text-amber-300">{page.why.titleLine2}</span>
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {page.why.items.map((item) => {
            const Icon = resolveLucideIcon(item.icon);
            return (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <Icon className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{item.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 px-5 py-10 md:grid-cols-[1.15fr_0.85fr] md:px-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-emerald-300">
            {page.audience.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">{page.audience.title}</h2>
          <p className="mt-2 text-sm text-zinc-400">{page.audience.subtitle}</p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {page.audience.items.map((item) => {
              const Icon = resolveLucideIcon(item.icon);
              return (
                <li
                  key={item.label}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-zinc-200"
                >
                  <Icon className="h-4 w-4 text-amber-300" />
                  {item.label}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-white/10">
          {page.audience.investImage ? (
            <Image
              src={page.audience.investImage}
              alt={page.audience.investImageAlt || ""}
              fill
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="whitespace-pre-line text-lg font-bold text-white">{page.audience.investTitle}</p>
            <p className="mt-2 text-xs text-zinc-300">{page.audience.investBody}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr_0.9fr] md:px-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300">{page.batches.eyebrow}</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Program</th>
                  <th className="px-3 py-3">Seats</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {page.batches.rows.map((row) => {
                  const slug = enrollById[row.programId] || row.programId;
                  return (
                    <tr key={`${row.programId}-${row.date}`} className="text-zinc-200">
                      <td className="px-3 py-3 font-medium">{row.date}</td>
                      <td className="px-3 py-3 text-zinc-400">{row.time}</td>
                      <td className="px-3 py-3">{row.programLabel}</td>
                      <td className="px-3 py-3 text-amber-200">{row.seats} Left</td>
                      <td className="px-3 py-3">
                        <EnrollButton
                          slug={slug}
                          className="rounded-lg bg-amber-400 px-2 py-1 text-[10px] font-bold text-black hover:bg-amber-300"
                        >
                          Enroll Now
                        </EnrollButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300">{page.trainer.eyebrow}</p>
          <div className="mt-4 flex gap-4 rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {page.trainer.photo ? (
                <Image src={page.trainer.photo} alt={page.trainer.photoAlt || page.trainer.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-amber-300">
                  <Award className="h-8 w-8" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{page.trainer.name}</h3>
              <p className="text-sm text-emerald-200">
                {page.trainer.role} · {page.trainer.experience}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">{page.trainer.bio}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-300">
            {page.faqsSection.eyebrow}
          </p>
          <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
            {page.faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <button
                  key={faq.q}
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full flex-col px-4 py-3 text-left"
                >
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
                    {faq.q}
                    <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 ${open ? "rotate-180" : ""}`} />
                  </span>
                  {open ? <span className="mt-2 text-xs leading-relaxed text-zinc-400">{faq.a}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-5 mb-10 overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-950/40 to-emerald-950/30 px-5 py-8 text-center md:mx-10 md:px-10">
        <h2 className="text-2xl font-bold text-white">{page.cta.heading}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">{page.cta.description}</p>
        <a
          href={page.cta.buttonHref || "#food-tutor-led-programs"}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-[#eb9422] px-6 py-2.5 text-sm font-bold text-black"
        >
          {page.cta.buttonText}
          <ChevronRight className="h-4 w-4" />
        </a>
      </section>
    </div>
  );
}
