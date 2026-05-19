"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Monitor,
  MonitorPlay,
  PlayCircle,
  Send,
  Shield,
  ShieldCheck,
  Smartphone,
  Users,
  Video,
} from "lucide-react";
import { registerTutorLedFromTemplate } from "@/lib/push-checkout-or-login";
import { TutorLedCertificatePreview } from "@/components/TutorLedCertificatePreview";
import { TutorLedCurriculumExplorer } from "@/components/TutorLedCurriculumExplorer";
import TutorLedLandingSections, { type TutorLedBatchRow } from "@/components/TutorLedLandingSections";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

const shell = "mx-auto w-full max-w-[1760px] px-4 md:px-8 xl:px-10";
const card =
  "rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] sm:p-6";

const highlightIcons = [Video, MonitorPlay, MessageCircle, Users, Video, CheckCircle2] as const;

export type PostHeroTrainer = {
  name: string;
  role: string;
  experience: string;
  bio: string;
  certifications: string[];
  workedWith: string[];
  avatar?: string;
};

export type PostHeroCurriculum = {
  week: number;
  label: string;
  topic: string;
  keyLearning: string;
  sessionType: string;
};

export type PostHeroWhy = { icon: LucideIcon; title: string; desc: string };

export type PostHeroCourse = {
  trainer: PostHeroTrainer;
  highlights: string[];
  curriculum: PostHeroCurriculum[];
  whyChoose: PostHeroWhy[];
  faqs: { q: string; a: string }[];
  features: { icon: LucideIcon; title: string; desc: string }[];
};

type Props = {
  course: PostHeroCourse;
  openFaq: number | null;
  setOpenFaq: (index: number | null) => void;
  highlightsImageSrc?: string;
  classroomImageSrc?: string;
  /** Marketing copy labels for catalog (self-paced) vs live tutor pages. */
  variant?: "tutor-led" | "self-paced";
  /** Learner already enrolled — bottom CTA becomes schedule, not checkout. */
  enrolledLearning?: boolean;
  /** When set on public tutor-led pages, bottom CTA runs login → checkout for this slug. */
  tutorLedCheckoutSlug?: string;
  /** Full program for week + day curriculum (live trainings). */
  tutorLedSchedule?: Pick<TutorLedProgramStored, "curriculum" | "curriculumMode">;
  /** Shown on pre-payment tutor-led pages with certificate mockup. */
  tutorLedCertificate?: {
    programTitle: string;
    trainerName: string;
  };
  /** Live batch row for schedule table (marketing page). */
  tutorLedBatch?: TutorLedBatchRow;
};

const chatPreviewTutorLed = [
  { user: "Priya S.", text: "Great explanation on firewalls!", tone: "neutral" as const },
  { user: "Trainer", text: "Thanks — we’ll dive deeper in Week 2.", tone: "amber" as const },
  { user: "James R.", text: "Very informative session!", tone: "neutral" as const },
];

const chatPreviewSelfPaced = [
  { user: "Learner", text: "Finally cleared the Module 2 quiz — explanations were clear.", tone: "neutral" as const },
  { user: "Instructor", text: "Nice work. Module 3 builds on those ideas.", tone: "amber" as const },
  { user: "Ravi M.", text: "Self-paced worked perfectly with my night shifts.", tone: "neutral" as const },
];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">{eyebrow}</p>
      ) : null}
      <h2 className="mt-1 text-xl font-bold text-white md:text-2xl">{title}</h2>
      {description ? <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-400">{description}</p> : null}
    </div>
  );
}

