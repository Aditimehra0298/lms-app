"use client";

import Link from "next/link";
import {
  DEFAULT_TUTOR_LED_SLUG,
  liveTutorCourseHref,
  tutorLedLearnerLiveJoinHref,
} from "@/lib/tutor-led-routes";
import { TutorLedLearningToolsPanel } from "@/components/TutorLedLearningToolsPanel";
import {
  CalendarDays,
  Headphones,
  Play,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";

export type LiveEnrollmentRow = { slug: string; title: string };

const GOLD_GRADIENT = "bg-gradient-to-b from-[#fcd34d] via-[#f9b14d] to-[#eb9422]";
const GOLD_GLOW = "shadow-[0_0_28px_rgba(249,177,77,0.45)]";
const GOLD_TEXT_GRADIENT = "bg-gradient-to-r from-[#fde68a] via-[#f9b14d] to-[#fbbf24]";

export function MyLearningLiveHub({ enrollments }: { enrollments: LiveEnrollmentRow[] }) {
  const enrolledCount = enrollments.length;
  const primaryEnrollment = enrollments[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-400/45 bg-[#070a12] shadow-[0_0_60px_rgba(255,184,0,0.2)] ring-1 ring-amber-500/25">
      <div className="relative border-b border-amber-400/40 bg-gradient-to-br from-amber-950/55 via-[#141008] to-[#070a12] px-4 py-8 md:px-8 md:py-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#f9b14d]/45 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-amber-500/25 blur-[90px]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-400/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-50 shadow-[0_0_20px_rgba(249,177,77,0.3)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f9b14d] opacity-80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#fcd34d] shadow-[0_0_8px_rgba(249,177,77,0.9)]" />
              </span>
              Live learning hub
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              Your live courses &{" "}
              <span
                className={`${GOLD_TEXT_GRADIENT} bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(249,177,77,0.5)]`}
              >
                tutor-led sessions
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
              Open your program hub to join live on Zoom — always through your LMS classroom.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              href="/my-learning/calendar"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <CalendarDays className="h-4 w-4 text-gray-300" aria-hidden />
              Schedule
            </Link>
            <Link
              href={
                primaryEnrollment
                  ? tutorLedLearnerLiveJoinHref(primaryEnrollment.slug)
                  : liveTutorCourseHref()
              }
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110 ${GOLD_GRADIENT} ${GOLD_GLOW}`}
            >
              <Zap className="h-4 w-4" aria-hidden />
              {primaryEnrollment ? "Join my program" : "Browse programs"}
            </Link>
          </div>
        </div>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: Users,
              value: enrolledCount ? String(enrolledCount) : "0",
              label: "Active enrollments",
              hint: enrolledCount ? "Ready to join" : "Enroll to unlock",
              accent:
                "border-amber-300/60 bg-amber-400/25 shadow-[0_0_28px_rgba(249,177,77,0.28)] ring-1 ring-amber-300/40",
              iconBg: "bg-amber-400/40 text-amber-50 shadow-[0_0_14px_rgba(249,177,77,0.35)]",
            },
            {
              icon: Video,
              value: enrolledCount ? "Open" : "—",
              label: "Live classroom",
              hint: enrolledCount ? "Zoom in program hub" : "No program yet",
              accent: "border-amber-300/45 bg-amber-400/15 shadow-[0_0_16px_rgba(249,177,77,0.12)]",
              iconBg: "bg-amber-400/30 text-amber-50",
            },
          ].map((card) => (
            <div key={card.label} className={`flex items-start gap-3 rounded-xl border p-4 ${card.accent}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                <card.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-xs font-semibold text-gray-100">{card.label}</p>
                <p className="text-[11px] text-gray-500">{card.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1.65fr_1fr] xl:gap-8 xl:p-8">
        <div className="min-w-0 space-y-6">
          {enrollments.length > 0 ? (
            <div className="rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-400/20 via-black/25 to-transparent p-1 shadow-[0_0_32px_rgba(249,177,77,0.18)]">
              <div className="rounded-[14px] border border-amber-300/15 bg-black/45 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">Your programs</p>
                    <h2 className="mt-1 text-lg font-bold text-white md:text-xl">Active tutor-led enrollments</h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/35">
                    {enrolledCount} enrolled
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {enrollments.map((c) => (
                    <li
                      key={c.slug}
                      className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-amber-300/60 hover:shadow-[0_0_20px_rgba(249,177,77,0.15)]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/30 text-amber-50 ring-1 ring-amber-300/55 shadow-[0_0_16px_rgba(249,177,77,0.35)]">
                            <Headphones className="h-7 w-7" aria-hidden />
                          </span>
                          <div>
                            <p className="font-semibold text-white">{c.title}</p>
                            <p className="text-xs text-gray-500">Zoom & recordings in program hub</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={tutorLedLearnerLiveJoinHref(c.slug)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-black hover:brightness-110 ${GOLD_GRADIENT} ${GOLD_GLOW}`}
                          >
                            <Play className="h-3.5 w-3.5 fill-black" aria-hidden />
                            Join live
                          </Link>
                          <Link
                            href={`/my-learning/course/${encodeURIComponent(c.slug)}`}
                            className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10"
                          >
                            Program hub
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center">
              <Video className="mx-auto h-10 w-10 text-gray-600" aria-hidden />
              <h2 className="mt-3 text-lg font-bold text-white">No live enrollments yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                Register for tutor-led training to unlock one-click join. Session times appear when your
                instructor publishes the schedule.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Link
                  href={liveTutorCourseHref()}
                  className={`rounded-lg px-4 py-2 text-sm font-bold text-black hover:brightness-110 ${GOLD_GRADIENT} ${GOLD_GLOW}`}
                >
                  View programs
                </Link>
                <Link
                  href="/courses"
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200"
                >
                  Browse courses
                </Link>
              </div>
            </div>
          )}
          {enrolledCount > 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-gray-400">
              Upcoming live sessions from your program schedule will appear here when published by your
              instructor.
            </p>
          ) : null}
        </div>
        <aside className="space-y-4">
          <TutorLedLearningToolsPanel
            programSlug={primaryEnrollment?.slug ?? DEFAULT_TUTOR_LED_SLUG}
            compact
          />
          <article className="rounded-2xl border border-amber-400/35 bg-gradient-to-b from-amber-500/15 to-black/40 p-4 shadow-[0_0_20px_rgba(249,177,77,0.1)]">
            <h3 className="flex items-center gap-2 font-semibold text-amber-50">
              <Sparkles className="h-4 w-4 text-[#fcd34d] drop-shadow-[0_0_10px_rgba(249,177,77,0.9)]" aria-hidden />
              Before you join
            </h3>
            <ul className="mt-2 space-y-2 text-xs text-gray-400">
              <li>Join Zoom 5–10 minutes early.</li>
              <li>Recordings appear in your program hub.</li>
              <li>Use the same email as your SF Trainings account.</li>
            </ul>
          </article>
        </aside>
      </div>
    </section>
  );
}
