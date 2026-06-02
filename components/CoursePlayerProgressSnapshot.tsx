"use client";

import { useMemo } from "react";
import type { CourseCurriculumModule } from "@/lib/content-schema";
import { computeCoursePlayerProgressSnapshot } from "@/lib/course-player-progress";

type Props = {
  courseSlug: string;
  curriculum: CourseCurriculumModule[];
  completedModules: number[];
  watchedSecondsByModule: Record<number, number>;
};

export function CoursePlayerProgressSnapshot({
  courseSlug,
  curriculum,
  completedModules,
  watchedSecondsByModule,
}: Props) {
  const snap = useMemo(
    () =>
      computeCoursePlayerProgressSnapshot(
        courseSlug,
        curriculum,
        completedModules,
        watchedSecondsByModule,
      ),
    [courseSlug, curriculum, completedModules, watchedSecondsByModule],
  );

  const examMain =
    snap.examsAttempted > 0 && snap.averageExamPercent !== null
      ? `${snap.averageExamPercent}%`
      : "—";

  const examHint =
    snap.examsTotal > 0
      ? snap.examsAttempted > 0
        ? `${snap.examsPassed}/${snap.examsTotal} exams passed`
        : `${snap.examsTotal} exams · not started`
      : "No module exams";

  const completedHint =
    snap.totalModules > 0
      ? `${Math.round((snap.completedModules / snap.totalModules) * 100)}% of course`
      : "";

  return (
    <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
      <p className="text-sm font-semibold text-violet-100">Your progress</p>
      <p className="mt-0.5 text-[11px] text-gray-500">Live from your lessons and exam attempts</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-white/10 bg-black/25 px-2 py-2">
          <p className="text-[11px] text-gray-400">Modules</p>
          <p className="text-lg font-bold text-white">{snap.totalModules}</p>
          <p className="text-[10px] text-gray-500">in course</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 px-2 py-2">
          <p className="text-[11px] text-gray-400">Completed</p>
          <p className="text-lg font-bold text-emerald-300">{snap.completedModules}</p>
          <p className="text-[10px] text-gray-500 truncate" title={completedHint}>
            {completedHint || "—"}
          </p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/25 px-2 py-2">
          <p className="text-[11px] text-gray-400">Exam avg.</p>
          <p className="text-lg font-bold text-amber-200">{examMain}</p>
          <p className="text-[10px] text-gray-500 truncate" title={examHint}>
            {examHint}
          </p>
        </div>
      </div>
    </article>
  );
}
