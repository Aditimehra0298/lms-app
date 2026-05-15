"use client";

import Link from "next/link";
import { liveTutorCourseHref } from "@/lib/tutor-led-routes";
import {
  ArrowRight,
  CalendarDays,
  CircleDot,
  Clock3,
  Headphones,
  Radio,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

export type LiveEnrollmentRow = { slug: string; title: string };

const UPCOMING_LIVE_SESSIONS = [
  {
    title: "Cyber Security Fundamentals",
    day: "Today",
    time: "10:00 AM – 11:30 AM",
    duration: "1h 30m",
    level: "Beginner" as const,
    cta: "Join Now",
    eta: "Starts in 02h 15m",
    tone: "violet" as const,
    href: "/my-learning/calendar",
    live: true,
  },
  {
    title: "Digital Forensics & Incident Response",
    day: "Tomorrow",
    time: "02:00 PM – 03:30 PM",
    duration: "1h 30m",
    level: "Intermediate" as const,
    cta: "Join Now",
    eta: "Starts in 1 day",
    tone: "violet" as const,
    href: "/my-learning/calendar",
    live: false,
  },
  {
    title: "Ethical Hacking Workshop",
    day: "May 25, 2026",
    time: "11:00 AM – 02:00 PM",
    duration: "3h",
    level: "Advanced" as const,
    cta: "Register",
    eta: "Starts in 2 days",
    tone: "emerald" as const,
    href: liveTutorCourseHref(),
    live: false,
  },
  {
    title: "Cloud Security Architecture",
    day: "May 26, 2026",
    time: "04:00 PM – 05:30 PM",
    duration: "1h 30m",
    level: "Intermediate" as const,
    cta: "Join Now",
    eta: "Starts in 3 days",
    tone: "violet" as const,
    href: "/my-learning/calendar",
    live: false,
  },
  {
    title: "SOC Analyst Bootcamp",
    day: "May 27, 2026",
    time: "10:00 AM – 01:00 PM",
    duration: "3h",
    level: "Beginner" as const,
    cta: "Register",
    eta: "Starts in 4 days",
    tone: "emerald" as const,
    href: liveTutorCourseHref(),
    live: false,
  },
] as const;

function levelBadgeClass(level: string) {
  if (level === "Advanced") return "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/30";
  if (level === "Beginner") return "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/25";
  return "bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/25";
}

export function MyLearningLiveHub({ enrollments }: { enrollments: LiveEnrollmentRow[] }) {
  const enrolledCount = enrollments.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#070a12] shadow-[0_0_40px_rgba(0,0,0,0.45)]">
      {/* Hero */}
      <div className="relative border-b border-white/10 bg-gradient-to-br from-violet-950/80 via-[#0a0f1f] to-[#070a12] px-4 py-8 md:px-8 md:py-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-violet-600/20 blur-[90px]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/95">
              <Radio className="h-3.5 w-3.5 text-amber-300" aria-hidden />
              Live learning hub
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.65rem] lg:leading-tight">
              Your live courses &{" "}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-300 bg-clip-text text-transparent">
                tutor-led sessions
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
              Join Zoom sessions on time, follow your cohort schedule, and open your program hub for materials — all
              in one place after you sign in.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              href="/my-learning/calendar"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-amber-400/40 hover:bg-amber-500/10"
            >
              <CalendarDays className="h-4 w-4 text-amber-300" aria-hidden />
              Full calendar
            </Link>
            <Link
              href="/courses/category/cyber-security"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition hover:from-amber-200 hover:to-amber-400"
            >
              Browse live programs
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Video,
              value: "5",
              label: "Sessions in view",
              hint: "Filter below by day",
              border: "border-violet-400/20 bg-violet-500/10",
            },
            {
              icon: Users,
              value: enrolledCount ? String(enrolledCount) : "—",
              label: "Your enrollments",
              hint: enrolledCount ? "Paid tutor-led" : "Enroll to see here",
              border: "border-amber-400/25 bg-amber-500/10",
            },
            {
              icon: Sparkles,
              value: "Zoom",
              label: "Live platform",
              hint: "Join link in each program",
              border: "border-emerald-400/20 bg-emerald-500/10",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`flex items-start gap-3 rounded-xl border ${card.border} p-4 backdrop-blur-sm`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/30 text-amber-200">
                <card.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-xs font-semibold text-gray-200">{card.label}</p>
                <p className="text-[11px] text-gray-500">{card.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1.65fr_1fr] xl:gap-8 xl:p-8">
        <div className="min-w-0 space-y-6">
          {/* Your enrollments */}
          {enrollments.length > 0 ? (
            <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-black/20 to-transparent p-1">
              <div className="rounded-[14px] border border-white/5 bg-black/40 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">Your programs</p>
                    <h2 className="mt-1 text-lg font-bold text-white md:text-xl">Active tutor-led enrollments</h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                    Enrolled
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {enrollments.map((c) => (
                    <li
                      key={c.slug}
                      className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-amber-400/25 hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30">
                          <Headphones className="h-6 w-6" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{c.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500">Cohort materials & join links live in program</p>
                          <div className="mt-2 h-1 max-w-xs overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-400 to-orange-400" />
                          </div>
                          <p className="mt-1 text-[10px] text-gray-500">Progress updates when sessions complete</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                        <Link
                          href={`/my-learning/course/${encodeURIComponent(c.slug)}`}
                          className="inline-flex items-center justify-center rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-black transition hover:bg-amber-300"
                        >
                          Open program
                        </Link>
                        <Link
                          href="/my-learning/calendar"
                          className="inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/10"
                        >
                          Calendar
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-8 text-center md:px-8">
              <Video className="mx-auto h-10 w-10 text-gray-600" aria-hidden />
              <h2 className="mt-3 text-lg font-bold text-white">No live enrollments yet</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray-400">
                After you register and complete checkout for a tutor-led program, it appears here with quick links to
                your cohort and calendar.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link
                  href={liveTutorCourseHref()}
                  className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-black hover:bg-amber-300"
                >
                  View live program
                </Link>
                <Link
                  href="/courses/category/cyber-security"
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/5"
                >
                  Explore courses
                </Link>
              </div>
            </div>
          )}

          {/* Category chips */}
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-xl border border-violet-400/20 bg-violet-500/[0.08] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-white">Tutor-led trainings</p>
                <span className="shrink-0 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-100">
                  4 upcoming
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                Scheduled live classes with Q&amp;A, polls, and breakout rooms.
              </p>
            </article>
            <article className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-white">Workshops</p>
                <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100">
                  3 upcoming
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                Intensive hands-on blocks — ideal for skills you need this week.
              </p>
            </article>
          </div>

          {/* Session list */}
          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white md:text-xl">Upcoming live sessions</h2>
                <p className="text-xs text-gray-500">Demo schedule — your real sessions follow your program dates.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {["All", "Today", "Tomorrow", "This week"].map((f, idx) => (
                  <button
                    key={f}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      idx === 0
                        ? "bg-amber-500/25 text-amber-100 ring-1 ring-amber-400/40"
                        : "border border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {UPCOMING_LIVE_SESSIONS.map((row) => (
                <article
                  key={row.title}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-black/50 to-black/25 transition hover:border-white/20"
                >
                  <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-5 md:p-5">
                    <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-900/40 to-black md:h-20 md:w-28">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="h-8 w-8 text-white/25" aria-hidden />
                      </div>
                      {row.live ? (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                            <CircleDot className="relative h-2 w-2 text-white" aria-hidden />
                          </span>
                          Live soon
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-white md:text-lg">{row.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${levelBadgeClass(row.level)}`}>
                          {row.level}
                        </span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                          {row.day}
                        </span>
                        <span className="text-gray-600">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                          {row.time}
                        </span>
                        <span className="text-gray-600">·</span>
                        <span>{row.duration}</span>
                      </p>
                      <p className="mt-2 text-[11px] text-gray-500">Zoom · Join from program page when unlocked</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                      <Link
                        href={row.href}
                        className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-center text-xs font-bold transition md:min-w-[120px] ${
                          row.tone === "emerald"
                            ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/35 hover:bg-emerald-500/30"
                            : "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/35 hover:bg-amber-500/30"
                        }`}
                      >
                        {row.cta}
                      </Link>
                      <p className="text-center text-[11px] text-gray-500 sm:text-right">{row.eta}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <article className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Your time zone</p>
            <p className="mt-1 text-sm font-semibold text-white">India Standard Time (IST)</p>
            <p className="text-xs text-gray-500">UTC+05:30 · Session times follow this zone unless noted</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <h3 className="font-semibold text-white">Session overview</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["4", "Tutor-led upcoming", "violet"],
                ["3", "Workshops", "emerald"],
                ["12", "Hours this week", "blue"],
                ["8", "Sessions this month", "amber"],
              ].map(([v, l, tone]) => (
                <div
                  key={l}
                  className={`rounded-xl border p-3 ${
                    tone === "emerald"
                      ? "border-emerald-400/20 bg-emerald-500/10"
                      : tone === "amber"
                        ? "border-amber-400/20 bg-amber-500/10"
                        : tone === "blue"
                          ? "border-blue-400/20 bg-blue-500/10"
                          : "border-violet-400/20 bg-violet-500/10"
                  }`}
                >
                  <p className="text-xl font-bold text-white">{v}</p>
                  <p className="text-[10px] leading-snug text-gray-400">{l}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-white">Today&apos;s focus</h3>
              <Link href="/my-learning/calendar" className="text-xs font-medium text-amber-300 hover:text-amber-200">
                Calendar →
              </Link>
            </div>
            <ul className="space-y-2">
              {[
                ["10:00 AM", "Cyber Security Fundamentals"],
                ["04:00 PM", "Malware Analysis Workshop"],
              ].map(([t, n]) => (
                <li
                  key={n}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5"
                >
                  <div>
                    <p className="text-[11px] text-gray-500">{t}</p>
                    <p className="text-sm text-gray-100">{n}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-200"
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-violet-950/40 to-black/40 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <Sparkles className="h-4 w-4 text-amber-300" aria-hidden />
              Before you join
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-400">
              <li className="flex gap-2">
                <span className="text-amber-400/90">·</span>
                Join Zoom 5–10 minutes early; host may lock the room at start.
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400/90">·</span>
                Recordings appear in your program hub after each live block.
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400/90">·</span>
                Use the same email as your SF Trainings account for attendance.
              </li>
            </ul>
          </article>
        </aside>
      </div>
    </section>
  );
}
