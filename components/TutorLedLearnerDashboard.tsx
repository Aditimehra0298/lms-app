"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { resolveZoomJoinUrl } from "@/lib/zoom-meeting";
import { TutorLedLearnerHero } from "@/components/TutorLedLearnerHero";
import {
  buildJourneySteps,
  computeCompletedLiveSessions,
  computeProgramProgress,
  getCurriculumSessionCount,
} from "@/lib/tutor-led-training-schedule";
import { TutorLedLearnerHubSections } from "@/components/TutorLedLearnerHubSections";
import { TutorLedLearnerSidebar } from "@/components/TutorLedLearnerSidebar";
import { tlPage } from "@/lib/tutor-led-learner-theme";
import { ArrowLeft } from "lucide-react";

type Props = { program: TutorLedProgramStored };

function formatRecordingDuration(minutes?: number): string {
  if (minutes == null || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:00`;
  return `${m} min`;
}

export default function TutorLedLearnerDashboard({ program }: Props) {
  const weeks = program.curriculum;
  const zoomJoinUrl = resolveZoomJoinUrl(program);

  const sessionRecordings = useMemo(() => {
    const fromZoom = program.zoomRecordings ?? [];
    if (fromZoom.length === 0) return [];
    return fromZoom.map((rec, i) => ({
      title: rec.topic || `Session ${i + 1}`,
      duration: formatRecordingDuration(rec.durationMinutes),
      thumb: program.learnerHeroSrc?.trim() || program.heroSrc || `/h${(i % 3) + 1}.png`,
      playUrl: rec.playUrl,
      dateLabel: program.nextBatchDate,
    }));
  }, [program.zoomRecordings, program.heroSrc, program.learnerHeroSrc, program.nextBatchDate]);

  const totalSessions = getCurriculumSessionCount(program);
  const completedSessions = computeCompletedLiveSessions(sessionRecordings.length, totalSessions);
  const nextSessionIndex = Math.min(completedSessions, Math.max(0, weeks.length - 1));
  const nextSessionTitle = weeks[nextSessionIndex]?.topic ?? weeks[0]?.topic ?? "Live session";

  const {
    completedCount,
    inProgressCount,
    upcomingCount,
    progressPercent,
    examUnlocked,
    certificateEarned,
  } = useMemo(
    () => computeProgramProgress(totalSessions, completedSessions),
    [totalSessions, completedSessions],
  );

  const journeySteps = useMemo(
    () => buildJourneySteps(weeks, completedSessions),
    [weeks, completedSessions],
  );

  const weekProgress = useMemo(
    () =>
      weeks.map((_, i) => {
        if (i < completedSessions) return { done: 1, total: 1, label: "Completed" as const };
        return { done: 0, total: 1, label: null };
      }),
    [weeks, completedSessions],
  );

  useEffect(() => {
    if (window.location.hash !== "#zoom-live") return;
    const t = window.setTimeout(() => {
      document.getElementById("zoom-live")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [program.slug]);

  return (
    <div className={tlPage}>
      <main className="mx-auto w-full max-w-[1760px] px-4 py-6 md:px-5 lg:px-6">
        <Link
          href="/my-learning?tab=live"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-amber-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Tutor Led programs
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="min-w-0">
            <TutorLedLearnerHero
              program={program}
              zoomJoinUrl={zoomJoinUrl}
              progressPercent={progressPercent}
              journeySteps={journeySteps}
              completedCount={completedCount}
              inProgressCount={inProgressCount}
              upcomingCount={upcomingCount}
              firstRecordingUrl={sessionRecordings[0]?.playUrl}
              sessionsAttended={completedSessions}
              recordingsWatched={sessionRecordings.length}
              totalSessions={totalSessions}
              examUnlocked={examUnlocked}
            />

            <TutorLedLearnerHubSections
              program={program}
              nextSessionTitle={nextSessionTitle}
              zoomJoinUrl={zoomJoinUrl}
              progressPercent={progressPercent}
              sessionRecordings={sessionRecordings}
              weekProgress={weekProgress}
              completedSessions={completedSessions}
              examUnlocked={examUnlocked}
            />
          </div>

          <TutorLedLearnerSidebar
            program={program}
            nextSessionTitle={nextSessionTitle}
            zoomJoinUrl={zoomJoinUrl}
            certificateEarned={certificateEarned}
          />
        </div>
      </main>
    </div>
  );
}