function PageAnchors({ items }: { items: { href: string; label: string }[] }) {
  return (
    <nav
      className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4"
      aria-label="On this page"
    >
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-[#FFB800]/40 hover:text-[#FFB800]"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export default function TutorLedPostHeroSections({
  course,
  openFaq,
  setOpenFaq,
  highlightsImageSrc = "/h2.png",
  classroomImageSrc = "/h3.png",
  variant = "tutor-led",
  enrolledLearning = false,
  tutorLedCheckoutSlug,
  tutorLedSchedule,
  tutorLedCertificate,
  tutorLedBatch,
}: Props) {
  const router = useRouter();
  const isSelfPaced = variant === "self-paced";
  const chatLines = isSelfPaced ? chatPreviewSelfPaced : chatPreviewTutorLed;
  const useMarketingLayout = !isSelfPaced && Boolean(tutorLedCertificate && tutorLedBatch);

  const classroomBlock = (
    <div className={`${card} overflow-hidden !p-0`}>
      <div className="relative border-b border-white/10">
        <Image
          src={classroomImageSrc}
          alt={isSelfPaced ? "Self-paced learning" : "Live classroom session"}
          width={800}
          height={520}
          className="h-auto w-full object-cover"
        />
      </div>
      <div className="space-y-3 border-b border-white/5 bg-black/40 px-4 py-3">
        {(isSelfPaced
          ? [
              { icon: PlayCircle, text: "HD video lessons — pause, rewind, and revisit" },
              { icon: BookOpen, text: "Readings, notes, and downloads in each module" },
              { icon: Smartphone, text: "Study on the device that fits your day" },
            ]
          : [
              { icon: Monitor, text: "Instructor screen share & live demos" },
              { icon: MessageCircle, text: "Live chat and Q&A during sessions" },
              { icon: Users, text: "Breakout rooms for group activities" },
            ]
        ).map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-xs text-zinc-300">
            <item.icon className="h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
            {item.text}
          </div>
        ))}
      </div>
      <div className="bg-zinc-900/90 px-3 py-3">
        <div className="mb-2 max-h-[140px] space-y-2 overflow-y-auto pr-1 text-[11px]">
          {chatLines.map((m) => (
            <div
              key={m.user + m.text}
              className={`flex gap-2 rounded-lg px-2 py-1.5 ${
                m.tone === "amber" ? "bg-[#FFB800]/10 text-zinc-200" : "bg-white/[0.04] text-zinc-300"
              }`}
            >
              <span
                className={`shrink-0 font-semibold ${m.tone === "amber" ? "text-[#FFB800]" : "text-zinc-500"}`}
              >
                {m.user}:
              </span>
              <span>{m.text}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-zinc-500">
          <span className="min-w-0 flex-1 truncate">Type a message…</span>
          <Send className="h-3.5 w-3.5 shrink-0 text-[#FFB800]" aria-hidden />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Meet trainer + highlights */}
      <section className="border-b border-white/10 bg-black">
        <div className={`${shell} py-8 md:py-10`}>
          <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-6">
            <div className={`${card} flex h-full flex-col`}>
              <h2 className="mb-5 text-lg font-bold tracking-tight text-white md:text-xl">
                {isSelfPaced ? "Meet Your Instructor" : "Meet Your Trainer"}
              </h2>
              <div className="flex flex-1 flex-col">
                <div className="flex gap-4">
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-2 border-[#FFB800]/40 bg-zinc-900 sm:h-20 sm:w-20">
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
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-[#FFB800] sm:text-lg">{course.trainer.name}</h3>
                    <p className="text-sm text-zinc-200">{course.trainer.role}</p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{course.trainer.bio}</p>
                  </div>
                </div>
                {!isSelfPaced ? (
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    {course.trainer.certifications.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-[#FFB800]/50 bg-transparent px-3 py-1.5 text-[11px] font-medium text-[#FFB800]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {course.trainer.certifications.map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-[#FFB800]/45 bg-[#FFB800]/[0.07] px-3 py-1.5 text-[11px] font-semibold text-[#FFB800]"
                        >
                          <ShieldCheck size={12} className="mr-1 inline -translate-y-px" />
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Worked With</p>
                      <div className="flex flex-wrap gap-4 sm:gap-5">
                        {course.trainer.workedWith.map((w) => (
                          <span key={w} className="text-sm font-bold tracking-wide text-zinc-500">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={`${card} flex h-full flex-col`}>
              <h2 className="mb-5 text-lg font-bold tracking-tight text-white md:text-xl">
                {isSelfPaced ? "What you will get" : "Live Training Highlights"}
              </h2>
              <div className="flex min-h-0 flex-1 flex-col gap-5 sm:flex-row sm:items-stretch">
                <ul className="min-w-0 flex-1 space-y-2.5 sm:py-1">
                  {course.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-snug text-zinc-200">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="relative flex w-full shrink-0 items-center justify-center sm:w-[44%] sm:max-w-[220px]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,184,0,0.18),transparent_70%)]" />
                  <div className="relative aspect-square w-full max-w-[200px]">
                    <Image
                      src={highlightsImageSrc}
                      alt="Cyber security training highlight"
                      fill
                      className="object-contain drop-shadow-[0_0_32px_rgba(255,184,0,0.4)]"
                      sizes="220px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {useMarketingLayout && tutorLedCertificate && tutorLedBatch ? (
        <TutorLedLandingSections
          course={course}
          certificate={tutorLedCertificate}
          batch={tutorLedBatch}
          openFaq={openFaq}
          setOpenFaq={setOpenFaq}
          checkoutSlug={tutorLedCheckoutSlug}
          enrolledLearning={enrolledLearning}
          classroomImageSrc={classroomImageSrc}
        />
      ) : null}

      {!useMarketingLayout && !isSelfPaced && tutorLedCertificate ? (
        <section className="border-b border-white/10 bg-black" id="certificate">
          <div className={`${shell} py-8 md:py-12`}>
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
              <TutorLedCertificatePreview
                programTitle={tutorLedCertificate.programTitle}
                trainerName={tutorLedCertificate.trainerName}
                layout="full"
              />
              <div className="space-y-4">
                <div className={`${card} border-[#FFB800]/20 bg-gradient-to-br from-[#FFB800]/8 to-zinc-950/80`}>
                  <h3 className="text-lg font-bold text-white">What you earn after payment</h3>
                  <ul className="mt-3 space-y-2.5 text-sm text-zinc-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                      Live Zoom classroom for every session in your batch
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                      Recordings and materials in My Learning
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                      Printable certificate with verified credential ID
                    </li>
                  </ul>
                </div>
                {tutorLedCheckoutSlug && !enrolledLearning ? (
                  <button
                    type="button"
                    onClick={() => registerTutorLedFromTemplate(router, tutorLedCheckoutSlug)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500] sm:w-auto"
                  >
                    Reserve seat &amp; earn this certificate
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!useMarketingLayout && !isSelfPaced && tutorLedSchedule ? (
        <section className="border-b border-white/10 bg-zinc-950" id="syllabus">
          <div className={`${shell} py-8 md:py-10`}>
            <div className="mb-6 text-center lg:text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFB800]">Before you enroll</p>
              <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">Live training syllabus</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Review the full program by week or by day — every live session, lab, and recording slot.
              </p>
            </div>
            <div className={card}>
              <TutorLedCurriculumExplorer program={tutorLedSchedule} variant="marketing" />
            </div>
          </div>
        </section>
      ) : null}

      {/* Live classroom */}
      {(isSelfPaced || !useMarketingLayout) && (
      <section className="border-b border-white/10 bg-zinc-950">
        <div className={`${shell} py-8 md:py-10`}>
          <div
            className={`grid gap-6 ${
              !isSelfPaced && tutorLedSchedule
                ? "mx-auto max-w-2xl"
                : "lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_400px]"
            }`}
          >
            {(isSelfPaced || !tutorLedSchedule) && (
            <div className={card}>
              {isSelfPaced || !tutorLedSchedule ? (
                <>
              <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">
                {isSelfPaced ? (
                  <>
                    Course curriculum{" "}
                    <span className="text-sm font-normal text-zinc-500">(modules &amp; lessons)</span>
                  </>
                ) : (
                  <>
                    Live Training Schedule{" "}
                    <span className="text-sm font-normal text-zinc-500">(Detailed Curriculum)</span>
                  </>
                )}
              </h2>
              <div className="mt-4 flex gap-3">
                <div className="hidden w-40 shrink-0 space-y-2 md:block">
                  {course.curriculum.map((w, idx) => (
                    <div
                      key={w.week}
                      className={`rounded-xl border px-3 py-2.5 transition ${
                        idx === 0
                          ? "border-[#FFB800]/60 bg-[#FFB800]/12 shadow-[0_0_20px_rgba(255,184,0,0.12)]"
                          : "border-white/10 bg-black/20"
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#FFB800]">
                        {isSelfPaced ? `Mod ${w.week}` : `Week ${w.week}`}
                      </p>
                      <p className="text-[11px] text-zinc-400">{w.label}</p>
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30">
                  <table className="w-full min-w-[520px] text-left text-xs md:min-w-0">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-3">{isSelfPaced ? "Module" : "Week"}</th>
                        <th className="px-4 py-3">Topic</th>
                        <th className="px-4 py-3">Key Learning</th>
                        <th className="px-4 py-3 text-right">{isSelfPaced ? "Format" : "Session Type"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {course.curriculum.map((w) => (
                        <tr key={w.week} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                          <td className="px-4 py-3.5 align-top">
                            <span className="font-bold text-[#FFB800]">{isSelfPaced ? `Module ${w.week}` : `Week ${w.week}`}</span>
                          </td>
                          <td className="px-4 py-3.5 align-top text-zinc-200">{w.topic}</td>
                          <td className="px-4 py-3.5 align-top text-zinc-500">{w.keyLearning}</td>
                          <td className="px-4 py-3.5 align-top text-right">
                            <span className="inline-block rounded-full border border-[#FFB800]/25 bg-[#FFB800]/10 px-2.5 py-1 text-[10px] font-semibold text-[#FFB800]">
                              {w.sessionType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="border-t border-white/5 px-4 py-3 text-[10px] text-zinc-600">
                    {isSelfPaced
                      ? "* Titles reflect your learning path; your admin catalog is the source of truth."
                      : "* Schedule may change based on trainer availability and batch requirements."}
                  </p>
                </div>
              </div>
                </>
              ) : (
                <TutorLedCurriculumExplorer program={tutorLedSchedule} variant="marketing" />
              )}
              {!isSelfPaced && tutorLedSchedule ? (
                <p className="mt-3 text-[10px] text-zinc-600">
                  * Schedule may change based on trainer availability. Use Admin → Curriculum &amp; days for manual
                  day-by-day sessions.
                </p>
              ) : null}
            </div>
            )}

            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-white md:text-xl">
                {isSelfPaced ? "How learning works" : "Inside Live Classroom"}
              </h2>
              <div className={`${card} !p-0 overflow-hidden`}>
                <div className="relative border-b border-white/10">
                  <Image
                    src={classroomImageSrc}
                    alt={isSelfPaced ? "Self-paced learning" : "Live classroom session"}
                    width={800}
                    height={520}
                    className="h-auto w-full object-cover"
                  />
                </div>
                <div className="space-y-3 border-b border-white/5 bg-black/40 px-4 py-3">
                  {(isSelfPaced
                    ? [
                        { icon: PlayCircle, text: "HD video lessons — pause, rewind, and revisit" },
                        { icon: BookOpen, text: "Readings, notes, and downloads in each module" },
                        { icon: Smartphone, text: "Study on the device that fits your day" },
                      ]
                    : [
                        { icon: Monitor, text: "Instructor is sharing screen" },
                        { icon: MessageCircle, text: "Live chat and Q&A during sessions" },
                        { icon: Users, text: "Breakout rooms for group activities" },
                      ]
                  ).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-zinc-300">
                      <item.icon className="h-4 w-4 shrink-0 text-[#FFB800]" />
                      {item.text}
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-900/90 px-3 py-3">
                  <div className="mb-2 max-h-[140px] space-y-2 overflow-y-auto pr-1 text-[11px]">
                    {chatLines.map((m) => (
                      <div
                        key={m.user + m.text}
                        className={`flex gap-2 rounded-lg px-2 py-1.5 ${
                          m.tone === "amber" ? "bg-[#FFB800]/10 text-zinc-200" : "bg-white/[0.04] text-zinc-300"
                        }`}
                      >
                        <span className={`shrink-0 font-semibold ${m.tone === "amber" ? "text-[#FFB800]" : "text-zinc-500"}`}>
                          {m.user}:
                        </span>
                        <span>{m.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-zinc-500">
                    <span className="min-w-0 flex-1 truncate">Type a message…</span>
                    <Send className="h-3.5 w-3.5 shrink-0 text-[#FFB800]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      )}

      {/* Why choose — full width row */}
      {(isSelfPaced || !useMarketingLayout) && (
      <section className="border-b border-white/10 bg-black">
        <div className={`${shell} py-8 md:py-10`}>
          <h2 className="mb-6 text-center text-xl font-bold text-white md:text-2xl lg:text-left">
            {isSelfPaced ? "Why learners choose this format" : "Why Choose Tutor Led Training?"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
            {course.whyChoose.map((item, i) => (
              <div
                key={item.title}
                className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-zinc-950/70 px-3 py-4 text-center transition hover:border-[#FFB800]/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:px-4 sm:py-5"
              >
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#FFB800]/10">
                  <item.icon className="h-5 w-5 text-[#FFB800]" />
                </div>
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      )}

      {/* FAQ + CTA */}
      {(isSelfPaced || !useMarketingLayout) && (
      <section className="border-b border-white/10 bg-zinc-950">
        <div className={`${shell} grid gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] md:gap-8 md:py-10`}>
          <div>
            <h2 className="mb-4 text-xl font-bold text-white md:text-2xl">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {course.faqs.map((faq, i) => (
                <div
                  key={faq.q}
                  className="overflow-hidden rounded-xl border border-white/10 bg-black/30 transition hover:border-white/15"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium text-zinc-100"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-zinc-500 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === i ? <div className="border-t border-white/5 px-4 py-3 text-sm leading-relaxed text-zinc-400">{faq.a}</div> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="md:pt-2">
            <div className="rounded-2xl border border-[#FFB800]/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 text-center shadow-[0_0_40px_rgba(255,184,0,0.08)] md:sticky md:top-24">
              {!isSelfPaced && tutorLedCertificate ? (
                <div className="mb-5 border-b border-white/10 pb-5">
                  <TutorLedCertificatePreview
                    programTitle={tutorLedCertificate.programTitle}
                    trainerName={tutorLedCertificate.trainerName}
                    layout="compact"
                  />
                </div>
              ) : null}
              <h3 className="text-xl font-extrabold leading-tight text-white md:text-[1.5rem]">
                {isSelfPaced ? "Start this course today" : "Secure Your Spot in the Next Batch!"}
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                {isSelfPaced
                  ? "Enroll when you are ready and move through the material at your own pace."
                  : "Limited seats available for a personalized live learning experience."}
              </p>
              {isSelfPaced ? (
                <Link
                  href="/cart"
                  className="mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500] md:w-full"
                >
                  Enroll now <ChevronRight size={18} strokeWidth={2.5} />
                </Link>
              ) : enrolledLearning ? (
                <Link
                  href="/my-learning?tab=live"
                  className="mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500] md:w-full"
                >
                  Open Tutor Led dashboard <ChevronRight size={18} strokeWidth={2.5} />
                </Link>
              ) : tutorLedCheckoutSlug ? (
                <button
                  type="button"
                  onClick={() => registerTutorLedFromTemplate(router, tutorLedCheckoutSlug)}
                  className="mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500] md:w-full"
                >
                  Register for live course <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              ) : (
                <Link
                  href="/courses"
                  className="mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500] md:w-full"
                >
                  Browse live programs <ChevronRight size={18} strokeWidth={2.5} />
                </Link>
              )}
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Shield className="h-4 w-4 text-[#FFB800]" />
                7 Days Money-back Guarantee
              </p>
            </div>
          </div>
        </div>
      </section>
      )}
    </>
  );
}
