"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DEFAULT_TUTOR_LED_SLUG,
  liveTutorCourseHref,
  tutorLedLearnerLiveJoinHref,
} from "@/lib/tutor-led-routes";
import { TutorLedLearningToolsPanel } from "@/components/TutorLedLearningToolsPanel";
import {
  ArrowRight,
  CalendarDays,
  CircleDot,
  Clock3,
  Headphones,
  Play,
  Sparkles,
  Users,
  Video,
  Zap,
} from "lucide-react";

export type LiveEnrollmentRow = { slug: string; title: string };

type SessionFilter = "all" | "today" | "tomorrow" | "week";
type SessionLevel = "Beginner" | "Intermediate" | "Advanced";

type LiveSession = {
  title: string;
  day: string;
  time: string;
  duration: string;
  level: SessionLevel;
  cta: "Join Now" | "Register";
  eta: string;
  tone: "violet" | "emerald";
  programSlug: string;
  live: boolean;
  when: SessionFilter;


};

const UPCOMING_LIVE_SESSIONS: LiveSession[] = [
  {
    title: "Cyber Security Fundamentals",
    day: "Today",
    time: "10:00 AM – 11:30 AM",
    duration: "1h 30m",
    level: "Beginner",
    cta: "Join Now",
    eta: "Starts in 02h 15m",
    tone: "violet",
    programSlug: DEFAULT_TUTOR_LED_SLUG,
    live: true,
    when: "today",
  },
  {
    title: "Digital Forensics & Incident Response",
    day: "Tomorrow",
    time: "02:00 PM – 03:30 PM",
    duration: "1h 30m",
    level: "Intermediate",
    cta: "Join Now",
    eta: "Starts in 1 day",
    tone: "violet",
    programSlug: DEFAULT_TUTOR_LED_SLUG,
    live: false,
    when: "tomorrow",
  },
  {
    title: "Ethical Hacking Workshop",
    day: "May 25, 2026",
    time: "11:00 AM – 02:00 PM",
    duration: "3h",
    level: "Advanced",
    cta: "Register",
    eta: "Starts in 2 days",
    tone: "emerald",
    programSlug: DEFAULT_TUTOR_LED_SLUG,
    live: false,
    when: "week",
  },
  {
    title: "Cloud Security Architecture",
    day: "May 26, 2026",
    time: "04:00 PM – 05:30 PM",
    duration: "1h 30m",
    level: "Intermediate",
    cta: "Join Now",
    eta: "Starts in 3 days",
    tone: "violet",
    programSlug: DEFAULT_TUTOR_LED_SLUG,
    live: false,
    when: "week",
  },
  {
    title: "SOC Analyst Bootcamp",
    day: "May 27, 2026",
    time: "10:00 AM – 01:00 PM",
    duration: "3h",
    level: "Beginner",
    cta: "Register",
    eta: "Starts in 4 days",
    tone: "emerald",
    programSlug: DEFAULT_TUTOR_LED_SLUG,
    live: false,
    when: "week",
  },
];

const FILTERS: { id: SessionFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This week" },
];

function sessionJoinHref(programSlug: string, enrollments: LiveEnrollmentRow[], cta: string) {
  if (cta === "Register") return liveTutorCourseHref(programSlug);
  const enrolled = enrollments.find((e) => e.slug === programSlug);
  if (enrolled) return tutorLedLearnerLiveJoinHref(enrolled.slug);
  if (enrollments.length > 0) return tutorLedLearnerLiveJoinHref(enrollments[0].slug);
  return tutorLedLearnerLiveJoinHref(programSlug);
}

const GOLD_GRADIENT = "bg-gradient-to-b from-[#fcd34d] via-[#f9b14d] to-[#eb9422]";
const GOLD_GLOW = "shadow-[0_0_28px_rgba(249,177,77,0.45)]";
const GOLD_TEXT_GRADIENT = "bg-gradient-to-r from-[#fde68a] via-[#f9b14d] to-[#fbbf24]";

function levelBadgeClass(level: SessionLevel) {
  if (level === "Advanced") return "bg-amber-400/30 text-amber-50 ring-1 ring-amber-300/60 shadow-[0_0_12px_rgba(249,177,77,0.25)]";
  if (level === "Beginner") return "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/25";
  return "bg-blue-500/20 text-blue-100 ring-1 ring-blue-400/25";
}

function matchesFilter(session: LiveSession, filter: SessionFilter) {
  if (filter === "all") return true;
  if (filter === "today") return session.when === "today";
  if (filter === "tomorrow") return session.when === "tomorrow";
  return session.when === "week" || session.when === "today" || session.when === "tomorrow";
}

