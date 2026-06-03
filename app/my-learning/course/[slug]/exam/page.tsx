"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ExamSessionClock } from "@/components/ExamSessionClock";
import { ExamProgressPanel } from "@/components/ExamProgressPanel";
import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  FileText,
  Flag,
  Headset,
  Lock,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import type { CourseCurriculumItem, CourseCurriculumModule, CourseFinalExam } from "@/lib/content-schema";
import {
  DEFAULT_MODULE_EXAM_PASS_PERCENT,
  recordModuleExamAttempt,
} from "@/lib/learner-exam-scores";
import { markModuleCompleted } from "@/lib/learner-course-progress";
import { getFirstExamRowInModule } from "@/lib/my-learning-exams";
import {
  healModuleWatchRecord,
  modulePreviewProgress,
  PREVIEW_WATCH_UPDATED_EVENT,
  readModuleWatchedSeconds,
  writeModuleWatchedSeconds,
} from "@/lib/learner-preview-gate";
import type { ParsedExamQuestion } from "@/lib/exam-csv-parse";

export const dynamic = "force-dynamic";

type CourseExamPayload = {
  slug: string;
  title: string;
  curriculum: CourseCurriculumModule[] | null;
  finalExam: CourseFinalExam | null;
};

function CourseExamPageInner() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params?.slug ?? "course";
  const isFinalExam = searchParams.get("final") === "1";
  const moduleNumber = Math.max(1, Number(searchParams.get("module") || "1"));
  const moduleIdx = moduleNumber - 1;

  const [courseMeta, setCourseMeta] = useState<CourseExamPayload | null | undefined>(undefined);
  const [questions, setQuestions] = useState<ParsedExamQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [loadedModuleNumber, setLoadedModuleNumber] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reviewedQuestions, setReviewedQuestions] = useState<number[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<number | null>>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number | null>(null);
  const [examStartedAtMs, setExamStartedAtMs] = useState<number | null>(null);
  const [watchedSecondsByModule, setWatchedSecondsByModule] = useState<Record<number, number>>({});
  const currentQuestion = questions[currentQuestionIndex];
  const answeredQuestions = useMemo(
    () => selectedAnswers.map((answer, idx) => (answer !== null ? idx : -1)).filter((idx) => idx >= 0),
    [selectedAnswers],
  );

  const score = useMemo(
    () =>
      selectedAnswers.reduce<number>((sum, answer, idx) => {
        if (answer === null) return sum;
        return sum + (answer === questions[idx]?.correctIndex ? 1 : 0);
      }, 0),
    [selectedAnswers, questions],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as CourseExamPayload;
        if (cancelled) return;
        setCourseMeta(data);
        if (data.curriculum?.length) {
          const priorWatch = readModuleWatchedSeconds(slug);
          let healed = priorWatch;
          let watchChanged = false;
          data.curriculum.forEach((mod, idx) => {
            const moduleNumber = idx + 1;
            const nextVal = healModuleWatchRecord(mod, priorWatch[moduleNumber] ?? 0);
            if (nextVal !== (priorWatch[moduleNumber] ?? 0)) {
              healed = { ...healed, [moduleNumber]: nextVal };
              watchChanged = true;
            }
          });
          if (watchChanged) {
            writeModuleWatchedSeconds(slug, healed);
            setWatchedSecondsByModule(healed);
          }
        }
      } catch {
        if (!cancelled) setCourseMeta(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const loadWatched = () => setWatchedSecondsByModule(readModuleWatchedSeconds(slug));
    loadWatched();
    const onWatch = (e: Event) => {
      const detail = (e as CustomEvent<{ courseSlug?: string }>).detail;
      if (!detail?.courseSlug || detail.courseSlug === slug) loadWatched();
    };
    window.addEventListener(PREVIEW_WATCH_UPDATED_EVENT, onWatch);
    window.addEventListener("storage", loadWatched);
    window.addEventListener("focus", loadWatched);
    return () => {
      window.removeEventListener(PREVIEW_WATCH_UPDATED_EVENT, onWatch);
      window.removeEventListener("storage", loadWatched);
      window.removeEventListener("focus", loadWatched);
    };
  }, [slug]);

  const examRuntime = useMemo(() => {
    if (!courseMeta) return null;
    if (isFinalExam) {
      const fe = courseMeta.finalExam ?? undefined;
      const passing = typeof fe?.passingScorePercent === "number" ? fe.passingScorePercent : 70;
      const timed = !!fe?.timedExam;
      const durationSec = Math.max(60, (fe?.examDurationMinutes ?? 90) * 60);
      const title = fe?.title?.trim() || `Final examination — ${courseMeta.title}`;
      return {
        title,
        passingScorePercent: passing,
        timed,
        durationSec,
        materialsUrl: fe?.examUploadUrl,
      };
    }
    const mod = courseMeta.curriculum?.[moduleIdx];
    const row = getFirstExamRowInModule(mod);
    const passing =
      typeof row?.examPassingScorePercent === "number"
        ? row.examPassingScorePercent
        : DEFAULT_MODULE_EXAM_PASS_PERCENT;
    const timed = !!row?.timedExam;
    const durationSec = Math.max(60, (row?.examDurationMinutes ?? 90) * 60);
    const title = row?.label?.trim() || `Module ${moduleNumber} examination — ${courseMeta.title}`;
    return {
      title,
      passingScorePercent: passing,
      timed,
      durationSec,
      materialsUrl: row?.examUploadUrl,
    };
  }, [courseMeta, isFinalExam, moduleIdx, moduleNumber]);

  useEffect(() => {
    if (!courseMeta?.slug || isFinalExam) return;

    let cancelled = false;
    setQuestionsLoading(true);
    setQuestionsError(null);
    setQuestions([]);
    setSelectedAnswers([]);
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setReviewedQuestions([]);
    setExamStartedAtMs(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/courses/${encodeURIComponent(slug)}/exam-questions?module=${moduleNumber}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          ok?: boolean;
          questions?: ParsedExamQuestion[];
          message?: string;
          moduleTitle?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok || !data.questions?.length) {
          setQuestions([]);
          setSelectedAnswers([]);
          setQuestionsError(
            data.message ??
              "No exam questions for this module. Upload a CSV on the Module Exam row in Admin.",
          );
          setLoadedModuleNumber(moduleNumber);
          setQuestionsLoading(false);
          return;
        }
        setQuestions(data.questions);
        setSelectedAnswers(Array.from({ length: data.questions.length }, () => null));
        setLoadedModuleNumber(moduleNumber);
        setQuestionsError(null);
      } catch {
        if (cancelled) return;
        setQuestions([]);
        setSelectedAnswers([]);
        setQuestionsError("Could not load exam questions. Refresh the page and try again.");
        setLoadedModuleNumber(moduleNumber);
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, moduleNumber, isFinalExam, courseMeta?.slug]);

  const previewGate = useMemo(() => {
    if (!courseMeta || isFinalExam) {
      return { requiredSec: 0, watchedSec: 0, unlocked: true };
    }
    const mod = courseMeta.curriculum?.[moduleIdx];
    const progress = modulePreviewProgress(mod, watchedSecondsByModule[moduleNumber] ?? 0);
    return {
      requiredSec: progress.required,
      watchedSec: progress.watched,
      unlocked: progress.unlocked,
    };
  }, [courseMeta, isFinalExam, moduleIdx, moduleNumber, watchedSecondsByModule]);

  useEffect(() => {
    if (!examRuntime) return;
    if (!examRuntime.timed) {
      setTimeRemainingSec(null);
      return;
    }
    setTimeRemainingSec(examRuntime.durationSec);
  }, [examRuntime]);

  useEffect(() => {
    if (!examRuntime?.timed || isSubmitted) return;
    const timer = window.setInterval(() => {
      setTimeRemainingSec((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [examRuntime?.timed, examRuntime?.durationSec, isSubmitted]);

  useEffect(() => {
    if (examRuntime?.timed && timeRemainingSec === 0 && !isSubmitted) {
      setIsSubmitted(true);
    }
  }, [examRuntime?.timed, timeRemainingSec, isSubmitted]);

  useEffect(() => {
    if (!previewGate.unlocked || !examRuntime || isSubmitted || examStartedAtMs !== null) return;
    setExamStartedAtMs(Date.now());
  }, [previewGate.unlocked, examRuntime, isSubmitted, examStartedAtMs]);

  const markModuleCompletedLocal = () => {
    if (isFinalExam || !courseMeta) return;
    markModuleCompleted(slug, moduleNumber, courseMeta.curriculum?.length, {
      courseTitle: courseMeta.title,
      moduleTitle: `Module ${moduleNumber}`,
    });
  };

  useEffect(() => {
    if (!isSubmitted || !examRuntime || isFinalExam) return;
    const total = questions.length;
    const correct = score;
    const percentage = Math.round((correct / total) * 100);
    const entry = recordModuleExamAttempt({
      courseSlug: slug,
      moduleNumber,
      correct,
      total,
      passingPercent: examRuntime.passingScorePercent,
    });
    if (entry.passed) {
      markModuleCompletedLocal();
    }
  }, [isSubmitted, score, examRuntime, isFinalExam, moduleNumber, slug, questions.length]);

  if (courseMeta === undefined) {
    return (
      <div className="min-h-screen bg-[#060b17] text-white">

        <main className="mx-auto flex max-w-[600px] flex-col items-center justify-center px-4 py-24 text-center">
          <p className="text-sm text-gray-400">Loading exam…</p>
        </main>

      </div>
    );
  }

  if (courseMeta === null || !examRuntime) {
    return (
      <div className="min-h-screen bg-[#060b17] text-white">

        <main className="mx-auto max-w-[600px] px-4 py-16 text-center">
          <p className="text-lg font-semibold">Course not found</p>
          <Link href="/my-learning" className="mt-4 inline-block text-violet-300 underline">
            Back to My Learning
          </Link>
        </main>

      </div>
    );
  }

  if (isFinalExam) {
    return (
      <div className="min-h-screen bg-[#060b17] text-white">

        <main className="mx-auto max-w-[700px] px-4 py-16 text-center">
          <p className="text-2xl font-bold">Final exam is not required</p>
          <p className="mt-2 text-sm text-gray-300">
            Certification is based on all module exams. Pass each exam at 70%+ (unlimited retakes). Your
            certificate grade is the combined percentage from all exam marks.
          </p>
          <Link href={`/my-learning/course/${slug}`} className="mt-5 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold">
            Back to My Learning
          </Link>
        </main>

      </div>
    );
  }

  if (questionsLoading || loadedModuleNumber !== moduleNumber) {
    return (
      <div className="min-h-screen bg-[#060b17] text-white">
        <main className="mx-auto flex max-w-[600px] flex-col items-center justify-center px-4 py-24 text-center">
          <p className="text-sm text-gray-400">
            Loading exam for module {moduleNumber}…
          </p>
        </main>
      </div>
    );
  }

  if (!questions.length && questionsError) {
    return (
      <div className="min-h-screen bg-[#060b17] text-white">
        <main className="mx-auto max-w-[600px] px-4 py-16 text-center">
          <p className="text-lg font-semibold text-amber-200">Exam not available</p>
          <p className="mt-2 text-sm text-gray-300">{questionsError}</p>
          <Link
            href={`/my-learning/course/${slug}`}
            className="mt-5 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold"
          >
            Back to course
          </Link>
        </main>
      </div>
    );
  }

  if (!isFinalExam && !previewGate.unlocked) {
    return (
      <div className="min-h-screen bg-[#060b17] text-white">
        <main className="mx-auto max-w-[760px] px-4 py-16 text-center">
          <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-6">
            <p className="inline-flex items-center gap-2 text-amber-200">
              <Lock size={18} /> Assessment locked
            </p>
            <h1 className="mt-3 text-2xl font-bold">Complete the module lessons first</h1>
            <p className="mt-2 text-sm text-amber-100/90">
              Module {moduleNumber} assessment unlocks after you finish the lessons in this module. Return to the
              course and continue watching.
            </p>
            <Link
              href={`/my-learning/course/${slug}`}
              className="mt-5 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold"
            >
              Back to module lessons
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (isSubmitted) {
    const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;
    const passed = percentage >= examRuntime.passingScorePercent;
    return (
      <div className="min-h-screen bg-[#060b17] text-white">

        <main className="mx-auto max-w-[1100px] px-4 py-8">
          <section className="rounded-xl border border-white/10 bg-[#0c1324] p-6">
            <h1 className="text-3xl font-bold">Exam Result</h1>
            <p className="mt-1 text-sm text-gray-300">{courseMeta.title}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Passing score: {examRuntime.passingScorePercent}% correct required
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-400">Your score</p>
                <p className="text-2xl font-bold">{percentage}%</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-400">Status</p>
                <p className={`text-2xl font-bold ${passed ? "text-emerald-300" : "text-rose-300"}`}>
                  {passed ? "PASS" : "FAIL"}
                </p>
              </div>
            </div>
            {passed ? (
              <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                You passed this exam ({percentage}%). When you have passed every module exam, your combined
                percentage is used for your certificate grade.
              </p>
            ) : (
              <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                You need {examRuntime.passingScorePercent}% to pass (your score: {percentage}%). You can retake
                this exam as many times as you need.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/my-learning/course/${slug}`} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold">
                Back to course
              </Link>
              {passed ? (
                <Link
                  href={`/my-learning/course/${slug}#credentials`}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold"
                >
                  View certificate & badges
                </Link>
              ) : null}
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setCurrentQuestionIndex(0);
                  setSelectedAnswers(Array.from({ length: questions.length }, () => null));
                  setReviewedQuestions([]);
                  setTimeRemainingSec(examRuntime.timed ? examRuntime.durationSec : null);
                  setExamStartedAtMs(Date.now());
                }}
                className="rounded-md border border-white/15 bg-black/25 px-4 py-2 text-sm"
              >
                {passed ? "Retake exam (optional)" : "Retake exam"}
              </button>
            </div>
          </section>
        </main>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b17] text-white">

      <main className="mx-auto max-w-[1760px] px-4 py-5 md:px-6 xl:px-8">
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
          <Link href={`/my-learning/course/${slug}`} className="hover:text-amber-200">
            Back to My Learning
          </Link>
          <ChevronRight size={12} />
          <span>Exam</span>
        </div>

        <section className="grid gap-3 xl:grid-cols-[0.35fr_1.65fr_1fr]">
          <aside className="space-y-2 rounded-xl border border-white/10 bg-[#0c1324] p-3">
            {[
              ["Overview", CircleHelp],
              ["Course Content", BookOpen],
              ["Modules", ListChecks],
              ["Assignments", FileText],
              ["Exams", ShieldCheck],
              ["Results", ListChecks],
              ["Certificate", ShieldCheck],
              ["Discussion", CircleHelp],
              ["Resources", FileText],
              ["Help & Support", Headset],
            ].map(([label, Icon], idx) => (
              <button
                key={String(label)}
                className={`inline-flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${
                  idx === 4 ? "bg-violet-500/20 text-violet-100" : "hover:bg-white/5"
                }`}
              >
                <Icon size={14} className={idx === 4 ? "text-violet-300" : "text-gray-400"} />
                {String(label)}
              </button>
            ))}
            <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-sm font-semibold">Need Help?</p>
              <p className="mt-1 text-xs text-gray-400">If you face any issues during exam, contact support.</p>
              <button className="mt-3 w-full rounded-md border border-violet-300/35 bg-violet-500/10 py-1.5 text-xs text-violet-100">
                Contact Support
              </button>
            </div>
          </aside>

          <div className="space-y-3">
            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <h1 className="text-2xl font-bold md:text-3xl">{examRuntime.title}</h1>
              {questionsError ? (
                <p className="mt-2 rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  {questionsError}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-white/10 bg-black/30 px-2 py-1">
                  Passing score: {examRuntime.passingScorePercent}%
                </span>
                <span className="rounded-md border border-white/10 bg-black/30 px-2 py-1">
                  {examRuntime.timed
                    ? `Time limit: ${Math.round(examRuntime.durationSec / 60)} min`
                    : "No time limit"}
                </span>
                {isFinalExam ? (
                  <span className="rounded-md border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-amber-100">
                    Final examination
                  </span>
                ) : (
                  <span className="rounded-md border border-violet-300/25 bg-violet-500/10 px-2 py-1 text-violet-100">
                    Module {moduleNumber}
                  </span>
                )}
              </div>
              {examRuntime.materialsUrl ? (
                <a
                  href={examRuntime.materialsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm text-violet-300 underline hover:text-violet-200"
                >
                  <FileText size={16} /> Download exam materials
                </a>
              ) : null}
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-violet-300">Current question</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-300">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setReviewedQuestions((prev) =>
                      prev.includes(currentQuestionIndex)
                        ? prev.filter((q) => q !== currentQuestionIndex)
                        : [...prev, currentQuestionIndex],
                    )
                  }
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm ${
                    reviewedQuestions.includes(currentQuestionIndex)
                      ? "border-rose-300/35 bg-rose-500/15 text-rose-200"
                      : "border-white/15 bg-black/25 text-gray-300"
                  }`}
                >
                  <Flag
                    size={13}
                    className={reviewedQuestions.includes(currentQuestionIndex) ? "text-rose-200" : "text-violet-300"}
                  />
                  {reviewedQuestions.includes(currentQuestionIndex) ? "Marked for Review" : "Mark for Review"}
                </button>
              </div>
              <h2 className="text-3xl font-bold">{currentQuestion?.question ?? "No questions loaded"}</h2>

              <div className="mt-4 space-y-2">
                {(currentQuestion?.options ?? []).map((option, idx) => (
                  <button
                    key={option}
                    onClick={() =>
                      setSelectedAnswers((prev) => {
                        const next = [...prev];
                        next[currentQuestionIndex] = idx;
                        return next;
                      })
                    }
                    className={`w-full rounded-lg border px-3 py-3 text-left text-sm ${
                      selectedAnswers[currentQuestionIndex] === idx
                        ? "border-violet-300/40 bg-violet-500/10 text-violet-100"
                        : "border-white/10 bg-black/25 hover:bg-white/5"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm"
                >
                  Previous Question
                </button>
                <button
                  onClick={() =>
                    setSelectedAnswers((prev) => {
                      const next = [...prev];
                      next[currentQuestionIndex] = null;
                      return next;
                    })
                  }
                  className="rounded-md border border-white/15 bg-black/25 px-3 py-2 text-sm"
                >
                  Clear Response
                </button>
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold"
                >
                  Next Question
                </button>
              </div>
              <button
                onClick={() => setIsSubmitted(true)}
                className="mt-2 rounded-md border border-emerald-300/35 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200"
              >
                Submit Exam
              </button>
            </article>
          </div>

          <aside className="space-y-3">
            <ExamSessionClock
              timed={examRuntime.timed}
              timeRemainingSec={timeRemainingSec}
              startedAtMs={examStartedAtMs ?? Date.now()}
              onEndExam={() => setIsSubmitted(true)}
            />

            <ExamProgressPanel
              total={questions.length}
              currentIndex={currentQuestionIndex}
              answeredIndices={answeredQuestions}
              reviewedIndices={reviewedQuestions}
              onSelectQuestion={setCurrentQuestionIndex}
            />

          </aside>
        </section>
      </main>

    </div>
  );
}

function ExamLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#060b17] text-white">

      <main className="mx-auto flex max-w-[600px] flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-sm text-gray-400">Loading exam…</p>
      </main>

    </div>
  );
}

export default function CourseExamPage() {
  return (
    <Suspense fallback={<ExamLoadingFallback />}>
      <CourseExamPageInner />
    </Suspense>
  );
}
