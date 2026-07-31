"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

const sectionShell = "mx-auto max-w-[1760px] px-4 md:px-6 xl:px-8";
const goldGradient = "bg-gradient-to-b from-[#f9b14d] to-[#eb9422]";

type Props = {
  badge: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  imageSrc?: string;
  imageAlt?: string;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
};

/** Homepage-matched shell for legal / content pages. */
export default function LmsContentPageShell({
  badge,
  title,
  titleHighlight,
  subtitle,
  children,
  backHref = "/",
  backLabel = "Back to home",
  imageSrc = "/lms-blogs-hero.png",
  imageAlt = COMPANY_DISPLAY_NAME,
  ctaHref,
  ctaLabel,
  secondaryCtaHref,
  secondaryCtaLabel,
}: Props) {
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    const sync = () => setIsLightTheme(document.documentElement.dataset.theme === "light");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const goldText = isLightTheme ? "lh-gold-text text-[#9a6812]" : "text-[#fde68a]";
  const muted = isLightTheme ? "text-slate-600" : "text-slate-400";
  const backTone = isLightTheme ? "text-[#9a6812] hover:text-[#7a520e]" : "text-amber-200/85 hover:text-amber-100";

  return (
    <div
      className={`learnly-home relative min-h-screen overflow-hidden ${
        isLightTheme
          ? "bg-[linear-gradient(180deg,#f8f4ec_0%,#f3ede3_45%,#efe7da_100%)] text-slate-900"
          : "bg-[#05070f] text-white"
      }`}
    >
      {!isLightTheme ? (
        <>
          <div className="pointer-events-none absolute -right-10 top-0 h-[420px] w-[420px] rounded-full bg-amber-500/10 blur-[120px]" />
          <div className="pointer-events-none absolute -left-16 bottom-40 h-[360px] w-[360px] rounded-full bg-violet-600/10 blur-[120px]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute right-10 top-10 h-64 w-64 rounded-full bg-amber-400/20 blur-[90px]" />
          <div className="pointer-events-none absolute left-10 top-64 h-56 w-56 rounded-full bg-violet-300/15 blur-[90px]" />
        </>
      )}

      <div className={`${sectionShell} relative py-8 md:py-12`}>
        <Link href={backHref} className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] transition ${backTone}`}>
          <ArrowLeft size={14} />
          {backLabel}
        </Link>

        <section
          className={`lh-path-card mt-6 overflow-hidden rounded-3xl border ${
            isLightTheme ? "border-[#b4965a]/30 bg-white/70 shadow-[0_12px_40px_rgba(154,104,18,0.08)]" : "border-amber-500/35 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] shadow-[0_0_40px_rgba(249,177,77,0.14)]"
          }`}
        >
          <div className="grid lg:grid-cols-[1.12fr_0.88fr]">
            <div className="flex flex-col justify-center p-6 md:p-8 lg:p-12">
              <p
                className={`lh-premium-badge inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${
                  isLightTheme
                    ? "border-[#b4965a]/35 bg-[#f8f1e4] text-[#9a6812]"
                    : "border-amber-400/35 bg-amber-500/10 text-amber-200"
                }`}
              >
                <Sparkles size={13} className={isLightTheme ? "text-[#c47f0a]" : "text-amber-300"} />
                {badge}
              </p>

              <h1 className="lh-section-title mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl">
                {title}
                {titleHighlight ? (
                  <>
                    {" "}
                    <span className={goldText}>{titleHighlight}</span>
                  </>
                ) : null}
              </h1>

              <p className={`mt-4 max-w-xl text-sm leading-7 md:text-base ${muted}`}>{subtitle}</p>
              <p className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] ${isLightTheme ? "text-slate-500" : "text-gray-500"}`}>
                {COMPANY_DISPLAY_NAME}
              </p>

              {(ctaHref && ctaLabel) || (secondaryCtaHref && secondaryCtaLabel) ? (
                <div className="mt-7 flex flex-wrap gap-3">
                  {ctaHref && ctaLabel ? (
                    <Link
                      href={ctaHref}
                      className={`lh-gold-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-black shadow-[0_8px_24px_rgba(249,177,77,.35)] transition-all hover:-translate-y-0.5 hover:brightness-110 ${goldGradient}`}
                    >
                      {ctaLabel} <ArrowRight size={14} />
                    </Link>
                  ) : null}
                  {secondaryCtaHref && secondaryCtaLabel ? (
                    <Link
                      href={secondaryCtaHref}
                      className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-bold transition ${
                        isLightTheme
                          ? "border-[#b4965a]/40 text-[#9a6812] hover:bg-[#f8f1e4]"
                          : "border-amber-500/40 text-[#fde68a] hover:bg-amber-500/10"
                      }`}
                    >
                      {secondaryCtaLabel}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div
              className={`relative flex min-h-[280px] items-center justify-center border-t p-4 md:p-6 lg:min-h-[460px] lg:border-l lg:border-t-0 ${
                isLightTheme ? "border-[#b4965a]/25 bg-[#f8f1e4]/40" : "border-amber-500/20 bg-black/25"
              }`}
            >
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={900}
                height={900}
                className="h-auto max-h-[420px] w-full object-contain"
                sizes="(max-width: 1024px) 100vw, 44vw"
                priority
              />
            </div>
          </div>
        </section>

        <div className="mt-8 space-y-5 md:mt-10 md:space-y-6">{children}</div>

        <section
          className={`lh-unlock-shell mt-12 overflow-hidden rounded-3xl border p-6 md:mt-16 md:p-10 ${
            isLightTheme
              ? "border-[#b4965a]/30 bg-[linear-gradient(135deg,#fff9ef,#f3e7d2)]"
              : "border-amber-500/40 bg-linear-to-br from-amber-500/25 via-[#2a1b08] to-[#120c08]"
          }`}
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="lh-section-title text-2xl font-extrabold md:text-3xl">
              Ready to start <span className={goldText}>learning</span>?
            </h2>
            <p className={`mx-auto mt-3 max-w-xl text-sm leading-relaxed ${muted}`}>
              Browse our LMS catalog, talk to an advisor, or open live chat — same support experience as our homepage.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/courses"
                className={`lh-gold-btn inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-black shadow-[0_8px_24px_rgba(249,177,77,.35)] transition-all hover:-translate-y-0.5 hover:brightness-110 ${goldGradient}`}
              >
                Explore courses <ArrowRight size={14} />
              </Link>
              <Link
                href="/book-a-call"
                className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-bold transition ${
                  isLightTheme
                    ? "border-[#b4965a]/40 text-[#9a6812] hover:bg-white/70"
                    : "border-amber-500/45 text-[#fde68a] hover:bg-amber-500/10"
                }`}
              >
                Book a call
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function LmsContentCard({
  title,
  children,
  icon,
}: {
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    const sync = () => setIsLightTheme(document.documentElement.dataset.theme === "light");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={`lh-path-card rounded-2xl border p-5 transition-all md:p-6 ${
        isLightTheme
          ? "border-[#b4965a]/28 bg-white/75 shadow-[0_8px_28px_rgba(154,104,18,0.08)] hover:border-[#9a6812]/45"
          : "border-amber-500/35 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] shadow-[0_0_24px_rgba(249,177,77,0.14)] hover:border-amber-300/70 hover:shadow-[0_0_32px_rgba(249,177,77,0.22)]"
      }`}
    >
      {title ? (
        <div className="mb-3 flex items-center gap-2.5">
          {icon ? (
            <span
              className={`lh-icon-chip inline-flex h-9 w-9 items-center justify-center rounded-xl border ${
                isLightTheme
                  ? "border-[#b4965a]/30 bg-[#f8f1e4] text-[#9a6812]"
                  : "border-amber-400/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              {icon}
            </span>
          ) : null}
          <h2 className={`lh-card-title text-lg font-bold ${isLightTheme ? "text-slate-900" : "text-[#fde68a]"}`}>
            {title}
          </h2>
        </div>
      ) : null}
      <div className={`space-y-3 text-sm leading-relaxed ${isLightTheme ? "text-slate-600" : "text-slate-300"}`}>
        {children}
      </div>
    </section>
  );
}
