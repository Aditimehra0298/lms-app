"use client";

import Image from "next/image";
import Link from "next/link";
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
};

type Props = {
  course: PostHeroCourse;
  openFaq: number | null;
  setOpenFaq: (index: number | null) => void;
  highlightsImageSrc?: string;
  classroomImageSrc?: string;
  /** Marketing copy labels for catalog (self-paced) vs live tutor pages. */
  variant?: "tutor-led" | "self-paced";
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

export default function TutorLedPostHeroSections({
  course,
  openFaq,
  setOpenFaq,
  highlightsImageSrc = "/h2.png",
  classroomImageSrc = "/h3.png",
  variant = "tutor-led",
}: Props) {
  const isSelfPaced = variant === "self-paced";
  const chatLines = isSelfPaced ? chatPreviewSelfPaced : chatPreviewTutorLed;
  return (
    <>
      {/* Meet trainer + highlights */}
      <section className="border-b border-white/10 bg-black">
        <div className={`${shell} py-8 md:py-10`}>
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
            <div className={card}>
              <h2 className="mb-4 text-lg font-bold tracking-tight text-white md:text-xl">
                {isSelfPaced ? "Meet Your Instructor" : "Meet Your Trainer"}
              </h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-[#FFB800]/45 bg-gradient-to-br from-zinc-900 to-zinc-950 sm:mx-0">
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[#FFB800]">
                    {course.trainer.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-blue-600 ring-2 ring-black">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold text-white">{course.trainer.name}</h3>
                  <p className="text-sm text-[#FFB800]/90">{course.trainer.role}</p>
                  <p className="text-xs text-zinc-500">{course.trainer.experience}</p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{course.trainer.bio}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
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
                <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start sm:gap-5">
                  {course.trainer.workedWith.map((w) => (
                    <span key={w} className="text-sm font-bold tracking-wide text-zinc-500">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={card}>
              <h2 className="mb-4 text-lg font-bold tracking-tight text-white md:text-xl">
                {isSelfPaced ? "What you will get" : "Live Training Highlights"}
              </h2>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(200px,44%)] lg:items-start lg:gap-6">
                <ul className="space-y-2.5">
                  {course.highlights.map((h, i) => {
                    const Hi = highlightIcons[i % highlightIcons.length];
                    return (
                      <li key={i} className="flex gap-3 text-sm leading-snug text-zinc-200">
                        <Hi className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB800]" aria-hidden />
                        <span>{h}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#FFB800]/12 via-zinc-900 to-zinc-950">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,184,0,0.22),transparent_45%),radial-gradient(circle_at_30%_80%,rgba(59,130,246,0.08),transparent_40%)]" />
                  <div className="relative flex min-h-[160px] items-center justify-center p-4 sm:min-h-[180px]">
                    <div className="relative aspect-square w-[min(100%,200px)]">
                      <Image
                        src={highlightsImageSrc}
                        alt="Training security highlight"
                        fill
                        className="object-contain drop-shadow-[0_0_28px_rgba(255,184,0,0.35)]"
                        sizes="(max-width: 1024px) 100vw, 320px"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curriculum + classroom */}
      <section className="border-b border-white/10 bg-zinc-950">
        <div className={`${shell} py-8 md:py-10`}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className={card}>
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
            </div>

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

      {/* Why choose — full width row */}
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

      {/* FAQ + CTA */}
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
              <h3 className="text-xl font-extrabold leading-tight text-white md:text-[1.5rem]">
                {isSelfPaced ? "Start this course today" : "Secure Your Spot in the Next Batch!"}
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                {isSelfPaced
                  ? "Enroll when you are ready and move through the material at your own pace."
                  : "Limited seats available for a personalized live learning experience."}
              </p>
              <Link
                href="/cart"
                className="mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_10px_30px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500] md:w-full"
              >
                {isSelfPaced ? (
                  <>
                    Enroll now <ChevronRight size={18} strokeWidth={2.5} />
                  </>
                ) : (
                  <>
                    Reserve Your Seat Now <ChevronRight size={18} strokeWidth={2.5} />
                  </>
                )}
              </Link>
              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Shield className="h-4 w-4 text-[#FFB800]" />
                7 Days Money-back Guarantee
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
