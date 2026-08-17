"use client";

import { useState } from "react";
import type { ManagedCourse } from "@/lib/content-schema";
import { isFoodSafetyMasterclassSlug } from "@/lib/food-safety-masterclass-page";
import { getCurriculumForCourse } from "@/lib/course-detail-template";
import { managedCourseToPostHero } from "@/lib/managed-course-to-post-hero";
const card =
  "rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] sm:p-6";

type Props = {
  course: ManagedCourse;
  className?: string;
};

/**
 * Pre-payment curriculum block: gold module rail + table.
 * Original design lives in TutorLedPostHeroSections (variant="self-paced").
 */
export default function SelfPacedGoldCurriculum({ course, className = "" }: Props) {
  const postHero = managedCourseToPostHero(course);
  const diplomaMods = isFoodSafetyMasterclassSlug(course.slug)
    ? getCurriculumForCourse(course.slug, course.category, course.title, null)
    : null;
  const rows =
    diplomaMods && diplomaMods.length > 0
      ? diplomaMods.map((m, i) => ({
          week: i + 1,
          label: m.title,
          topic: m.items[0]?.label ?? m.title,
          keyLearning: m.items.map((it) => it.label).filter(Boolean).join(" · "),
          sessionType: m.items.some((x) => x.kind === "exam") ? "Video + quiz" : "On-demand",
        }))
      : postHero.curriculum;
  const [activeMod, setActiveMod] = useState(0);

  return (
    <div className={className}>
      <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">
        Course curriculum{" "}
        <span className="text-sm font-normal text-zinc-500">(all modules before you enroll)</span>
      </h2>
      <p className="mb-4 text-sm text-zinc-500">
        {rows.length} modules · review the full learning path below, then enroll when you are ready.
      </p>

      <div className={card}>
        <div className="mt-1 flex gap-3">
          {/* Gold module list — every module */}
          <div className="hidden w-44 shrink-0 space-y-2 md:block lg:w-48">
            {rows.map((w, idx) => (
              <button
                key={w.week}
                type="button"
                onClick={() => setActiveMod(idx)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                  activeMod === idx
                    ? "border-[#FFB800]/60 bg-[#FFB800]/12 shadow-[0_0_20px_rgba(255,184,0,0.12)]"
                    : "border-white/10 bg-black/20 hover:border-[#FFB800]/30"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#FFB800]">
                  Mod {w.week}
                </p>
                <p className="text-[11px] leading-snug text-zinc-400">{w.label}</p>
              </button>
            ))}
          </div>

          {/* Gold curriculum table */}
          <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30">
            <table className="w-full min-w-[520px] text-left text-xs md:min-w-0">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Topic</th>
                  <th className="px-4 py-3">Key Learning</th>
                  <th className="px-4 py-3 text-right">Format</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w, idx) => (
                  <tr
                    key={w.week}
                    className={`border-b border-white/5 transition ${
                      activeMod === idx ? "bg-[#FFB800]/[0.06]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-4 py-3.5 align-top">
                      <span className="font-bold text-[#FFB800]">Module {w.week}</span>
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
              * Full lesson list unlocks after enrollment. Admin catalog is the source of truth.
            </p>
          </div>
        </div>

        {/* Mobile: horizontal gold module chips */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {rows.map((w, idx) => (
            <button
              key={w.week}
              type="button"
              onClick={() => setActiveMod(idx)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                activeMod === idx
                  ? "border-[#FFB800]/60 bg-[#FFB800]/15 text-[#FFB800]"
                  : "border-white/15 text-zinc-400"
              }`}
            >
              Mod {w.week}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