function SessionCta({
  row,
  enrollments,
  size = "md",
}: {
  row: LiveSession;
  enrollments: LiveEnrollmentRow[];
  size?: "md" | "lg";
}) {
  const href = sessionJoinHref(row.programSlug, enrollments, row.cta);
  const isJoin = row.cta === "Join Now";
  const enrolled =
    enrollments.some((e) => e.slug === row.programSlug) || enrollments.length > 0;

  const base =
    size === "lg"
      ? "inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition"
      : "inline-flex min-w-[120px] items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition md:min-w-[130px]";

  if (isJoin) {
    return (
      <Link
        href={href}
        className={`${base} ${GOLD_GRADIENT} text-black ${GOLD_GLOW} hover:brightness-110 hover:shadow-[0_0_36px_rgba(249,177,77,0.55)]`}
      >
        <Play className="h-3.5 w-3.5 fill-black" aria-hidden />
        {enrolled ? "Join live" : row.cta}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`${base} border border-emerald-400/35 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25`}
    >
      {row.cta}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

export function MyLearningLiveHub({ enrollments }: { enrollments: LiveEnrollmentRow[] }) {
  const [filter, setFilter] = useState<SessionFilter>("all");
  const enrolledCount = enrollments.length;
  const primaryEnrollment = enrollments[0];

  const filteredSessions = useMemo(
    () => UPCOMING_LIVE_SESSIONS.filter((s) => matchesFilter(s, filter)),
    [filter],
  );

  const nextLive = useMemo(
    () => UPCOMING_LIVE_SESSIONS.find((s) => s.live || s.when === "today") ?? UPCOMING_LIVE_SESSIONS[0],
    [],
  );

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
              <span className={`${GOLD_TEXT_GRADIENT} bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(249,177,77,0.5)]`}>
                tutor-led sessions
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
              Open your program hub to join live on Zoom — always through your LMS classroom.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href="/my-learning/calendar" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              <CalendarDays className="h-4 w-4 text-gray-300" aria-hidden />
              Schedule
            </Link>
            <Link href={primaryEnrollment ? tutorLedLearnerLiveJoinHref(primaryEnrollment.slug) : liveTutorCourseHref()} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-110 ${GOLD_GRADIENT} ${GOLD_GLOW}`}>
              <Zap className="h-4 w-4" aria-hidden />
              {primaryEnrollment ? "Join my program" : "Browse programs"}
            </Link>
          </div>
        </div>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Video, value: String(filteredSessions.length), label: filter === "all" ? "Sessions listed" : "In this filter", hint: "Use chips below", accent: "border-amber-300/45 bg-amber-400/15 shadow-[0_0_16px_rgba(249,177,77,0.12)]", iconBg: "bg-amber-400/30 text-amber-50" },
            { icon: Users, value: enrolledCount ? String(enrolledCount) : "0", label: "Active enrollments", hint: enrolledCount ? "Ready to join" : "Enroll to unlock", accent: "border-amber-300/60 bg-amber-400/25 shadow-[0_0_28px_rgba(249,177,77,0.28)] ring-1 ring-amber-300/40", iconBg: "bg-amber-400/40 text-amber-50 shadow-[0_0_14px_rgba(249,177,77,0.35)]" },
            { icon: Sparkles, value: nextLive.live ? "Now" : "Soon", label: "Next live block", hint: nextLive.eta, accent: "border-amber-300/45 bg-amber-400/15 shadow-[0_0_16px_rgba(249,177,77,0.12)]", iconBg: "bg-amber-400/30 text-amber-50" },
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
          <div className="relative overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-400/25 via-violet-950/40 to-[#0a0f1f] p-1 shadow-[0_0_40px_rgba(249,177,77,0.22)]">
            <div className="relative rounded-[14px] border border-amber-300/20 bg-black/50 p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#fcd34d] drop-shadow-[0_0_10px_rgba(249,177,77,0.5)]">
                    {nextLive.live ? <><CircleDot className="h-3.5 w-3.5 text-red-400" aria-hidden /> Starting soon</> : "Next up"}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white md:text-2xl">{nextLive.title}</h2>
                  <p className="mt-1 text-sm text-gray-400">{nextLive.day} · {nextLive.time}</p>
                  <p className="mt-2 text-xs font-semibold text-amber-100">{nextLive.eta}</p>
                </div>
                <SessionCta row={nextLive} enrollments={enrollments} size="lg" />
              </div>
            </div>
          </div>
          {enrollments.length > 0 ? (
            <div className="rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-400/20 via-black/25 to-transparent p-1 shadow-[0_0_32px_rgba(249,177,77,0.18)]">
              <div className="rounded-[14px] border border-amber-300/15 bg-black/45 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">Your programs</p>
                    <h2 className="mt-1 text-lg font-bold text-white md:text-xl">Active tutor-led enrollments</h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/35">{enrolledCount} enrolled</span>
                </div>
                <ul className="mt-4 space-y-3">
                  {enrollments.map((c, i) => (
                    <li key={c.slug} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-amber-300/60 hover:shadow-[0_0_20px_rgba(249,177,77,0.15)]">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/30 text-amber-50 ring-1 ring-amber-300/55 shadow-[0_0_16px_rgba(249,177,77,0.35)]"><Headphones className="h-7 w-7" aria-hidden /></span>
                          <div>
                            <p className="font-semibold text-white">{c.title}</p>
                            <p className="text-xs text-gray-500">Zoom & recordings in program hub</p>
                            <div className="mt-3 h-1.5 max-w-xs rounded-full bg-white/10"><div className={`h-full rounded-full ${GOLD_GRADIENT} shadow-[0_0_10px_rgba(249,177,77,0.6)]`} style={{ width: `${Math.min(100, 25 + i * 20)}%` }} /></div>
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
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">Register for tutor-led training to unlock one-click join.</p>
              <div className="mt-5 flex justify-center gap-2">
                <Link href={liveTutorCourseHref()} className={`rounded-lg px-4 py-2 text-sm font-bold text-black hover:brightness-110 ${GOLD_GRADIENT} ${GOLD_GLOW}`}>View program</Link>
                <Link href="/courses/category/cyber-security" className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-200">Explore</Link>
              </div>
            </div>
          )}
          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Upcoming live sessions</h2>
                <p className="text-xs text-gray-500">{filteredSessions.length} shown</p>
              </div>
              <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
                {FILTERS.map((f) => (
                  <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === f.id ? `${GOLD_GRADIENT} text-black ${GOLD_GLOW}` : "text-gray-400 hover:text-amber-100"}`}>{f.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {filteredSessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/15 py-8 text-center text-sm text-gray-400">No sessions — <button type="button" className="font-semibold text-[#fcd34d] hover:text-amber-200" onClick={() => setFilter("all")}>show all</button></p>
              ) : filteredSessions.map((row) => (
                <article key={row.title} className={`rounded-2xl border bg-black/40 p-4 transition hover:-translate-y-0.5 hover:border-amber-300/50 hover:shadow-[0_0_20px_rgba(249,177,77,0.15)] md:p-5 ${row.live ? "border-amber-300/65 shadow-[0_0_28px_rgba(249,177,77,0.22)] ring-1 ring-amber-300/30" : "border-white/10"}`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{row.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${levelBadgeClass(row.level)}`}>{row.level}</span>
                        {row.live ? <span className="text-[10px] font-bold uppercase text-red-400">Live</span> : null}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{row.day} · {row.time} · {row.duration}</p>
                    </div>
                    <SessionCta row={row} enrollments={enrollments} />
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-amber-100">{row.eta}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          <TutorLedLearningToolsPanel
            programSlug={primaryEnrollment?.slug ?? DEFAULT_TUTOR_LED_SLUG}
            compact
          />

          <article className="rounded-2xl border border-amber-400/35 bg-amber-950/20 p-4 shadow-[0_0_20px_rgba(249,177,77,0.1)]">
            <h3 className="font-semibold text-amber-50">Today&apos;s focus</h3>
            <ul className="mt-3 space-y-2">
              {UPCOMING_LIVE_SESSIONS.filter((s) => s.when === "today").map((session) => (
                <li key={session.title} className="flex items-center justify-between rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2">
                  <div><p className="text-[11px] text-amber-200/70">{session.time.split("–")[0]}</p><p className="text-sm text-white">{session.title}</p></div>
                  <Link href={sessionJoinHref(session.programSlug, enrollments, session.cta)} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold text-black ${GOLD_GRADIENT} ${GOLD_GLOW}`}>Join</Link>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-amber-400/35 bg-gradient-to-b from-amber-500/15 to-black/40 p-4 shadow-[0_0_20px_rgba(249,177,77,0.1)]">
            <h3 className="flex items-center gap-2 font-semibold text-amber-50"><Sparkles className="h-4 w-4 text-[#fcd34d] drop-shadow-[0_0_10px_rgba(249,177,77,0.9)]" aria-hidden />Before you join</h3>
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