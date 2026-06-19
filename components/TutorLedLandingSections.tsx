"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Monitor,
  Users,
  Video,
} from "lucide-react";
import { TutorLedDashboardPreview } from "@/components/TutorLedDashboardPreview";
import { TutorLedHighlightsContent } from "@/components/TutorLedHighlightsBadge";
import { TutorLedWhyFaqCertificateBlock } from "@/components/TutorLedWhyFaqCertificateBlock";
import TutorLedPreFooterReserveBar from "@/components/TutorLedPreFooterReserveBar";
import { TUTOR_LED_CLASSROOM_IMAGE_SRC, TUTOR_LED_TRUST_BADGE_SRC } from "@/lib/tutor-led-marketing-assets";
import type { PostHeroCourse } from "@/components/TutorLedPostHeroSections";

const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-8 xl:px-10";
const panel = "rounded-xl border border-white/10 bg-zinc-950/55";
const panelLeftHighlight =
  "rounded-xl border border-[#FFB800]/35 bg-gradient-to-br from-zinc-950/95 via-zinc-950/80 to-black/70 shadow-[0_0_48px_rgba(255,184,0,0.12),inset_0_1px_0_rgba(255,184,0,0.15)]";
const goldEyebrow = "text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFB800]";

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
  countdown?: { days: number; hours: number; mins: number; secs: number };
};

const defaultDayRows = [
  { day: 1, label: "Module 1", topic: "Introduction to Cybersecurity", keyLearning: "Security fundamentals, threats & attack vectors", sessionType: "Live + Hands-on", focus: "Threat landscape & security basics" },
  { day: 2, label: "Module 2", topic: "Network Security", keyLearning: "Firewalls, IDS/IPS, VPN, network monitoring", sessionType: "Live + Lab", focus: "Hands-on network defence" },
  { day: 3, label: "Module 3", topic: "Practical Tools", keyLearning: "Industry tools for scanning & enumeration", sessionType: "Live + Demo", focus: "Tool walkthroughs with trainer" },
  { day: 4, label: "Module 4", topic: "Incident Response", keyLearning: "Detection, containment & recovery", sessionType: "Live Workshop", focus: "Real-world response scenarios" },
];

function buildScheduleDays(course: PostHeroCourse) {
  if (course.curriculum.length > 0) {
    const days = course.curriculum.slice(0, 4);
    return days.map((w, i) => ({
      day: i + 1,
      label: w.label?.trim() || `Module ${i + 1}`,
      topic: w.topic,
      keyLearning: w.keyLearning,
      sessionType: w.sessionType?.trim() || "Live Session",
      focus: w.keyLearning.split(/[,;&]/)[0]?.trim() || w.topic,
    }));
  }
  return defaultDayRows;
}

