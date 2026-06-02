"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, CheckCircle2, ChevronDown, ChevronRight, Shield, Send } from "lucide-react";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import { TutorLedCertificatePreview } from "@/components/TutorLedCertificatePreview";

type Trainer = {
  name: string;
  role: string;
  experience: string;
  bio: string;
  workedWith: string[];
  avatar?: string;
};

type CurriculumRow = {
  week: number;
  topic: string;
  keyLearning: string;
  sessionType: string;
};

type WhyChooseRow = {
  icon: LucideIcon;
  title: string;
};

type FaqRow = {
  q: string;
  a: string;
};

type Props = {
  trainer: Trainer;
  highlights: string[];
  curriculum: CurriculumRow[];
  whyChoose: WhyChooseRow[];
  faqs: FaqRow[];
  certificate: { programTitle: string; trainerName: string };
  checkoutSlug?: string;
  enrolledLearning?: boolean;
};

export default function TutorLedAfterHeroSection({
  trainer,
  highlights,
  curriculum,
  whyChoose,
  faqs,
  certificate,
  checkoutSlug,
  enrolledLearning = false,
}: Props) {
  const router = useRouter();
  const tableRows = curriculum.slice(0, 7);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const reserve = () => {
    if (checkoutSlug && !enrolledLearning) registerTutorLedFromTemplate(router, checkoutSlug);
  };

  return (
    <section className="border-b border-white/10 bg-black">
      <div className="mx-auto w-full max-w-[1760px] px-4 py-5 md:px-8 xl:px-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-white/10 bg-zinc-950/55 p-4">
            <h3 className="text-sm font-bold text-white">Meet Your Trainer</h3>
            <div className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-3">
              <div className="relative h-24 overflow-hidden rounded-lg border border-[#FFB800]/30 bg-zinc-900">
                {trainer.avatar?.trim() ? (
                  <Image src={trainer.avatar} alt={trainer.name} fill className="object-cover" unoptimized />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#FFB800]">
                    {trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                  </span>
                )}
              </div>
              <div className="min-w-0 self-start">
                <p className="text-sm font-semibold text-white">{trainer.name}</p>
                <p className="text-xs text-zinc-400">{trainer.role}</p>
                <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">
                  {trainer.bio}
                </p>
              </div>
            </div>
            {trainer.workedWith.length > 0 ? (
              <div className="mt-3 border-t border-white/10 pt-2.5">
                <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Worked with</p>
                <div className="flex flex-wrap gap-3 text-xs font-semibold text-zinc-400">
                  {trainer.workedWith.slice(0, 5).map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          <article className="rounded-xl border border-white/10 bg-zinc-950/55 p-4">
            <h3 className="text-sm font-bold text-white">Live Training Highlights</h3>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_96px] gap-3">
              <ul className="space-y-2">
                {highlights.slice(0, 6).map((h) => (
                  <li key={h} className="flex items-start gap-2 text-xs text-zinc-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                    <span className="leading-snug">{h}</span>
                  </li>
                ))}
              </ul>
              <div className="relative overflow-hidden rounded-lg border border-[#FFB800]/25 bg-[#FFB800]/5">
                <Image src="/h2.png" alt="Live training highlights" fill className="object-cover" />
                <div className="absolute inset-0 grid place-items-center bg-black/25">
                  <Shield className="h-9 w-9 text-[#FFB800]" aria-hidden />
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <article className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/55">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-bold text-white">Live Training Schedule (Detailed Curriculum)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2.5">Week</th>
                    <th className="px-3 py-2.5">Topic</th>
                    <th className="px-3 py-2.5">Key Learning</th>
                    <th className="px-3 py-2.5 text-right">Session Type</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={`${row.week}-${row.topic}`} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2.5 font-semibold text-[#FFB800]">Week {row.week}</td>
                      <td className="px-3 py-2.5 text-zinc-200">{row.topic}</td>
                      <td className="px-3 py-2.5 text-zinc-500">{row.keyLearning}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FFB800]">
                          {row.sessionType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950/55">
            <div className="border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-bold text-white">Inside Live Classrooms</h3>
            </div>
            <div className="p-3">
              <div className="overflow-hidden rounded-lg border border-white/10">
                <Image
                  src="/h3.png"
                  alt="Inside live classroom"
                  width={640}
                  height={360}
                  className="h-auto w-full object-cover"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-zinc-500">
                <span className="min-w-0 flex-1 truncate">Type a message...</span>
                <Send className="h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
              </div>
            </div>
          </article>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <article className="rounded-xl border border-white/10 bg-zinc-950/55 p-4">
            <h3 className="text-sm font-bold text-white">Why Choose Tutor Led Training?</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {whyChoose.slice(0, 5).map((item) => (
                <div key={item.title} className="rounded-lg border border-white/10 bg-black/30 px-2 py-3 text-center">
                  <div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-md border border-[#FFB800]/25 bg-[#FFB800]/10">
                    <item.icon className="h-4 w-4 text-[#FFB800]" aria-hidden />
                  </div>
                  <p className="text-[11px] font-semibold text-white">{item.title}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-white/10 bg-zinc-950/55 p-4">
            <h3 className="text-sm font-bold text-white">Certificate of Completion</h3>
            <p className="mt-1 text-xs text-zinc-500">Earn an industry-recognized certificate and boost your career.</p>
            <ul className="mt-3 space-y-2 text-[11px] text-zinc-300">
              {[
                "Industry recognized",
                "Verified certificate",
                "Share on LinkedIn",
                "Digital & printable",
              ].map((item) => (
                <li key={item} className="inline-flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 overflow-hidden rounded-lg border border-[#FFB800]/35 bg-black/30 p-2">
              <TutorLedCertificatePreview
                programTitle={certificate.programTitle}
                trainerName={certificate.trainerName}
                layout="full"
                hideTitle
              />
            </div>
          </article>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <article className="rounded-xl border border-white/10 bg-zinc-950/55 p-4">
            <h3 className="mb-3 text-sm font-bold text-white">Frequently Asked Questions</h3>
            <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-black/25">
              {faqs.slice(0, 6).map((faq, i) => (
                <div key={faq.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-xs text-zinc-200"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-zinc-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i ? (
                    <div className="border-t border-zinc-800 px-4 pb-3 text-xs leading-relaxed text-zinc-400">{faq.a}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="mt-4">
          <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-[#FFB800]/40 bg-zinc-950/70 px-4 py-3 sm:flex-row">
            <div className="text-center sm:text-left">
              <h3 className="text-base font-bold text-white">Secure Your Spot in the Next Batch!</h3>
              <p className="text-xs text-zinc-500">Limited seats available for personalized learning experience.</p>
            </div>
            {!enrolledLearning && checkoutSlug ? (
              <button
                type="button"
                onClick={reserve}
                className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-lg bg-[#FFB800] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e5a600]"
              >
                Reserve Your Seat Now
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <Link
                href="/my-learning?tab=live"
                className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-lg bg-[#FFB800] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e5a600]"
              >
                Open My Learning
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

