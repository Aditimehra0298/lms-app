"use client";

import Image from "next/image";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Send } from "lucide-react";
import { TutorLedHighlightsContent } from "@/components/TutorLedHighlightsBadge";
import { TutorLedWhyFaqCertificateBlock } from "@/components/TutorLedWhyFaqCertificateBlock";
import { TUTOR_LED_CLASSROOM_IMAGE_SRC } from "@/lib/tutor-led-marketing-assets";

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
  desc?: string;
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
};

export default function TutorLedAfterHeroSection({
  trainer,
  highlights,
  curriculum,
  whyChoose,
  faqs,
  certificate,
}: Props) {
  const tableRows = curriculum.slice(0, 7);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
            <TutorLedHighlightsContent highlights={highlights} />
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
                  src={TUTOR_LED_CLASSROOM_IMAGE_SRC}
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

        <TutorLedWhyFaqCertificateBlock
          whyChoose={whyChoose}
          faqs={faqs}
          certificate={certificate}
          openFaq={openFaq}
          setOpenFaq={setOpenFaq}
          headingSize="sm"
        />

      </div>
    </section>
  );
}

