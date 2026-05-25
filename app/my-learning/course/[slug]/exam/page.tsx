"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  AlarmClock,
  BookOpen,
  ChevronRight,
  CircleHelp,
  FileText,
  Flag,
  Headset,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import type { CourseCurriculumItem, CourseCurriculumModule, CourseFinalExam } from "@/lib/content-schema";

export const dynamic = "force-dynamic";

type CourseExamPayload = {
  slug: string;
  title: string;
  curriculum: CourseCurriculumModule[] | null;
  finalExam: CourseFinalExam | null;
};

function getFirstExamRowInModule(mod: CourseCurriculumModule | undefined): CourseCurriculumItem | undefined {
  if (!mod) return undefined;
  const top = mod.items.find((i) => i.kind === "exam");
  if (top) return top;
  for (const sm of mod.subModules ?? []) {
    const row = sm.items.find((i) => i.kind === "exam");
    if (row) return row;
  }
  return undefined;
}

const quizQuestions = [
  {
    question: "What is monitoring in HACCP?",
    options: ["Ignoring hazards", "Checking CCPs regularly", "Hiring workers", "Reducing cost"],
    correctIndex: 1,
  },
  {
    question: "Which hazard type includes pesticides?",
    options: ["Biological", "Chemical", "Physical", "Radiological"],
    correctIndex: 1,
  },
  {
    question: "What does HACCP stand for?",
    options: [
      "Hazard Analysis Critical Control Point",
      "Hazard Assessment Critical Control Process",
      "Health Analysis Critical Control Point",
      "Hazard Analysis Control Check Process",
    ],
    correctIndex: 0,
  },
  {
    question: "Which record is important in HACCP?",
    options: ["Employee salary record", "HACCP documentation", "Sales report", "Marketing plan"],
    correctIndex: 1,
  },
  {
    question: "What should be done if a CCP is out of control?",
    options: ["Ignore it", "Take corrective action", "Stop production permanently", "Change supplier"],
    correctIndex: 1,
  },
  {
    question: "Which type of system is HACCP?",
    options: ["Reactive system", "Preventive system", "Financial system", "Marketing system"],
    correctIndex: 1,
  },
  {
    question: "What is a Critical Control Point (CCP)?",
    options: ["A place to store food", "A step where hazard can be controlled", "A cleaning area", "A packaging method"],
    correctIndex: 1,
  },
  {
    question: "What is the first principle of HACCP?",
    options: ["Identify hazards", "Establish monitoring procedures", "Set corrective actions", "Record keeping"],
    correctIndex: 0,
  },
  {
    question: "What is the main purpose of HACCP?",
    options: ["Increase production speed", "Ensure food safety", "Reduce labor cost", "Improve packaging"],
    correctIndex: 1,
  },
  {
    question: "Which of the following is a biological hazard?",
    options: ["Glass pieces", "Bacteria", "Cleaning chemicals", "Metal fragments"],
    correctIndex: 1,
  },
];

