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
import { TutorLedWhyFaqCertificateBlock } from "@/components/TutorLedWhyFaqCertificateBlock";
import TutorLedPreFooterReserveBar from "@/components/TutorLedPreFooterReserveBar";
import { TUTOR_LED_CLASSROOM_IMAGE_SRC } from "@/lib/tutor-led-marketing-assets";
import type { PostHeroCourse } from "@/components/TutorLedPostHeroSections";

const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-8 xl:px-10";

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
  {
    day: 1,
    label: "Module 1",
    topic: "Introduction to Cybersecurity",
    keyLearning: "Security fundamentals, threats & attack vectors",
    sessionType: "Live + Hands-on",
  },
  {
    day: 2,
    label: "Module 2",
    topic: "Network Security",
    keyLearning: "Firewalls, IDS/IPS, VPN, network monitoring",
    sessionType: "Live + Lab",
  },
  {
    day: 3,
    label: "Module 3",
    topic: "Practical Tools",
    keyLearning: "Industry tools for scanning & enumeration",
    sessionType: "Live + Demo",
  },
  {
    day: 4,
    label: "Module 4",
    topic: "Incident Response",
    keyLearning: "Detection, containment & recovery",
    sessionType: "Live Workshop",
  },
];

function buildScheduleDays(course: PostHeroCourse) {
  if (course.curriculum.length > 0) {
    return course.curriculum.slice(0, 8).map((w, i) => ({
      day: i + 1,
      label: w.label?.trim() || `Module ${i + 1}`,
      topic: w.topic,
      keyLearning: w.keyLearning,
      sessionType: w.sessionType?.trim() || "Live Session",
    }));
  }
  return defaultDayRows;
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFB800]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-base">{description}</p>
      ) : null}
    </div>
  );
}

/** Lower landing sections — schedule, trainer, classroom, FAQ/certificate, CTA. */
export default function TutorLedLandingSections({
  course,
  certificate,
  batch,
  openFaq,
  setOpenFaq,
  checkoutSlug,
  enrolledLearning = false,
  classroomImageSrc = TUTOR_LED_CLASSROOM_IMAGE_SRC,
}: Props) {
  const scheduleDays = buildScheduleDays(course);
  const dayCount = scheduleDays.length;

  const meta: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Calendar, label: "Starts", value: batch.startDate },
    { icon: Clock, label: "Timing", value: `${batch.sessionDays} · ${batch.timeIst}` },
    { icon: Monitor, label: "Mode", value: batch.mode },
    { icon: Users, label: "Duration", value: batch.duration },
  ];

  return (
    <>
      {/* Schedule */}
      <section className="border-b border-white/10 bg-[#070707]">
        <div className={`${shell} py-14 md:py-20`}>
          <SectionIntro
            eyebrow="Curriculum"
            title={`${dayCount}-day live training schedule`}
            description="Instructor-led sessions on Zoom. Show up live, practice with the trainer, and finish with a certificate."
          />

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-white/10 py-5">
            {meta.map((item) => (
              <div key={item.label} className="flex items-start gap-2.5">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">{item.value}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <Award className="h-4 w-4" aria-hidden />
              <span className="font-semibold">Certificate included</span>
            </div>
          </div>

          <ol className="mt-10 space-y-0">
            {scheduleDays.map((row, idx) => (
              <li
                key={row.day}
                className="grid gap-3 border-b border-white/10 py-6 first:pt-0 last:border-b-0 md:grid-cols-[7rem_1fr_9rem] md:items-start md:gap-8"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFB800]">
                    Day {row.day}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{row.label}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white md:text-xl">{row.topic}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
                    {row.keyLearning}
                  </p>
                </div>
                <p className="text-xs font-semibold text-zinc-300 md:text-right">
                  <Video className="mr-1.5 inline h-3.5 w-3.5 text-[#FFB800]" aria-hidden />
                  {row.sessionType}
                </p>
                {idx === scheduleDays.length - 1 ? null : null}
              </li>
            ))}
          </ol>

          {course.highlights.length > 0 ? (
            <ul className="mt-10 grid gap-3 sm:grid-cols-2">
              {course.highlights.slice(0, 6).map((h) => (
                <li key={h} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* Trainer + classroom */}
      <section className="border-b border-white/10 bg-black">
        <div className={`${shell} grid gap-12 py-14 md:py-20 lg:grid-cols-2 lg:gap-16`}>
          <div>
            <SectionIntro
              eyebrow="Your trainer"
              title={`Learn live with ${course.trainer.name}`}
              description={course.trainer.bio}
            />
            <div className="mt-8 flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#FFB800]/40 bg-zinc-900">
                {course.trainer.avatar?.trim() ? (
                  <Image
                    src={course.trainer.avatar}
                    alt={course.trainer.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#FFB800]">
                    {course.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{course.trainer.name}</p>
                <p className="text-sm text-[#FFB800]">{course.trainer.role}</p>
                <p className="mt-1 text-xs text-zinc-500">{course.trainer.experience}</p>
              </div>
            </div>
            {course.trainer.certifications.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {course.trainer.certifications.map((tag) => (
                  <span
                    key={tag}
                    className="border border-white/15 px-3 py-1.5 text-[11px] font-medium text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {course.trainer.workedWith.length > 0 ? (
              <p className="mt-6 text-xs text-zinc-500">
                Worked with{" "}
                <span className="font-semibold text-zinc-300">
                  {course.trainer.workedWith.slice(0, 5).join(" · ")}
                </span>
              </p>
            ) : null}
          </div>

          <div>
            <SectionIntro
              eyebrow="Inside the classroom"
              title="Real-time teaching on Zoom"
              description="Screen share, live demos, chat Q&A, and breakout practice — the same energy as an onsite lab, from anywhere."
            />
            <div className="relative mt-8 aspect-[16/10] w-full overflow-hidden bg-zinc-950">
              <Image
                src={classroomImageSrc}
                alt="Live classroom session"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-zinc-400">
              {["Live on Zoom", "HD video", "Real-time Q&A", "Session recordings"].map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#FFB800]" aria-hidden />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why + FAQ + certificate */}
      <section className="border-b border-white/10 bg-[#070707]">
        <div className={`${shell} py-14 md:py-20`}>
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
