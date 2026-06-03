"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  MessageCircle,
  Send,
  Users,
} from "lucide-react";
import { TutorLedHighlightsContent } from "@/components/TutorLedHighlightsBadge";
import { TutorLedWhyFaqCertificateBlock } from "@/components/TutorLedWhyFaqCertificateBlock";
import TutorLedPreFooterReserveBar from "@/components/TutorLedPreFooterReserveBar";
import { TUTOR_LED_CLASSROOM_IMAGE_SRC } from "@/lib/tutor-led-marketing-assets";
import type { PostHeroCourse } from "@/components/TutorLedPostHeroSections";

const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-8 xl:px-10";
const panel = "rounded-xl border border-white/10 bg-zinc-950/55";

export type TutorLedBatchRow = {
  batchId: string;
  startDate: string;
  sessionDays: string;
  timeIst: string;
  duration: string;
  mode: string;
};

type Props = {
  course: PostHeroCourse;
  certificate: { programTitle: string; trainerName: string };
  batch: TutorLedBatchRow;
  openFaq: number | null;
  setOpenFaq: (index: number | null) => void;
  checkoutSlug?: string;
  enrolledLearning?: boolean;
  classroomImageSrc?: string;
};

const syllabusRows = [
  { module: 1, topic: "Introduction to Cybersecurity", keyLearning: "Security fundamentals, threats & attack vectors", duration: "Live Session" },
  { module: 2, topic: "Network Security", keyLearning: "Firewalls, IDS/IPS, VPN, network monitoring", duration: "Live Session" },
  { module: 3, topic: "Practical Tools", keyLearning: "Industry tools for scanning & enumeration", duration: "Live Session" },
  { module: 4, topic: "Web Application Security", keyLearning: "OWASP Top 10, SQL injection, XSS", duration: "Live Session" },
  { module: 5, topic: "Incident Response", keyLearning: "Detection, containment & recovery", duration: "Live Session" },
];

/** Lower landing sections — matches marketing mockup (schedule, classroom, why choose + FAQ | certificate, CTA). */
export default function TutorLedLandingSections({
  course,
  certificate,
  openFaq,
  setOpenFaq,
  checkoutSlug,
  enrolledLearning = false,
  classroomImageSrc = TUTOR_LED_CLASSROOM_IMAGE_SRC,
}: Props) {
  const previewSyllabusRows =
    course.curriculum.length > 0
      ? course.curriculum.slice(0, 5).map((w) => ({
          module: w.week,
          topic: w.topic,
          keyLearning: w.keyLearning,
          duration: "Live Session",
        }))
      : syllabusRows;

  return (
    <>
      <section className="border-b border-white/10 bg-black">
        <div className={`${shell} py-6 md:py-8`}>
          {/* Row: Meet trainer | Live highlights + h2 badge */}
          <div className="grid gap-4 lg:grid-cols-2">
            <article className={`${panel} p-4`}>
              <h3 className="text-base font-bold text-white">Meet Your Trainer</h3>
              <div className="mt-3 flex gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#FFB800]/40 bg-zinc-900">
                  {course.trainer.avatar?.trim() ? (
                    <Image src={course.trainer.avatar} alt={course.trainer.name} fill className="object-cover" unoptimized />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xl font-bold text-[#FFB800]">
                      {course.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#FFB800]">{course.trainer.name}</p>
                  <p className="text-xs text-zinc-300">{course.trainer.role}</p>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">{course.trainer.bio}</p>
                </div>
              </div>
              {course.trainer.certifications.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {course.trainer.certifications.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-[#FFB800]/45 bg-transparent px-2.5 py-1 text-[10px] font-medium text-[#FFB800]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {course.trainer.workedWith.length > 0 ? (
                <div className="mt-3 border-t border-white/10 pt-2.5">
                  <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Worked with</p>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold text-zinc-400">
                    {course.trainer.workedWith.slice(0, 5).map((w) => (
                      <span key={w}>{w}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>

            <article className={`${panel} p-4`}>
              <h3 className="text-base font-bold text-white">Live Training Highlights</h3>
              <TutorLedHighlightsContent highlights={course.highlights} />
            </article>
          </div>

          {/* Row: Schedule | Inside classrooms */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <article className={`${panel} overflow-hidden`}>
              <div className="border-b border-white/10 px-4 py-3">
                <h3 className="text-base font-bold text-white">Live Training Schedule (Detailed Curriculum)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/30 text-[10px] uppercase tracking-wide text-zinc-500">
                      <th className="px-3 py-2.5">Week</th>
                      <th className="px-3 py-2.5">Topic</th>
                      <th className="px-3 py-2.5">Key Learning</th>
                      <th className="px-3 py-2.5 text-right">Session Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSyllabusRows.map((row) => (
                      <tr key={row.module} className="border-b border-white/5 last:border-0">
                        <td className="px-3 py-2.5 font-semibold text-[#FFB800]">Week {row.module}</td>
                        <td className="px-3 py-2.5 text-zinc-200">{row.topic}</td>
                        <td className="px-3 py-2.5 text-zinc-500">{row.keyLearning}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FFB800]">
                            {row.duration}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className={`${panel} overflow-hidden`}>
              <div className="border-b border-white/10 px-4 py-3">
                <h3 className="text-base font-bold text-white">Inside Live Classrooms</h3>
              </div>
              <div className="p-3">
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <Image
                    src={classroomImageSrc}
                    alt="Live classroom session"
                    width={640}
                    height={360}
                    className="h-auto w-full object-cover"
                  />
                </div>
                <div className="mt-3 space-y-2 text-[11px] text-zinc-400">
                  <p className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#FFB800]" /> Group interaction and real-time Q&amp;A
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-[#FFB800]" /> Mentor support during every live session
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[11px] text-zinc-500">
                  <span className="min-w-0 flex-1 truncate">Type a message...</span>
                  <Send className="h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                </div>
              </div>
            </article>
          </div>

          <TutorLedWhyFaqCertificateBlock
            whyChoose={course.whyChoose}
            faqs={course.faqs}
            certificate={certificate}
            openFaq={openFaq}
            setOpenFaq={setOpenFaq}
          />
        </div>
      </section>

      <TutorLedPreFooterReserveBar checkoutSlug={checkoutSlug} enrolledLearning={enrolledLearning} />
    </>
  );
}
