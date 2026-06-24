"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  FINAL_EXAM_SCORE_KEY,
  computeCombinedExamGrade,
  learnerCredentialsEligible,
  recordModuleExamAttempt,
} from "@/lib/learner-exam-scores";
import { markModuleCompleted, normalizeCompletedModulesForCurriculum, readCompletedModules } from "@/lib/learner-course-progress";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import {
  hasSeenCompletionCelebration,
  queueCompletionCelebration,
} from "@/components/CourseCompletionCelebration";
import { getFirstExamRowInModule } from "@/lib/my-learning-exams";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { notifyCourseCompletionClient } from "@/lib/notify-course-completion-client";
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
  deliveryKind?: "tutor-led" | "self-paced";
  examUnlocked?: boolean;
  trainingDays?: number;
  completedDays?: number;
};

function CourseExamPageInner() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const paramSlug = params?.slug ?? "course";
  const slug = canonicalCourseSlug(paramSlug);
  const moduleParam = searchParams.get("module");
  const isFinalExam = searchParams.get("final") === "1" || moduleParam === "final";
  const moduleNumber = isFinalExam
    ? 0
    : Math.max(1, Number.parseInt(moduleParam || "1", 10) || 1);
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
  const completionEmailSentRef = useRef(false);
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
          normalizeCompletedModulesForCurriculum(slug, data.curriculum.length);
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

  const selfPacedFinalUnlocked = useMemo(() => {
    if (!courseMeta?.curriculum?.length || !isFinalExam) return true;
    const completed = readCompletedModules(slug);
    const { allExamsPassed } = computeCombinedExamGrade(slug, courseMeta.curriculum);
    const { allModulesDone } = learnerCredentialsEligible(
      courseMeta.curriculum,
      completed,
      allExamsPassed,
    );
    return allModulesDone && allExamsPassed;
  }, [courseMeta, isFinalExam, slug]);

  const examAccessUnlocked = useMemo(() => {
    if (!isFinalExam) return true;
    if (courseMeta?.deliveryKind === "tutor-led") {
      return courseMeta.examUnlocked === true;
    }
    return selfPacedFinalUnlocked;
  }, [courseMeta, isFinalExam, selfPacedFinalUnlocked]);

  useEffect(() => {
    if (!courseMeta?.slug) return;

    let cancelled = false;
    setQuestionsLoading(true);
    setQuestionsError(null);
    setQuestions([]);
    setSelectedAnswers([]);
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setReviewedQuestions([]);
    setExamStartedAtMs(null);

    const query = isFinalExam
      ? "module=final"
      : `module=${moduleNumber}`;

    void (async () => {
      try {
        const res = await fetch(
          `/api/courses/${encodeURIComponent(slug)}/exam-questions?${query}`,
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
              "This exam is not available yet. Please try again later or contact support if you need help.",
          );
          setLoadedModuleNumber(isFinalExam ? -1 : moduleNumber);
          setQuestionsLoading(false);
          return;
        }
        setQuestions(data.questions);
        setSelectedAnswers(Array.from({ length: data.questions.length }, () => null));
        setLoadedModuleNumber(isFinalExam ? -1 : moduleNumber);
        setQuestionsError(null);
      } catch {
        if (cancelled) return;
        setQuestions([]);
        setSelectedAnswers([]);
        setQuestionsError("Could not load exam questions. Refresh the page and try again.");
        setLoadedModuleNumber(isFinalExam ? -1 : moduleNumber);
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
    if (!isSubmitted || !examRuntime) return;
    const total = questions.length;
    const correct = score;
    const entry = recordModuleExamAttempt({
      courseSlug: slug,
      moduleNumber: isFinalExam ? FINAL_EXAM_SCORE_KEY : moduleNumber,
      correct,
      total,
      passingPercent: examRuntime.passingScorePercent,
    });
    if (isFinalExam) return;
    if (entry.passed) {
      markModuleCompletedLocal();
      const curriculum = courseMeta?.curriculum ?? [];
      if (curriculum.length > 0) {
        const completed = readCompletedModules(slug);
        const { allExamsPassed } = computeCombinedExamGrade(slug, curriculum);
        const { eligible } = learnerCredentialsEligible(curriculum, completed, allExamsPassed);
        if (eligible && !hasSeenCompletionCelebration(slug)) {
          queueCompletionCelebration(slug);
        }
      }
    }
  }, [isSubmitted, score, examRuntime, isFinalExam, moduleNumber, slug, questions.length, courseMeta?.curriculum]);

  const courseCredentialsUnlocked = useMemo(() => {
    if (!isSubmitted || !courseMeta?.curriculum?.length || !examRuntime) return false;
    const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;
    const passed = percentage >= examRuntime.passingScorePercent;
    if (!passed) return false;
    const completed = readCompletedModules(slug);
    const { allExamsPassed } = computeCombinedExamGrade(slug, courseMeta.curriculum);
    return learnerCredentialsEligible(courseMeta.curriculum, completed, allExamsPassed).eligible;
  }, [isSubmitted, courseMeta, examRuntime, questions.length, score, slug]);

  useEffect(() => {
    if (!courseCredentialsUnlocked || completionEmailSentRef.current) return;
    const email = getLearnerEmail();
    if (!email || !courseMeta?.title) return;

    completionEmailSentRef.current = true;
    void notifyCourseCompletionClient({
      learnerEmail: email,
      courseSlug: slug,
      courseName: courseMeta.title,
      deliveryKind: courseMeta.deliveryKind === "tutor-led" ? "tutor-led" : "self-paced",
    }).catch((err) => {
      completionEmailSentRef.current = false;
      console.warn("[course-completion] notify failed:", err);
    });
  }, [courseCredentialsUnlocked, courseMeta?.deliveryKind, courseMeta?.title, slug]);

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

  if (questionsLoading || loadedModuleNumber !== (isFinalExam ? -1 : moduleNumber)) {
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

  if (!examAccessUnlocked) {
    const tutorLocked =
      courseMeta?.deliveryKind === "tutor-led" &&
      typeof courseMeta.trainingDays === "number";
    return (
      <div className="min-h-screen bg-[#060b17] text-white">
        <main className="mx-auto max-w-[760px] px-4 py-16 text-center">
          <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-6">
            <p className="inline-flex items-center gap-2 text-amber-200">
              <Lock size={18} /> Assessment locked
            </p>
            <h1 className="mt-3 text-2xl font-bold">
              {tutorLocked ? "Complete all live training first" : "Complete all modules first"}
            </h1>
            <p className="mt-2 text-sm text-amber-100/90">
              {tutorLocked
                ? `Attend all ${courseMeta.trainingDays} training days (${courseMeta.completedDays ?? 0}/${courseMeta.trainingDays} completed) before the final exam unlocks.`
                : "Pass every module exam and finish all module lessons to unlock the final examination."}
            </p>
            <Link
              href={
                tutorLocked
                  ? `/my-learning/course/${slug}`
                  : `/my-learning/course/${slug}`
              }
              className="mt-5 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold"
            >
              Back to course
            </Link>
          </div>
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
              courseCredentialsUnlocked ? (
                <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  Congratulations — you have finished the course! Your certificate and completion summary are
                  ready. Open them below to generate or download your official certificate.
                </p>
              ) : (
                <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  You passed this exam ({percentage}%). When you have passed every module exam, your combined
                  percentage is used for your certificate grade.
                </p>
              )
            ) : (
              <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                You need {examRuntime.passingScorePercent}% to pass (your score: {percentage}%). You can retake
                this exam as many times as you need.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {passed && courseCredentialsUnlocked ? (
                <Link
                  href={`/my-learning/course/${slug}#credentials`}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold"
                >
                  View certificate & completion
                </Link>
              ) : null}
              <Link
                href={`/my-learning/course/${slug}${passed && courseCredentialsUnlocked ? "#credentials" : ""}`}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${
                  passed && courseCredentialsUnlocked
                    ? "border border-white/15 bg-black/25"
                    : "bg-violet-600"
                }`}
              >
                {passed && courseCredentialsUnlocked ? "Back to course lessons" : "Back to course"}
              </Link>
              {passed && !courseCredentialsUnlocked ? (
                <Link
                  href={`/my-learning/course/${slug}#credentials`}
                  className="rounded-md border border-emerald-300/35 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100"
                >
                  View progress & credentials
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
            {(
              [
                ["Overview", CircleHelp, `/my-learning/course/${slug}`],
                ["Course Content", BookOpen, `/my-learning/course/${slug}`],
                ["Modules", ListChecks, `/my-learning/course/${slug}`],
                ["Assignments", FileText, `/my-learning?tab=assignments`],
                ["Exams", ShieldCheck, null],
                ["Discussion", CircleHelp, `/my-learning?tab=community`],
                ["Resources", FileText, `/my-learning/course/${slug}`],
                ["Help & Support", Headset, "/contact"],
              ] as const
            ).map(([label, Icon, href]) =>
              href ? (
                <Link
                  key={label}
                  href={href}
                  className="inline-flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-white/5"
                >
                  <Icon size={14} className="text-gray-400" />
                  {label}
                </Link>
              ) : (
                <span
                  key={label}
                  className="inline-flex w-full items-center gap-2 rounded-md bg-violet-500/20 px-2.5 py-2 text-left text-sm text-violet-100"
                >
                  <Icon size={14} className="text-violet-300" />
                  {label}
                </span>
              ),
            )}
            <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-sm font-semibold">Need Help?</p>
              <p className="mt-1 text-xs text-gray-400">If you face any issues during exam, contact support.</p>
              <Link
                href="/contact"
                className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-violet-300/35 bg-violet-500/10 py-1.5 text-xs text-violet-100 hover:bg-violet-500/20"
              >
                Contact Support
              </Link>
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
