"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, Sparkles } from "lucide-react";

export const AUDIENCE_COMING_SOON = {
  industry: {
    label: "Industry Professionals",
    headline: "Skill Today. Lead Tomorrow.",
    body: "A dedicated learning experience for plant, HSE, quality, operations, and compliance teams is on the way.",
  },
  auditor: {
    label: "Auditors & Auditor-Interns",
    headline: "Train with audit-ready pathways.",
    body: "A focused space for auditors and intern auditors — standards, evidence, and practical assessments — is coming soon.",
  },
  university: {
    label: "University / College Students",
    headline: "Build job-ready skills while you study.",
    body: "Campus-friendly courses, certificates, and career-aligned paths for students are coming soon.",
  },
  associators: {
    label: "Associates & Trainers",
    headline: "Teach, partner, and grow with SFT.",
    body: "A dedicated hub for associates and trainers — programs, resources, and collaboration — is coming soon.",
  },
} as const;

export type ComingSoonAudienceId = keyof typeof AUDIENCE_COMING_SOON;

type Props = {
  audience: ComingSoonAudienceId;
};

export default function AudienceComingSoon({ audience }: Props) {
  const copy = AUDIENCE_COMING_SOON[audience] ?? AUDIENCE_COMING_SOON.industry;
  const allAudiences = Object.entries(AUDIENCE_COMING_SOON) as Array<
    [ComingSoonAudienceId, (typeof AUDIENCE_COMING_SOON)[ComingSoonAudienceId]]
  >;

  return (
    <div className="min-h-[70vh] bg-[#0a0a0a] px-4 py-16 text-white md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#F5B800]/40 bg-[#F5B800]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#F5B800]">
          <Sparkles size={14} />
          Coming soon
        </p>
        <p className="mt-5 text-sm font-semibold text-zinc-400">for {copy.label}</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {copy.headline}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 md:text-base">
          {copy.body}
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500">
          Dedicated pages for every audience below are coming soon. The main catalog is live today.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {allAudiences.map(([id, item]) => {
            const selected = id === audience;
            return (
              <Link
                key={id}
                href={`/coming-soon?for=${id}`}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  selected
                    ? "border-amber-400/55 bg-amber-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-amber-400/35"
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-300">Coming soon</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  <span className="font-serif italic lowercase text-amber-200">for </span>
                  {item.label}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-xl bg-[#F5B800] px-6 py-3.5 text-sm font-extrabold text-black transition hover:brightness-110"
          >
            <GraduationCap size={18} />
            Browse courses
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-bold text-zinc-100 transition hover:border-[#F5B800]/40"
          >
            Back to home
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
