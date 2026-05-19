"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { TutorLedLearningToolsPanel } from "@/components/TutorLedLearningToolsPanel";
import { resolveZoomJoinUrl } from "@/lib/zoom-meeting";
import { TutorLedZoomJoinCard } from "@/components/TutorLedZoomJoinCard";
import { tutorLedEnrolledPrice, tutorLedLearnerBannerSrc } from "@/lib/tutor-led-program-map";
import { TutorLedCurriculumExplorer } from "@/components/TutorLedCurriculumExplorer";
import {
  Calendar,
  Clock,
  Download,
  FileText,
  HelpCircle,
  Megaphone,
  Play,
  Video,
} from "lucide-react";

type Props = { program: TutorLedProgramStored };

function useCountdown(initial: { hours: number; mins: number; secs: number }) {
  const [time, setTime] = useState(initial);
  useEffect(() => {
    setTime(initial);
  }, [initial.hours, initial.mins, initial.secs]);

  useEffect(() => {
    const t = setInterval(() => {
      setTime((p) => {
        let { hours, mins, secs } = p;
        secs--;
        if (secs < 0) {
          secs = 59;
          mins--;
        }
        if (mins < 0) {
          mins = 59;
          hours--;
        }
        if (hours < 0) return { hours: 0, mins: 0, secs: 0 };
        return { hours, mins, secs };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [initial.hours, initial.mins, initial.secs]);

  return time;
}

function formatRecordingDuration(minutes?: number): string {
  if (minutes == null || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:00`;
  return `${m} min`;
}

const DEMO_RESOURCES = [
  { name: "Course Guide.pdf", size: "2.4 MB" },
  { name: "Lab Manual.pdf", size: "3.1 MB" },
  { name: "Cheat Sheet.pdf", size: "1.8 MB" },
  { name: "Tools List.pdf", size: "1.2 MB" },
];

const DEMO_ANNOUNCEMENTS = [
  { text: "Live session on 28 May at 7 PM IST — join 10 minutes early.", ago: "2h ago" },
  { text: "Please complete pre-reading for Week 2 before Saturday.", ago: "1d ago" },
  { text: "Lab access updated for Week 1 participants.", ago: "3d ago" },
];

export default function TutorLedLearnerDashboard({ program }: Props) {
  const cd = useCountdown({
    hours: program.countdown.hours,
    mins: program.countdown.mins,
    secs: program.countdown.secs,
  });

  const weeks = program.curriculum;

  const weekProgress = useMemo(
    () =>
      weeks.map((_, i) => {
        if (i === 0) return { done: 5, total: 5, label: "Completed" as const };
        if (i === 1) return { done: 3, total: 5, label: null };
        return { done: 0, total: 5, label: null };
      }),
    [weeks],
  );

  const nextSessionTitle =
    weeks[1]?.topic ?? "Advanced Threat Detection Techniques";

  const learnerBanner = program.learnerHeroSrc?.trim() || program.heroSrc || "/h2.png";
  const enrolledPrice = program.priceAfterPayment ?? program.price;
  const zoomJoinUrl = resolveZoomJoinUrl(program);
  const sessionRecordings = useMemo(() => {
    const fromZoom = program.zoomRecordings ?? [];
    if (fromZoom.length === 0) return [];
    return fromZoom.map((rec, i) => ({
      title: rec.topic || `Session ${i + 1}`,
      duration: formatRecordingDuration(rec.durationMinutes),
      thumb: program.learnerHeroSrc?.trim() || program.heroSrc || `/h${(i % 3) + 1}.png`,
      playUrl: rec.playUrl,
      downloadUrl: rec.downloadUrl,
    }));
  }, [program.zoomRecordings, program.heroSrc, program.learnerHeroSrc]);
  const scrollToZoomJoin = () => {
    document.getElementById("zoom-live")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    if (window.location.hash !== "#zoom-live") return;
    const t = window.setTimeout(scrollToZoomJoin, 150);
    return () => window.clearTimeout(t);
  }, [program.slug]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-4 py-6 md:px-6 xl:px-8">
        <section className="mb-6 overflow-hidden rounded-2xl border border-white/10">
          <div className="relative aspect-[21/9] w-full min-h-[140px] bg-zinc-950">
            <Image
              src={learnerBanner}
              alt={program.learnerHeroAlt ?? program.heroAlt ?? program.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-3 p-4 md:p-5">
              <div>
                <p className="text-xs text-zinc-400">
                  <Link href="/my-learning?tab=live" className="hover:text-amber-300">
                    Tutor Led
                  </Link>
                  <span className="mx-2">/</span>
                  <span>{program.title}</span>
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{program.title}</h1>
                <p className="mt-1 text-sm text-zinc-400">Live on Zoom · Enrolled</p>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
                  After payment
                </p>
                <p className="text-xl font-extrabold text-white">₹{enrolledPrice.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-zinc-500">Enrolled price</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-6">
            {/* Next live session */}
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80">
              <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#FFB800]">
                    Next Live Session
                  </p>
                  <h2 className="mt-2 text-xl font-bold md:text-2xl">{nextSessionTitle}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-zinc-500" aria-hidden />
                      {program.nextBatchDate}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-zinc-500" aria-hidden />
                      {program.schedule}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-300">
                      {program.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)}
                    </span>
                    <span className="text-sm font-medium text-zinc-200">{program.trainer.name}</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                      Starts in
                    </p>
                    <div className="mt-1 flex gap-2 font-mono text-2xl font-bold tabular-nums text-[#FFB800]">
                      <span>{String(cd.hours).padStart(2, "0")}</span>
                      <span className="text-zinc-600">:</span>
                      <span>{String(cd.mins).padStart(2, "0")}</span>
                      <span className="text-zinc-600">:</span>
                      <span>{String(cd.secs).padStart(2, "0")}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-zinc-500">Hours · Mins · Secs</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 md:items-end">
                  {zoomJoinUrl ? (
                    <a
                      href={zoomJoinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full min-w-[200px] items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_8px_24px_rgba(255,184,0,0.25)] transition hover:bg-[#e5a500] md:w-auto"
                    >
                      <Video className="h-4 w-4" aria-hidden />
                      Join Live Session
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full min-w-[200px] cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-zinc-800 px-6 py-3.5 text-sm font-extrabold text-zinc-500 md:w-auto"
                    >
                      <Video className="h-4 w-4" aria-hidden />
                      Join Live Session
                    </button>
                  )}
                  <p className="text-xs text-zinc-500">
                    {zoomJoinUrl ? (
                      <>
                        Opens Zoom in a new tab ·{" "}
                        <button
                          type="button"
                          onClick={scrollToZoomJoin}
                          className="text-amber-400/90 underline hover:text-amber-300"
                        >
                          Meeting details
                        </button>
                      </>
                    ) : (
                      "Your trainer will add the Zoom link soon"
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* Curriculum — by week or by day */}
            <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 md:p-5">
              <TutorLedCurriculumExplorer
                program={program}
                variant="learner"
                weekProgress={weekProgress}
                liveJoinAnchor="#zoom-live"
              />
            </section>
            {/* Recordings */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Session Recordings</h2>
                {sessionRecordings.length > 0 ? (
                  <span className="text-xs text-zinc-500">{sessionRecordings.length} from Zoom cloud</span>
                ) : null}
              </div>
              {sessionRecordings.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-500">
                  Recordings appear here after your trainer runs a live session and syncs from Zoom.
                </p>
              ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                  {sessionRecordings.map((rec, i) => (
                    <a
                      key={rec.playUrl + String(i)}
                      href={rec.playUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-[200px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition hover:border-amber-400/40"
                  >
                    <div className="relative aspect-video bg-black">
                      <Image src={rec.thumb} alt="" fill className="object-cover opacity-80" unoptimized />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Play className="h-10 w-10 text-white/90" fill="currentColor" aria-hidden />
                      </span>
                      {rec.duration ? (
                        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium">
                          {rec.duration}
                        </span>
                      ) : null}
                    </div>
                    <p className="p-2 text-xs font-medium text-zinc-300">{rec.title}</p>
                  </a>
                ))}
              </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <TutorLedZoomJoinCard program={program} compact />
            <TutorLedLearningToolsPanel programSlug={program.slug} />

            <article className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <h3 className="text-sm font-bold text-zinc-200">Course Instructor</h3>
              <div className="mt-3 flex flex-col items-center text-center">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500/40 bg-zinc-900 text-2xl font-bold text-amber-300">
                  {program.trainer.avatar?.trim() ? (
                    <Image
                      src={program.trainer.avatar}
                      alt={program.trainer.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    program.trainer.name.replace(/^Mr\.?\s*/i, "").charAt(0)
                  )}
                </div>
                <p className="mt-3 font-semibold text-white">{program.trainer.name}</p>
                <p className="text-xs text-zinc-400">{program.trainer.role}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{program.trainer.experience}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {program.trainer.certifications.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400"
                    >
                      {c.replace(/\s*Certified\s*/i, "").trim()}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg border border-white/15 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                >
                  View Profile
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <h3 className="text-sm font-bold text-zinc-200">Course Resources</h3>
              <ul className="mt-3 space-y-2">
                {DEMO_RESOURCES.map((r) => (
                  <li
                    key={r.name}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 text-xs text-zinc-300">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
                      <span className="truncate">{r.name}</span>
                    </span>
                    <span className="shrink-0 text-[10px] text-zinc-500">{r.size}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                View All Resources
              </button>
            </article>

            <article className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <h3 className="inline-flex items-center gap-2 text-sm font-bold text-zinc-200">
                <Megaphone className="h-4 w-4 text-amber-400" aria-hidden />
                Recent Announcements
              </h3>
              <ul className="mt-3 space-y-3">
                {DEMO_ANNOUNCEMENTS.map((a) => (
                  <li key={a.text} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <p className="text-xs leading-relaxed text-zinc-400">{a.text}</p>
                    <p className="mt-1 text-[10px] text-zinc-600">{a.ago}</p>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
              <h3 className="inline-flex items-center gap-2 text-sm font-bold text-amber-100">
                <HelpCircle className="h-4 w-4" aria-hidden />
                Need Help?
              </h3>
              <p className="mt-2 text-xs text-zinc-400">Ask your trainer or cohort in the community forum.</p>
              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-[#FFB800] py-2.5 text-xs font-bold text-black hover:bg-[#e5a500]"
              >
                Raise a Doubt
              </button>
            </article>
          </aside>
        </div>
      </main>
    </div>
  );
}
