"use client";

import type { LucideIcon } from "lucide-react";
import { BadgeCheck, ChevronDown, Download, Share2, Shield } from "lucide-react";
import { TutorLedCertificatePreview } from "@/components/TutorLedCertificatePreview";

const certificateBenefits: {
  label: string;
  desc: string;
  icon: LucideIcon;
  iconWrap?: string;
  iconClass?: string;
}[] = [
  {
    label: "Industry Recognized",
    desc: "IEB-accredited credential trusted by employers",
    icon: Shield,
    iconWrap: "border-[#FFB800]/35 bg-[#FFB800]/10",
    iconClass: "text-[#FFB800]",
  },
  {
    label: "Verified Certificate",
    desc: "Unique ID and QR code for instant verification",
    icon: BadgeCheck,
    iconWrap: "border-emerald-500/30 bg-emerald-500/10",
    iconClass: "text-emerald-400",
  },
  {
    label: "Share on LinkedIn",
    desc: "Showcase your achievement to your network",
    icon: Share2,
    iconWrap: "border-[#0A66C2]/30 bg-[#0A66C2]/10",
    iconClass: "text-[#0A66C2]",
  },
  {
    label: "Digital & Printable",
    desc: "Download high-resolution PDF anytime",
    icon: Download,
    iconWrap: "border-white/15 bg-white/5",
    iconClass: "text-zinc-300",
  },
];

type WhyRow = { icon: LucideIcon; title: string; desc?: string };
type FaqRow = { q: string; a: string };

type Props = {
  whyChoose: WhyRow[];
  faqs: FaqRow[];
  certificate: { programTitle: string; trainerName: string };
  openFaq: number | null;
  setOpenFaq: (index: number | null) => void;
  headingSize?: "sm" | "base";
};

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  size = "base",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  size?: "sm" | "base";
}) {
  const titleSize = size === "sm" ? "text-sm md:text-base" : "text-base md:text-lg";
  return (
    <header className="mb-5">
      {eyebrow ? (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFB800]/90">{eyebrow}</p>
      ) : null}
      <h3 className={`font-bold tracking-tight text-white ${titleSize}`}>{title}</h3>
      {subtitle ? <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-zinc-500">{subtitle}</p> : null}
    </header>
  );
}

/** Left: Why Choose + FAQ stacked. Right: premium Certificate card (marketing mockup). */
export function TutorLedWhyFaqCertificateBlock({
  whyChoose,
  faqs,
  certificate,
  openFaq,
  setOpenFaq,
  headingSize = "base",
}: Props) {
  return (
    <section className="mt-6 md:mt-8" aria-labelledby="tutor-led-trust-heading">
      <div className="mb-5 flex flex-col gap-1 md:mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#FFB800]/85">Why learners choose us</p>
        <h2 id="tutor-led-trust-heading" className="text-lg font-bold tracking-tight text-white md:text-xl">
          Training built for real outcomes
        </h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-stretch lg:gap-6">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">
          {/* Why Choose */}
          <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-zinc-950/80 to-black/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6">
            <SectionHeading
              size={headingSize}
              title="Why Choose Tutor Led Training?"
              subtitle="Live guidance, structured curriculum, and credentials that move your career forward."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-2.5">
              {whyChoose.slice(0, 5).map((item) => (
                <div
                  key={item.title}
                  className="group flex flex-col items-center rounded-xl border border-transparent px-2 py-3 text-center transition hover:border-[#FFB800]/20 hover:bg-[#FFB800]/[0.04]"
                >
                  <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-[#FFB800]/30 bg-gradient-to-b from-[#FFB800]/15 to-[#FFB800]/5 shadow-[0_8px_24px_rgba(255,184,0,0.12)] transition group-hover:border-[#FFB800]/50">
                    <item.icon className="h-5 w-5 text-[#FFB800]" aria-hidden />
                  </div>
                  <p className="text-[11px] font-semibold leading-snug text-white">{item.title}</p>
                  {item.desc ? (
                    <p className="mt-1.5 text-[9px] leading-relaxed text-zinc-500">{item.desc}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          {/* FAQ */}
          <article className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-zinc-950/80 to-black/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6">
            <SectionHeading
              size={headingSize}
              title="Frequently Asked Questions"
              subtitle="Everything you need to know before reserving your seat."
            />
            <div className="space-y-2">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div
                    key={faq.q}
                    className={`overflow-hidden rounded-xl border transition ${
                      isOpen
                        ? "border-[#FFB800]/25 bg-[#FFB800]/[0.04]"
                        : "border-white/[0.06] bg-black/30 hover:border-white/10"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
                    >
                      <span className={`text-xs font-medium leading-snug md:text-sm ${isOpen ? "text-white" : "text-zinc-200"}`}>
                        {faq.q}
                      </span>
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition ${
                          isOpen
                            ? "border-[#FFB800]/40 bg-[#FFB800]/15 text-[#FFB800]"
                            : "border-white/10 bg-white/[0.03] text-zinc-500"
                        }`}
                      >
                        <ChevronDown size={15} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="border-t border-[#FFB800]/15 px-4 pb-4 pt-3 text-xs leading-relaxed text-zinc-400 md:text-sm">
                        {faq.a}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        {/* ── Right column: Certificate ── */}
        <article className="relative flex flex-col overflow-hidden rounded-2xl border border-[#FFB800]/40 bg-gradient-to-br from-zinc-950/90 via-zinc-950/70 to-black p-5 shadow-[0_0_48px_rgba(255,184,0,0.1),inset_0_1px_0_rgba(255,184,0,0.12)] md:p-6 lg:min-h-[520px]">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FFB800]/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-[#FFB800]/5 blur-3xl"
            aria-hidden
          />

          <SectionHeading
            size={headingSize}
            eyebrow="Included with enrollment"
            title="Certificate of Completion"
            subtitle="Earn an industry-recognized certificate and boost your career."
          />

          <div className="relative flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(180px,54%)] lg:items-start lg:gap-6">
            {/* Benefits */}
            <ul className="space-y-2.5">
              {certificateBenefits.map(({ label, desc, icon: Icon, iconWrap, iconClass }) => (
                <li
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5 transition hover:border-[#FFB800]/20 hover:bg-black/40"
                >
                  <span
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${iconWrap ?? "border-[#FFB800]/30 bg-[#FFB800]/10"}`}
                  >
                    <Icon className={`h-4 w-4 ${iconClass ?? "text-[#FFB800]"}`} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-white">{label}</span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-zinc-500">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Certificate preview */}
            <div className="relative flex flex-1 items-center justify-center lg:justify-end">
              <div
                className="pointer-events-none absolute inset-x-4 bottom-4 top-8 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,184,0,0.14),transparent_68%)]"
                aria-hidden
              />
              <TutorLedCertificatePreview
                programTitle={certificate.programTitle}
                trainerName={certificate.trainerName}
                layout="panel"
                hideTitle
              />
            </div>
          </div>

          <p className="relative mt-4 border-t border-[#FFB800]/15 pt-4 text-center text-[10px] leading-relaxed text-zinc-500 lg:text-left">
            Sample preview — your personalized Certificate of Attainment is issued upon successful completion.
          </p>
        </article>
      </div>
    </section>
  );
}