/** Lower landing sections — matches marketing mockup (schedule, classroom, why choose + FAQ | certificate, CTA). */
export default function TutorLedLandingSections({
  course,
  certificate,
  batch,
  openFaq,
  setOpenFaq,
  checkoutSlug,
  enrolledLearning = false,
  classroomImageSrc = TUTOR_LED_CLASSROOM_IMAGE_SRC,
  countdown,
}: Props) {
  const scheduleDays = buildScheduleDays(course);
  const dayCount = scheduleDays.length;
  const nextSessionTitle = scheduleDays[0]?.topic ?? "Day 1 — Live introduction";
  const scheduleLabel = `${batch.sessionDays} · ${batch.timeIst} IST`;
  const previewCountdown = countdown ?? { days: 5, hours: 12, mins: 45, secs: 30 };

  return (
    <>
      <section className="border-b border-white/10 bg-black">
        <div className={`${shell} py-6 md:py-8`}>
          {/* Row: Meet trainer | Live highlights + h2 badge */}
          <div className="grid gap-4 lg:grid-cols-2">
            <article className={`${panelLeftHighlight} p-4`}>
              <h3 className="text-base font-bold text-white">
                <span className="mr-2 inline-block h-4 w-1 rounded-full bg-[#FFB800]" aria-hidden />
                Meet Your Trainer
              </h3>
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

          {/* Row: Day-wise schedule | Inside classrooms — equal height */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2 lg:items-stretch">
            <article className={`${panelLeftHighlight} flex flex-col overflow-hidden`}>
              <div className="border-b border-[#FFB800]/20 bg-[#FFB800]/[0.06] px-4 py-3">
                <h3 className="text-base font-bold text-white">
                  <span className="mr-2 inline-block h-4 w-1 rounded-full bg-[#FFB800]" aria-hidden />
                  Live Training Schedule
                </h3>
                <p className="mt-1 text-xs font-medium text-[#FFB800]/90">
                  {dayCount}-day intensive · instructor-led on Zoom · certificate on completion
                </p>
              </div>

              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <div className="rounded-xl border border-[#FFB800]/40 bg-gradient-to-r from-[#FFB800]/15 via-[#FFB800]/8 to-transparent p-3 shadow-[inset_0_1px_0_rgba(255,184,0,0.2)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[#FFB800] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black shadow-[0_4px_14px_rgba(255,184,0,0.35)]">
                      {batch.batchId}
                    </span>
                    <span className="rounded-full border border-[#FFB800]/50 bg-[#FFB800]/10 px-2 py-0.5 text-[10px] font-bold text-[#FFB800]">
                      {batch.mode}
                    </span>
                  </div>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <p className="flex items-start gap-2 rounded-lg border border-[#FFB800]/20 bg-black/30 px-2.5 py-2 text-[11px]">
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                      <span>
                        <span className="block text-[9px] font-bold uppercase tracking-wide text-[#FFB800]/80">
                          Batch starts
                        </span>
                        <span className="font-semibold text-white">{batch.startDate}</span>
                      </span>
                    </p>
                    <p className="flex items-start gap-2 rounded-lg border border-[#FFB800]/20 bg-black/30 px-2.5 py-2 text-[11px]">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                      <span>
                        <span className="block text-[9px] font-bold uppercase tracking-wide text-[#FFB800]/80">
                          Session timing
                        </span>
                        <span className="font-semibold text-white">
                          {batch.sessionDays} · {batch.timeIst}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>

                <p className={`${goldEyebrow} mt-3`}>Day-by-day curriculum</p>

                <div className="mt-2 grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {scheduleDays.map((row) => (
                    <div
                      key={row.day}
                      className="flex min-h-[130px] flex-col rounded-xl border border-[#FFB800]/25 bg-gradient-to-br from-[#FFB800]/[0.07] via-zinc-950/90 to-black/60 p-3 shadow-[inset_0_1px_0_rgba(255,184,0,0.12)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-[#FFB800] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-black">
                          Day {row.day}
                        </span>
                        <span className="rounded-full border border-[#FFB800]/45 bg-[#FFB800]/15 px-2 py-0.5 text-[9px] font-bold text-[#FFB800]">
                          {row.sessionType}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-[#FFB800]/75">
                        {row.label}
                      </p>
                      <p className="mt-1 text-sm font-bold leading-snug text-white">{row.topic}</p>
                      <p className="mt-1 flex-1 text-[11px] leading-relaxed text-zinc-300">{row.keyLearning}</p>
                      <p className="mt-2 flex items-center gap-1.5 border-t border-[#FFB800]/15 pt-2 text-[10px] text-zinc-300">
                        <Video className="h-3 w-3 shrink-0 text-[#FFB800]" aria-hidden />
                        <span>
                          <span className="font-bold text-[#FFB800]">Focus:</span> {row.focus}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-[#FFB800]/30 bg-[#FFB800]/[0.07] p-3">
                  <p className={goldEyebrow}>What you will gain</p>
                  <ul className="mt-2 space-y-2">
                    {course.highlights.slice(0, 4).map((h) => (
                      <li key={h} className="flex items-start gap-2 text-[11px] font-medium text-zinc-200">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#FFB800]/15 pt-3 sm:grid-cols-4">
                  {[
                    { icon: Calendar, label: "Starts", value: batch.startDate },
                    { icon: Clock, label: "Timing", value: batch.timeIst },
                    { icon: Monitor, label: "Mode", value: batch.mode },
                    { icon: Users, label: "Duration", value: batch.duration },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-[#FFB800]/25 bg-[#FFB800]/[0.06] px-2 py-2 text-center sm:px-2.5"
                    >
                      <item.icon className="mx-auto h-4 w-4 text-[#FFB800]" aria-hidden />
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#FFB800]/75">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold leading-snug text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2.5 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                  <Award className="h-4 w-4 text-emerald-300" aria-hidden />
                  <p className="text-[11px] leading-snug text-zinc-200">
                    <span className="font-bold text-emerald-300">Certificate included</span> — IEB-accredited
                    Certificate of Attainment issued after successful completion.
                  </p>
                </div>
              </div>
            </article>

            <article className={`${panel} flex flex-col overflow-hidden`}>
              <div className="border-b border-white/10 px-4 py-3">
                <h3 className="text-base font-bold text-white">Inside Live Classrooms</h3>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Opens in My Learning · countdown to course start · join live on Zoom
                </p>
              </div>
              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                  <Image
                    src={classroomImageSrc}
                    alt="Live classroom session"
                    width={800}
                    height={520}
                    className="h-auto w-full object-contain object-center"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-xl border border-[#FFB800]/35 bg-gradient-to-r from-[#FFB800]/10 to-transparent p-3 shadow-[inset_0_1px_0_rgba(255,184,0,0.12)]">
                    <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
                      <Image
                        src={TUTOR_LED_TRUST_BADGE_SRC}
                        alt=""
                        fill
                        className="object-contain drop-shadow-[0_0_16px_rgba(255,184,0,0.3)]"
                        sizes="56px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#FFB800]">Trusted &amp; verified</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-400">
                        Secure enrollment · IEB-accredited certificates · verified credentials
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[#FFB800]/35 bg-gradient-to-br from-zinc-950/90 via-[#FFB800]/10 to-black/50 p-3 shadow-[inset_0_1px_0_rgba(255,184,0,0.1)]">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#FFB800]/40 bg-[#FFB800]/15">
                      <Video className="h-5 w-5 text-[#FFB800]" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">Learning Live Session</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-400">
                        Join interactive Zoom classes — live teaching, Q&amp;A, demos, and peer learning every session.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {["Live on Zoom", "HD video", "Real-time Q&A"].map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-2 py-0.5 text-[9px] font-semibold text-[#FFB800]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <TutorLedDashboardPreview
                  programTitle={certificate.programTitle}
                  nextSessionTitle={nextSessionTitle}
                  batchStartDate={batch.startDate}
                  scheduleLabel={scheduleLabel}
                  trainerName={course.trainer.name}
                  countdown={previewCountdown}
                />
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