function CourseExamPageInner() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params?.slug ?? "course";
  const isFinalExam = searchParams.get("final") === "1";
  const moduleNumber = Math.max(1, Number(searchParams.get("module") || "1"));
  const moduleIdx = moduleNumber - 1;

  const [courseMeta, setCourseMeta] = useState<CourseExamPayload | null | undefined>(undefined);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reviewedQuestions, setReviewedQuestions] = useState<number[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<number | null>>(
    () => Array.from({ length: quizQuestions.length }, () => null),
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number | null>(null);
  const currentQuestion = quizQuestions[currentQuestionIndex];
  const answeredQuestions = useMemo(
    () => selectedAnswers.map((answer, idx) => (answer !== null ? idx : -1)).filter((idx) => idx >= 0),
    [selectedAnswers],
  );
  const markedQuestions = reviewedQuestions.length;
  const notAnswered = quizQuestions.length - answeredQuestions.length;
  const score = useMemo(
    () =>
      selectedAnswers.reduce<number>((sum, answer, idx) => {
        if (answer === null) return sum;
        return sum + (answer === quizQuestions[idx].correctIndex ? 1 : 0);
      }, 0),
    [selectedAnswers],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as CourseExamPayload;
        if (!cancelled) setCourseMeta(data);
      } catch {
        if (!cancelled) setCourseMeta(null);
      }
    })();
    return () => {
      cancelled = true;
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
    const passing = typeof row?.examPassingScorePercent === "number" ? row.examPassingScorePercent : 60;
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

  const mm =
    timeRemainingSec === null ? "—" : String(Math.floor(timeRemainingSec / 60)).padStart(2, "0");
  const ss = timeRemainingSec === null ? "—" : String(timeRemainingSec % 60).padStart(2, "0");

  const markModuleCompleted = () => {
    if (isFinalExam) return;
    const key = `sft_completed_modules_${slug}`;
    try {
      const raw = window.localStorage.getItem(key);
      const existing = raw ? (JSON.parse(raw) as number[]) : [];
      const merged = Array.from(new Set([...(Array.isArray(existing) ? existing : []), moduleNumber]));
      window.localStorage.setItem(key, JSON.stringify(merged));
    } catch {
      // keep UI working even if local storage fails
    }
  };

  const saveModuleScorePercent = (percent: number) => {
    if (isFinalExam) return;
    const key = `sft_module_exam_scores_${slug}`;
    try {
      const raw = window.localStorage.getItem(key);
      const prev = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      const prevScore =
        prev && typeof prev === "object" && typeof prev[String(moduleNumber)] === "number"
          ? prev[String(moduleNumber)]
          : 0;
      // Keep best attempt so retries can only improve certification status.
      const next = {
        ...(prev && typeof prev === "object" ? prev : {}),
        [String(moduleNumber)]: Math.max(prevScore, percent),
      };
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // keep UI working even if local storage fails
    }
  };

  useEffect(() => {
    if (!isSubmitted || !examRuntime) return;
    const percentage = Math.round((score / quizQuestions.length) * 100);
    saveModuleScorePercent(percentage);
    if (percentage >= examRuntime.passingScorePercent) {
      markModuleCompleted();
    }
  }, [isSubmitted, score, examRuntime, isFinalExam, moduleNumber, slug]);

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
            Certification is based on overall module exam performance. Score at least 60% across module exams.
          </p>
          <Link href={`/my-learning/course/${slug}`} className="mt-5 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold">
            Back to My Learning
          </Link>
        </main>

      </div>
    );
  }

  if (isSubmitted) {
    const percentage = Math.round((score / quizQuestions.length) * 100);
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
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-400">Total Questions</p>
                <p className="text-2xl font-bold">{quizQuestions.length}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-400">Correct</p>
                <p className="text-2xl font-bold">{score}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-400">Score</p>
                <p className="text-2xl font-bold">{percentage}%</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-400">Status</p>
                <p className={`text-2xl font-bold ${passed ? "text-emerald-300" : "text-rose-300"}`}>
                  {passed ? "PASS" : "FAIL"}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/my-learning/course/${slug}`} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold">
                Back to My Learning
              </Link>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setCurrentQuestionIndex(0);
                  setSelectedAnswers(Array.from({ length: quizQuestions.length }, () => null));
                  setReviewedQuestions([]);
                  setTimeRemainingSec(examRuntime.timed ? examRuntime.durationSec : null);
                }}
                className="rounded-md border border-white/15 bg-black/25 px-4 py-2 text-sm"
              >
                Retake Exam
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
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-white/10 bg-black/30 px-2 py-1">
                  Total questions: {quizQuestions.length}
                </span>
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
              <div className="mb-3 flex items-center justify-between">
                <p className="text-violet-300">
                  Question {currentQuestionIndex + 1} / {quizQuestions.length}
                </p>
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
              <h2 className="text-3xl font-bold">{currentQuestion.question}</h2>

              <div className="mt-4 space-y-2">
                {currentQuestion.options.map((option, idx) => (
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
                  onClick={() => setCurrentQuestionIndex((prev) => Math.min(quizQuestions.length - 1, prev + 1))}
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
            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <p className="text-xs text-gray-400">Time Remaining</p>
              <p className="mt-1 inline-flex items-center gap-2 text-3xl font-bold">
                <AlarmClock size={20} className="text-amber-300" />{" "}
                {examRuntime.timed ? `${mm}:${ss}` : "—"}
              </p>
              {!examRuntime.timed ? (
                <p className="mt-1 text-[11px] text-gray-500">This attempt is not timed.</p>
              ) : null}
              <button
                onClick={() => setIsSubmitted(true)}
                className="mt-3 w-full rounded-md border border-red-300/35 bg-red-500/10 py-2 text-sm text-red-200"
              >
                End Exam
              </button>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Your Progress</span>
                <span>
                  {answeredQuestions.length} / {quizQuestions.length} Answered
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-violet-500"
                  style={{ width: `${Math.round((answeredQuestions.length / quizQuestions.length) * 100)}%` }}
                />
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-[10px]">
                <span className="rounded border border-white/10 bg-black/25 px-1 py-0.5 text-center">Answered: {answeredQuestions.length}</span>
                <span className="rounded border border-white/10 bg-black/25 px-1 py-0.5 text-center">Not Answered: {notAnswered}</span>
                <span className="rounded border border-white/10 bg-black/25 px-1 py-0.5 text-center">Marked: {markedQuestions}</span>
                <span className="rounded border border-white/10 bg-black/25 px-1 py-0.5 text-center">Left: {notAnswered}</span>
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold">Question Navigator</p>
                <button className="text-xs text-violet-200">Collapse</button>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-1 text-[10px]">
                <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/25 px-1.5 py-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Answered
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/25 px-1.5 py-0.5">
                  <span className="h-2 w-2 rounded-full bg-gray-500" /> Not Answered
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/25 px-1.5 py-0.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Marked
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/25 px-1.5 py-0.5">
                  <span className="h-2 w-2 rounded-full bg-violet-400" /> Current
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: quizQuestions.length }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-8 w-8 rounded-full border text-xs ${
                      idx === currentQuestionIndex
                        ? "border-violet-300/40 bg-violet-500/20 text-violet-100"
                        : reviewedQuestions.includes(idx)
                          ? "border-rose-300/35 bg-rose-500/15 text-rose-200"
                          : answeredQuestions.includes(idx)
                            ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-200"
                            : "border-white/10 bg-black/25 text-gray-300"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </article>
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
