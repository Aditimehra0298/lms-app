"use client";

/**
 * Design copy of the enrolled self-paced LMS (`/my-learning/course/[slug]`).
 * Edit this file to change the admin LMS preview. The live learner player stays
 * in `app/my-learning/course/[slug]/page.tsx` until this design is wired in.
 */

import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Bookmark,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  Lock,
  Play,
  PlayCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { CourseCurriculumModule, ManagedCourseLearningSection } from "@/lib/content-schema";
import { COURSE_LEARNING_TOOL_DEFS } from "@/lib/course-learning-tools";
import { moduleCurriculumRows } from "@/lib/learner-preview-gate";
import { learnerExamDisplayLabel } from "@/lib/my-learning-exams";

type Props = {
  title: string;
  slug: string;
  modules: CourseCurriculumModule[];
  learning?: ManagedCourseLearningSection;
  /** Admin preview: sample progress, modules stay unlocked, no real video. */
  preview?: boolean;
};

function moduleTitle(mod: CourseCurriculumModule, index: number): string {
  return mod.title?.trim() || `Module ${index + 1}`;
}

export default function SelfPacedLearnerLmsDashboard({
  title,
  slug,
  modules,
  learning,
  preview = false,
}: Props) {
  const [selectedModule, setSelectedModule] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));
  const [note, setNote] = useState("");
  const [notesTab, setNotesTab] = useState<"notes" | "resources">("notes");
  const [bookmarked, setBookmarked] = useState(false);

  const safeModule = Math.min(selectedModule, Math.max(0, modules.length - 1));
  const activeModule = modules[safeModule];
  const lessons = useMemo(
    () => (activeModule ? moduleCurriculumRows(activeModule) : []),
    [activeModule],
  );
  const safeLesson = Math.min(selectedLesson, Math.max(0, lessons.length - 1));
  const activeItem = lessons[safeLesson];

  const tools = COURSE_LEARNING_TOOL_DEFS.map((def) => ({
    ...def,
    value: learning?.courseTools?.[def.field]?.trim() || "",
  }));

  const progressLabel = learning?.progressLabel?.trim() || "Your Progress";
  const sampleDone = modules.length > 1 ? 1 : 0;
  const samplePercent = modules.length ? Math.round((sampleDone / modules.length) * 100) : 0;
  const outcomes = (activeItem?.learningOutcomes ?? []).map((p) => p.trim()).filter(Boolean);
  const lessonTitle = activeItem?.label?.trim() || activeModule?.title || "Lesson";
  const lessonBody =
    activeItem?.description?.trim() ||
    learning?.defaultLessonDescription?.trim() ||
    "Follow module lessons in order, then attempt module assessments and the final exam.";

  const goLesson = (moduleIdx: number, lessonIdx: number) => {
    setSelectedModule(moduleIdx);
    setSelectedLesson(lessonIdx);
    setExpanded((prev) => new Set(prev).add(moduleIdx));
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#070b14] p-4 text-white md:p-5">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
        <Link href="/my-learning?tab=learning" className="hover:text-amber-200">
          My Learning
        </Link>
        <ChevronRight size={12} />
        <span className="text-violet-200">{title || slug}</span>
      </div>
      <h1 className="text-3xl font-bold md:text-4xl">{title || slug}</h1>
      {preview ? (
        <p className="mt-2 text-[11px] text-amber-200/80">
          Design preview — sample progress only. Learners still use the live course player.
        </p>
      ) : null}

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] xl:items-start">
        <div className="min-w-0 space-y-3">
          <article className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1324]">
            <div className="relative flex min-h-[240px] flex-col items-center justify-center gap-3 bg-black px-6 py-16 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[11px] font-semibold text-violet-100">
                <Play className="h-3.5 w-3.5" aria-hidden />
                {preview ? "Preview player" : "Lesson video"}
              </span>
              <p className="max-w-md text-sm text-gray-200">{lessonTitle}</p>
              <p className="max-w-lg text-xs text-gray-500">
                {activeItem?.videoUrl?.trim()
                  ? "Lesson video is saved. Learners play it in the protected player after enrollment."
                  : learning?.noVideoMessage?.trim() || "No lesson video uploaded yet."}
              </p>
            </div>
          </article>

          <article className="rounded-xl border border-white/10 bg-[#0c1324] p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-amber-100">{lessonTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-100 md:text-base">{lessonBody}</p>
              </div>
              <button
                type="button"
                onClick={() => setBookmarked((v) => !v)}
                className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-3 py-2 text-xs ${
                  bookmarked
                    ? "border-amber-300/50 bg-amber-500/20 text-amber-100"
                    : "border-white/15 bg-black/30 text-gray-300"
                }`}
              >
                <Bookmark size={14} className={bookmarked ? "fill-current" : undefined} aria-hidden />
                {bookmarked ? "Bookmarked" : learning?.bookmarkLabel?.trim() || "Bookmark"}
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-violet-400/35 bg-gradient-to-br from-violet-600/15 via-[#121a32] to-amber-500/10 p-3">
              <h3 className="text-sm font-bold text-amber-100">
                {learning?.learningToolsTitle?.trim() || "Learning tools"}
              </h3>
              <p className="mt-1 text-[11px] text-violet-200/80">
                {learning?.learningToolsHint?.trim() || "Course materials shown on every lesson."}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.key}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold ${
                        tool.value
                          ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                          : "border-white/10 bg-black/25 text-gray-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {tool.label}
                      {tool.value ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      ) : (
                        <span className="text-[9px] font-medium uppercase tracking-wide">Missing</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-white/15 bg-[#10182c] p-4">
              <h3 className="text-sm font-bold text-amber-100">About this lesson</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-50">
                {activeItem?.about?.trim() || lessonBody}
              </p>
              {outcomes.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {outcomes.map((point) => (
                    <li
                      key={point}
                      className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-50"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-gray-400">Continue lessons — next modules stay open in this copy.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safeLesson <= 0}
                  onClick={() => setSelectedLesson((n) => Math.max(0, n - 1))}
                  className="rounded-md border border-white/15 bg-black/25 px-4 py-2 text-xs disabled:opacity-40"
                >
                  {learning?.previousLabel?.trim() || "Previous"}
                </button>
                <button
                  type="button"
                  disabled={safeLesson >= lessons.length - 1}
                  onClick={() => setSelectedLesson((n) => n + 1)}
                  className="rounded-md bg-violet-600 px-5 py-2 text-xs font-semibold disabled:opacity-40"
                >
                  {learning?.nextLabel?.trim() || "Next"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center gap-5 text-sm">
                  <button
                    type="button"
                    onClick={() => setNotesTab("notes")}
                    className={notesTab === "notes" ? "border-b-2 border-violet-400 text-violet-100" : "text-gray-400"}
                  >
                    {learning?.notesTabLabel?.trim() || "Notes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotesTab("resources")}
                    className={
                      notesTab === "resources" ? "border-b-2 border-violet-400 text-violet-100" : "text-gray-400"
                    }
                  >
                    {learning?.resourcesTabLabel?.trim() || "Resources"}
                  </button>
                </div>
                {notesTab === "notes" ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Write your personal note for this lesson…"
                      className="rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm placeholder:text-gray-500"
                    />
                    <button type="button" className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold">
                      {learning?.saveNoteLabel?.trim() || "Save"}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {learning?.resourcesEmptyMessage?.trim() || "No resources uploaded for this lesson yet."}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-amber-300/35 bg-gradient-to-b from-amber-500/10 to-violet-950/20 p-4 text-center">
                <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {learning?.accreditedBadgeLabel?.trim() || "Accredited training"}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                  {learning?.accreditedDescription?.trim() ||
                    "Certificate unlocks after required exams."}
                </p>
              </div>
            </div>
          </article>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-24">
          <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
            <div className="flex items-center gap-3 rounded-md border border-white/10 bg-black/30 p-2">
              <div className="grid h-11 w-11 place-items-center rounded-full border-2 border-violet-400/50 text-[11px] font-bold text-violet-100">
                {samplePercent}%
              </div>
              <div>
                <p className="text-xs text-gray-400">{progressLabel}</p>
                <p className="text-lg font-bold">{samplePercent}% Completed</p>
                <p className="text-[10px] text-amber-200/80">Sample only — not a real learner</p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-bold">Course Modules ({modules.length})</h3>
              <button
                type="button"
                className="text-xs text-violet-200"
                onClick={() => setExpanded(new Set(modules.map((_, i) => i)))}
              >
                Expand all
              </button>
            </div>
            {modules.length === 0 ? (
              <p className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                No modules yet. Add lessons on the Content tab, then save.
              </p>
            ) : (
              <div className="space-y-2">
                {modules.map((mod, idx) => {
                  const open = expanded.has(idx);
                  const rows = moduleCurriculumRows(mod);
                  const selected = idx === safeModule;
                  const sampleDoneModule = preview && idx < sampleDone;
                  return (
                    <div
                      key={`${moduleTitle(mod, idx)}-${idx}`}
                      className={`rounded-lg border px-2.5 py-2.5 text-sm ${
                        sampleDoneModule
                          ? "border-emerald-300/35 bg-gradient-to-r from-emerald-500/20 to-[#13263a] text-emerald-100"
                          : selected
                            ? "border-violet-300/40 bg-gradient-to-r from-violet-500/25 to-[#121a32] text-violet-100"
                            : "border-white/10 bg-black/25 text-gray-200"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 text-left"
                        onClick={() => {
                          goLesson(idx, 0);
                          setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(idx)) next.delete(idx);
                            else next.add(idx);
                            return next;
                          });
                        }}
                      >
                        <span className="inline-flex min-w-0 items-start gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/10 text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="font-semibold">{moduleTitle(mod, idx)}</span>
                            {mod.description?.trim() ? (
                              <span className="mt-0.5 block text-xs font-normal text-zinc-300">
                                {mod.description.trim()}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {open ? (
                        <div className="mt-2 space-y-1.5 rounded-md border border-white/10 bg-black/30 p-2">
                          {rows.length === 0 ? (
                            <p className="text-[11px] text-gray-500">No lessons in this module.</p>
                          ) : (
                            rows.map((row, rowIdx) => {
                              const active = selected && rowIdx === safeLesson;
                              const exam = row.kind === "exam";
                              return (
                                <button
                                  key={`${row.label}-${rowIdx}`}
                                  type="button"
                                  onClick={() => goLesson(idx, rowIdx)}
                                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${
                                    active ? "bg-violet-500/25 text-violet-50" : "text-gray-300 hover:bg-white/5"
                                  }`}
                                >
                                  {exam ? (
                                    <Award className="h-3.5 w-3.5 shrink-0 text-amber-200" />
                                  ) : row.kind === "video" ? (
                                    <PlayCircle className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                                  )}
                                  <span className="min-w-0 flex-1 truncate">
                                    {exam
                                      ? learnerExamDisplayLabel(row.label, `Module ${idx + 1} exam`)
                                      : row.label?.trim() || `Lesson ${rowIdx + 1}`}
                                  </span>
                                  {exam && !row.examUploadUrl?.trim() ? (
                                    <span className="shrink-0 text-[10px] text-amber-300">Exam pending</span>
                                  ) : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="rounded-xl border border-amber-300/25 bg-gradient-to-b from-amber-500/10 to-transparent p-4 text-center">
            <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              {learning?.accreditedBadgeLabel?.trim() || "Accredited training"}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
              {learning?.certificationRuleText?.trim() ||
                learning?.accreditedDescription?.trim() ||
                "Certificate unlocks after required exams."}
            </p>
            {preview ? (
              <p className="mt-3 inline-flex items-center gap-1 text-[10px] text-gray-500">
                <Lock className="h-3 w-3" aria-hidden />
                Admin copy — does not issue a certificate
              </p>
            ) : null}
          </article>
        </aside>
      </section>
    </div>
  );
}
