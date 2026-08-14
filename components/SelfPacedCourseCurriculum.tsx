"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ClipboardList,
  FileText,
  Lock,
  PlayCircle,
} from "lucide-react";
import type { CourseCurriculumItem, CourseCurriculumModule, ManagedCourse } from "@/lib/content-schema";
import { getCurriculumForCourse, totalCurriculumSteps } from "@/lib/course-detail-template";
import {
  curriculumItemOneLiner,
  curriculumKindPublicLabel,
  curriculumModuleOneLiner,
} from "@/lib/curriculum-landing-copy";

type Props = {
  course: ManagedCourse;
  className?: string;
};

function flattenModuleItems(mod: CourseCurriculumModule): CourseCurriculumItem[] {
  const top = mod.items ?? [];
  const nested = (mod.subModules ?? []).flatMap((sm) => sm.items ?? []);
  return [...top, ...nested];
}

function lessonDuration(item: CourseCurriculumItem): string {
  const d = (item as { duration?: string }).duration?.trim();
  if (d) return d;
  const label = item.label ?? "";
  const match = label.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
  if (match) return match[1]!;
  if (item.kind === "exam") return "Quiz";
  if (item.kind === "reading") return "Reading";
  return "Video";
}

function LessonIcon({ kind }: { kind?: CourseCurriculumItem["kind"] }) {
  if (kind === "exam") {
    return <ClipboardList className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />;
  }
  if (kind === "reading") {
    return <FileText className="h-4 w-4 shrink-0 text-sky-400" aria-hidden />;
  }
  return <PlayCircle className="h-4 w-4 shrink-0 text-[#f4c150]" aria-hidden />;
}

/**
 * Udemy-style expandable curriculum for the “Course Content” section (pre-payment).
 */
export default function SelfPacedCourseCurriculum({ course, className = "" }: Props) {
  const modules = useMemo(
    () => getCurriculumForCourse(course.slug, course.category, course.title, course.curriculum),
    [course.slug, course.category, course.title, course.curriculum],
  );

  const lectureCount = totalCurriculumSteps(modules);
  const sectionCount = modules.length;

  const [openModules, setOpenModules] = useState<Set<number>>(() => new Set([0]));

  const allOpen = openModules.size === sectionCount && sectionCount > 0;

  const toggleModule = (index: number) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (allOpen) {
      setOpenModules(new Set());
      return;
    }
    setOpenModules(new Set(modules.map((_, i) => i)));
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Course content</h2>
          <p className="mt-2 text-sm text-zinc-500">
            {sectionCount} section{sectionCount === 1 ? "" : "s"} · {lectureCount} lecture
            {lectureCount === 1 ? "" : "s"} · {course.duration || "Self-paced"}
          </p>
        </div>
        {sectionCount > 0 ? (
          <button
            type="button"
            onClick={toggleExpandAll}
            className="shrink-0 text-sm font-semibold text-[#f4c150] transition hover:text-[#f9d06a]"
          >
            {allOpen ? "Collapse all sections" : "Expand all sections"}
          </button>
        ) : null}
      </div>

      <div className="mt-6 max-h-[min(70vh,720px)] space-y-2 overflow-y-auto overscroll-contain pr-1">
        {modules.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-[#141414] px-4 py-8 text-center text-sm text-zinc-500">
            Curriculum will appear here once modules are added in Admin.
          </p>
        ) : (
          modules.map((mod, index) => {
            const items = flattenModuleItems(mod);
            const isOpen = openModules.has(index);

            return (
              <div
                key={`${mod.title}-${index}`}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#141414]"
              >
                <button
                  type="button"
                  onClick={() => toggleModule(index)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-white/[0.03] md:px-5"
                  aria-expanded={isOpen}
                >
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-zinc-400 transition ${isOpen ? "" : "-rotate-90"}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white md:text-base">{mod.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-300">
                      {curriculumModuleOneLiner(mod)}
                    </p>
                  </div>
                </button>

                {isOpen ? (
                  <ul className="border-t border-white/10">
                    {items.map((item, li) => (
                      <li
                        key={`${item.label}-${li}`}
                        className="flex items-start gap-3 border-b border-white/5 px-4 py-3.5 last:border-b-0 md:pl-12 md:pr-5"
                      >
                        <span className="mt-0.5">
                          <LessonIcon kind={item.kind} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-100">{item.label}</p>
                          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                            {curriculumKindPublicLabel(item.kind)}
                          </p>
                          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-zinc-300">
                            {curriculumItemOneLiner(item)}
                          </p>
                        </div>
                        <span className="mt-0.5 shrink-0 text-xs text-zinc-400">{lessonDuration(item)}</span>
                        <Lock className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-600" aria-label="Locked until enrollment" />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-zinc-600">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Full lectures, documents, and assessments unlock after you enroll.
      </p>
    </div>
  );
}
