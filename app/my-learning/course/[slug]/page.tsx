"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock3,
  FileText,
  MessageCircle,
  Play,
  PlayCircle,
  Search,
} from "lucide-react";
import TutorLedProgramClient from "@/components/TutorLedProgramClient";
import { defaultTutorLedPrograms, type TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { openTutorLedProgram } from "@/lib/push-checkout-or-login";

const moduleItems = [
  {
    title: "General Instructions for Candidate",
    duration: "20:15",
    entries: ["Module Exam"],
  },
  {
    title: "Introduction Module: Introduction to Food Safety",
    duration: "22:10",
    entries: ["1.1 Part 1", "1.2 Part 2", "1.3 Module Exam"],
  },
  {
    title: "Module 2: HACCP Awareness and Food Safety Basics",
    duration: "24:30",
    entries: ["2.1 Part 1", "2.2 Part 2", "2.3 Module Exam"],
  },
  {
    title: "Module 3: Food Safety Culture",
    duration: "21:05",
    entries: ["3.1 Part 1", "3.2 Part 2", "3.3 Module Exam"],
  },
  {
    title: "Module 4: Food Handler Behaviour and Hygiene",
    duration: "21:30",
    entries: ["4.1 Part 1", "4.2 Part 2", "4.3 Module Exam"],
  },
  {
    title: "Module 5: Food Safety and Consumer Health",
    duration: "24:45",
    entries: ["5.1 Part 1", "5.2 Part 2", "5.3 Module Exam"],
  },
  {
    title: "Module 6: Company Reputation and Legal Responsibilities",
    duration: "26:10",
    entries: ["6.1 Part 1", "6.2 Part 2", "6.3 Module Exam"],
  },
  {
    title: "Module 7: Food Hazards and Food Safety Management",
    duration: "22:35",
    entries: ["7.1 Part 1", "7.2 Part 2", "7.3 Module Exam"],
  },
  {
    title: "Module 8: Foodborne Hazards",
    duration: "25:30",
    entries: ["8.1 Part 1", "8.2 Part 2", "8.3 Module Exam"],
  },
  {
    title: "Module 9: Biological Hazards",
    duration: "24:20",
    entries: ["9.1 Part 1", "9.2 Part 2", "9.3 Module Exam"],
  },
  {
    title: "Module 10: Chemical Hazards",
    duration: "30:00",
    entries: ["10.1 Part 1", "10.2 Part 2", "10.3 Module Exam"],
  },
  {
    title: "Module 11: Physical Hazards",
    duration: "18:45",
    entries: ["11.1 Part 1", "11.2 Part 2", "11.3 Module Exam"],
  },
];

const toTitle = (slug: string) =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

type CourseCurriculumItem = {
  label?: string;
  kind?: "video" | "reading" | "exam";
  videoUrl?: string;
  examUploadUrl?: string;
  description?: string;
  about?: string;
  learningOutcomes?: string[];
  notes?: string;
  captions?: string;
  pdfUrl?: string;
  podcastUrl?: string;
  resourceUrl?: string;
  downloadUrl?: string;
};

type CourseCurriculumModule = {
  title?: string;
  items?: CourseCurriculumItem[];
};

export default function CourseLearningPlayerPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug ?? "course";
  const courseTitle = useMemo(() => toTitle(slug), [slug]);
  const [apiCourseTitle, setApiCourseTitle] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [curriculum, setCurriculum] = useState<CourseCurriculumModule[]>([]);
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const [selectedEntryIdx, setSelectedEntryIdx] = useState(0);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const [isPurchased, setIsPurchased] = useState(false);
  const [purchaseHydrated, setPurchaseHydrated] = useState(false);
  const [overallExamPercent, setOverallExamPercent] = useState<number | null>(null);
  const [tutorLedResolved, setTutorLedResolved] = useState<TutorLedProgramStored | null | "pending">("pending");

  useEffect(() => {
    setTutorLedResolved("pending");
    let cancelled = false;

    let isTutorLedPurchase = false;
    let purchasedThisSlug = false;
    try {
      const raw = window.localStorage.getItem("sft_purchased_courses");
      const parsed = raw ? (JSON.parse(raw) as Array<{ slug?: string; deliveryKind?: string }>) : [];
      if (Array.isArray(parsed)) {
        const row = parsed.find((c) => (c.slug ?? "").trim() === slug);
        purchasedThisSlug = !!row;
        isTutorLedPurchase = row?.deliveryKind === "tutor-led";
      }
    } catch {
      isTutorLedPurchase = false;
      purchasedThisSlug = false;
    }

    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setTutorLedResolved(null);
          return;
        }
        const data = (await res.json()) as { tutorLedPrograms?: TutorLedProgramStored[] };
        const apiList = Array.isArray(data.tutorLedPrograms) ? data.tutorLedPrograms : [];
        const mergedBySlug = new Map<string, TutorLedProgramStored>();
        for (const p of defaultTutorLedPrograms) mergedBySlug.set(p.slug, p);
        for (const p of apiList) mergedBySlug.set(p.slug, p);
        const programs = Array.from(mergedBySlug.values());
        const slugHit = programs.find((p) => p.slug === slug) ?? null;
        const hit =
          slugHit &&
          (isTutorLedPurchase || (Boolean(slugHit.published) && !purchasedThisSlug))
            ? slugHit
            : null;
        if (!cancelled) setTutorLedResolved(hit);
      } catch {
        if (!cancelled) setTutorLedResolved(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const key = `sft_completed_modules_${slug}`;
    const load = () => {
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as number[]) : [];
        setCompletedModules(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCompletedModules([]);
      }
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [slug]);

  useEffect(() => {
    try {
      const key = `sft_module_exam_scores_${slug}`;
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        setOverallExamPercent(null);
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, number>;
      const vals = Object.values(parsed ?? {}).filter((v) => typeof v === "number");
      if (!vals.length) {
        setOverallExamPercent(null);
        return;
      }
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      setOverallExamPercent(avg);
    } catch {
      setOverallExamPercent(null);
    }
  }, [slug, completedModules]);

  useEffect(() => {
    setPurchaseHydrated(false);
    try {
      const raw = window.localStorage.getItem("sft_purchased_courses");
      if (!raw) {
        setIsPurchased(false);
        return;
      }
      const parsed = JSON.parse(raw) as Array<{ slug?: string; title?: string }>;
      if (!Array.isArray(parsed)) {
        setIsPurchased(false);
        return;
      }
      const bought = parsed.some((course) => (course.slug ?? "").trim() === slug);
      setIsPurchased(bought);
    } catch {
      setIsPurchased(false);
    } finally {
      setPurchaseHydrated(true);
    }
  }, [slug]);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!res.ok) {
          setCurriculum([]);
          setVideoSrc("");
          return;
        }
        const data = (await res.json()) as {
          title?: string;
          curriculum?: CourseCurriculumModule[];
        };
        if (data.title?.trim()) setApiCourseTitle(data.title.trim());
        if (data.curriculum?.length) {
          setCurriculum(data.curriculum);
          setSelectedModuleIdx(0);
          setSelectedEntryIdx(0);

          for (const mod of data.curriculum) {
            for (const item of mod.items ?? []) {
              if (item.kind === "video" && item.videoUrl?.trim()) {
                setVideoSrc(item.videoUrl.trim());
                return;
              }
            }
          }
          setVideoSrc("");
          return;
        }
        setCurriculum([]);
        setVideoSrc("");
      } catch {
        setCurriculum([]);
        setVideoSrc("");
      }
    };
    void loadCourse();
  }, [slug]);

  const activeModule = curriculum[selectedModuleIdx];
  const activeItem = activeModule?.items?.[selectedEntryIdx];

  useEffect(() => {
    const itemVideo = activeItem?.kind === "video" ? activeItem.videoUrl?.trim() : "";
    if (itemVideo) {
      setVideoSrc(itemVideo);
      return;
    }
    const moduleVideo = activeModule?.items?.find((it) => it.kind === "video" && it.videoUrl?.trim())?.videoUrl?.trim();
    if (moduleVideo) {
      setVideoSrc(moduleVideo);
    }
  }, [activeItem?.kind, activeItem?.videoUrl, activeModule]);

  const resourceLinks = useMemo(() => {
    const out: Array<{ label: string; url: string }> = [];
    if (activeItem?.pdfUrl?.trim()) out.push({ label: "PDF", url: activeItem.pdfUrl.trim() });
    if (activeItem?.podcastUrl?.trim()) out.push({ label: "Podcast", url: activeItem.podcastUrl.trim() });
    if (activeItem?.resourceUrl?.trim()) out.push({ label: "Resources", url: activeItem.resourceUrl.trim() });
    if (activeItem?.downloadUrl?.trim()) out.push({ label: "Download", url: activeItem.downloadUrl.trim() });
    for (const row of activeModule?.items ?? []) {
      if (row.kind === "reading" && row.videoUrl?.trim()) {
        out.push({ label: row.label?.trim() || "Reading resource", url: row.videoUrl.trim() });
      }
      if (row.kind === "exam" && row.examUploadUrl?.trim()) {
        out.push({ label: row.label?.trim() || "Exam resource", url: row.examUploadUrl.trim() });
      }
    }
    return out;
  }, [activeModule]);

  const toolItems = useMemo(
    () => [
      { label: "Notes", value: activeItem?.notes?.trim() || "" },
      { label: "Captions", value: activeItem?.captions?.trim() || "" },
      { label: "PDF", value: activeItem?.pdfUrl?.trim() || "" },
      { label: "Podcast", value: activeItem?.podcastUrl?.trim() || "" },
      { label: "Resources", value: activeItem?.resourceUrl?.trim() || "" },
      { label: "Download", value: activeItem?.downloadUrl?.trim() || "" },
    ],
    [activeItem],
  );

  if (tutorLedResolved === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060b17] text-white">
        <p className="text-sm text-gray-400">Loading course…</p>
      </div>
    );
  }

  if (tutorLedResolved) {
    if (!purchaseHydrated) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#060b17] text-white">
          <p className="text-sm text-gray-400">Loading course…</p>
        </div>
      );
    }
    if (!isPurchased) {
      return (
        <div className="min-h-screen bg-[#060b17] text-white">
          <main className="mx-auto max-w-[1760px] px-4 py-8 md:px-6 xl:px-8">
            <Link href="/my-learning?tab=learning" className="text-xs text-gray-400 hover:text-amber-200">
              ← My Learning
            </Link>
            <h1 className="mt-4 text-3xl font-bold">{tutorLedResolved.title}</h1>
            <p className="mt-2 max-w-xl text-gray-300">
              Complete enrollment to access your live cohort space, recordings, and schedule from My Learning.
            </p>
            <button
              type="button"
              onClick={() => openTutorLedProgram(router, tutorLedResolved.slug)}
              className="mt-6 inline-flex rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-bold text-black"
            >
              Enroll now
            </button>
          </main>
        </div>
      );
    }
    return <TutorLedProgramClient program={tutorLedResolved} enrolledLearning />;
  }

  return (
    <div className="min-h-screen bg-[#060b17] text-white">
      <main className="mx-auto max-w-[1760px] px-4 py-5 md:px-6 xl:px-8">
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/my-learning?tab=learning" className="hover:text-amber-200">
            My Learning
          </Link>
          <ChevronRight size={12} />
          <span className="text-violet-200">{courseTitle}</span>
        </div>

        <h1 className="text-4xl font-bold">{apiCourseTitle || courseTitle}</h1>

        <section className="mt-4 grid gap-3 xl:grid-cols-[1.9fr_1fr]">
          <div className="space-y-3">
            <article className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1324]">
              <div className="relative bg-black">
                {videoSrc ? (
                  <video
                    src={videoSrc}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-[320px] w-full bg-black object-contain md:h-[460px] xl:h-[560px]"
                  />
                ) : (
                  <div className="flex h-[320px] w-full items-center justify-center bg-black text-sm text-gray-400 md:h-[460px] xl:h-[560px]">
                    No video uploaded for this lesson yet.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold">{activeItem?.label?.trim() || activeModule?.title || "Lesson"}</h3>
                  <p className="mt-1 text-sm text-gray-300">
                    {activeItem?.description?.trim() ||
                      "Follow module lessons in order, then attempt module assessments and the final exam."}
                  </p>
                </div>
                <button className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm text-gray-300">
                  <Bookmark size={14} /> Bookmark
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="mb-3 rounded-md border border-white/10 bg-black/30 p-2.5">
                  <p className="text-xs font-semibold tracking-wide text-violet-100">Learning Tools</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                    {[
                      ...toolItems,
                    ].map((tool) => (
                      <button
                        key={tool.label}
                        disabled={!tool.value}
                        className={`rounded-md border px-2 py-1.5 text-xs transition ${
                          isPurchased && tool.value
                            ? "border-amber-300/45 bg-amber-500/20 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
                            : "border-white/10 bg-black/35 text-gray-500"
                        }`}
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-semibold text-violet-100">About the Course</p>
                <p className="mt-2 text-sm leading-7 text-gray-300">
                  {activeItem?.about?.trim()
                    ? activeItem.about.trim()
                    : `Welcome to the ${apiCourseTitle || courseTitle} course. This program uses structured video modules and short assessments to guide your learning. After completing all required modules and assessments, your certificate becomes available.`}
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-300">
                  {activeItem?.description?.trim()
                    ? activeItem.description.trim()
                    : "Watch lessons fully, use pause/replay for clarity, then proceed to the assessment. Take notes as you go and contact support when needed."}
                </p>

                <p className="mt-4 text-sm font-semibold text-violet-100">Learning Outcomes</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {(
                    activeItem?.learningOutcomes?.length
                      ? activeItem.learningOutcomes
                      : [
                          `Understand core concepts covered in ${apiCourseTitle || courseTitle}`,
                          "Apply practical techniques from each module",
                          "Build confidence through guided videos and checks",
                          "Review key standards and implementation steps",
                          "Use supporting resources and reading materials",
                          "Prepare for module examinations",
                          "Track progress and complete the full pathway",
                          "Become certificate-ready after final assessment",
                        ]
                  ).map((point) => (
                    <div key={point} className="rounded-md border border-white/10 bg-black/30 p-2 text-xs text-gray-300">
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button className="rounded-md border border-violet-300/35 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100">
                  Mark as Complete
                </button>
                <div className="flex items-center gap-2">
                  <button className="rounded-md border border-white/15 bg-black/25 px-6 py-2 text-sm">Previous</button>
                  <button className="rounded-md bg-violet-600 px-8 py-2 text-sm font-semibold">Next</button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1.55fr_1fr]">
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center gap-5 text-sm">
                    <span className="border-b-2 border-violet-400 pb-1 text-violet-100">Notes</span>
                    <span className="text-gray-400">Resources</span>
                    <span className="text-gray-400">Ask a Doubt</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <input
                      value={activeItem?.notes ?? ""}
                      onChange={() => {}}
                      readOnly
                      placeholder="No lesson notes added in admin."
                      className="rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm placeholder:text-gray-500"
                    />
                    <button className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold">Save Note</button>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">Resources</p>
                    <button className="text-xs text-violet-200">View All</button>
                  </div>
                  <div className="space-y-2">
                    {resourceLinks.length > 0 ? (
                      resourceLinks.map((res) => (
                        <a
                          key={`${res.label}-${res.url}`}
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-md border border-white/10 bg-black/30 p-2 hover:border-violet-300/35"
                        >
                          <p className="text-sm">{res.label}</p>
                          <p className="text-xs text-gray-400">Open resource</p>
                        </a>
                      ))
                    ) : (
                      <div className="rounded-md border border-white/10 bg-black/30 p-2 text-xs text-gray-400">
                        No uploaded resources for this module yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          </div>

          <aside className="space-y-3">
            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-md border border-white/10 bg-black/30 p-2">
                  <p className="text-xs text-gray-400">Your Progress</p>
                  <p className="text-xl font-bold">35% Completed</p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/30 p-2">
                  <p className="text-xs text-gray-400">Next Exam</p>
                  <p className="text-xl font-bold">After Module 12</p>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold">Course Modules ({curriculum.length})</h3>
                <button className="text-xs text-violet-200">Expand All</button>
              </div>
              <div className="space-y-1.5">
                {curriculum.map((module, idx) => (
                  <div
                    key={module.title}
                    className={`rounded-md border px-2 py-2 text-sm ${
                      completedModules.includes(idx + 1)
                        ? "border-emerald-300/35 bg-emerald-500/12 text-emerald-100"
                        : idx === selectedModuleIdx
                          ? "border-violet-300/35 bg-linear-to-r from-violet-500/20 to-[#121a32] text-violet-100"
                          : "border-white/10 bg-black/25 text-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-start gap-2">
                        <span
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold ${
                            completedModules.includes(idx + 1)
                              ? "bg-emerald-500/30 text-emerald-100"
                              : idx === selectedModuleIdx
                                ? "bg-violet-500/35 text-violet-100"
                                : "bg-white/10 text-gray-200"
                          }`}
                        >
                          {idx === 0 ? "GI" : idx}
                        </span>
                        <span className="line-clamp-2 font-semibold">{module.title}</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        {completedModules.includes(idx + 1) && (
                          <span className="rounded border border-emerald-300/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-200">
                            Completed
                          </span>
                        )}
                        <span className="text-xs text-gray-400">--:--</span>
                        {idx === selectedModuleIdx ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                      </div>
                    </div>
                    {idx === selectedModuleIdx && (
                      <div className="mt-1.5 space-y-1 rounded border border-white/10 bg-black/25 p-2">
                        {(module.items ?? []).map((entry, entryIdx) => {
                          const entryKey = `${module.title ?? "module"}-${entry.label ?? "entry"}-${entry.kind ?? "item"}-${entryIdx}`;
                          return entry.kind === "exam" ? (
                            <Link
                              key={entryKey}
                              href={`/my-learning/course/${slug}/exam?module=${idx + 1}`}
                              className="flex items-center justify-between rounded bg-emerald-500/15 px-1.5 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/25"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <Circle size={10} className="text-emerald-300" />
                                {entry.label?.trim() || `Module ${idx + 1} exam`}
                              </span>
                              <span className="text-[10px] text-emerald-200">Open Exam</span>
                            </Link>
                          ) : (
                            <button
                              key={entryKey}
                              type="button"
                              onClick={() => {
                                setSelectedModuleIdx(idx);
                                setSelectedEntryIdx(entryIdx);
                              }}
                              className={`flex w-full items-center justify-between rounded px-1.5 py-1 text-[11px] ${
                                entryIdx === selectedEntryIdx
                                  ? "bg-violet-500/20 text-violet-100"
                                  : "bg-black/30 text-gray-300"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {entryIdx === 0 ? (
                                  <Play size={10} className="text-emerald-300" />
                                ) : (
                                  <Circle size={10} className="text-violet-300" />
                                )}
                                {entry.label?.trim() || `Lesson ${entryIdx + 1}`}
                              </span>
                              <span className="text-[10px] text-gray-400">{entry.kind === "video" ? "Video" : "Reading"}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {curriculum.length === 0 ? (
                  <div className="rounded-md border border-white/10 bg-black/25 px-3 py-4 text-sm text-gray-400">
                    No modules found for this course yet.
                  </div>
                ) : null}
              </div>
              <div className="mt-3 rounded-md border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Certification rule: overall module exam score must be at least <strong>60%</strong>.
                {overallExamPercent !== null ? (
                  <span className="ml-2 inline-flex rounded bg-black/25 px-2 py-0.5 text-xs">
                    Current overall: {overallExamPercent}% {overallExamPercent >= 60 ? "✓ Eligible" : "✗ Not eligible"}
                  </span>
                ) : null}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <h3 className="text-sm font-semibold">Quick Tools</h3>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <button className="rounded border border-white/10 bg-black/25 px-2 py-1.5">
                  {activeItem?.notes?.trim() ? "Notes Added" : "No Notes"}
                </button>
                <button className="rounded border border-white/10 bg-black/25 px-2 py-1.5">
                  {resourceLinks.length > 0 ? "Resources Ready" : "No Resources"}
                </button>
                <button className="rounded border border-white/10 bg-black/25 px-2 py-1.5">
                  {activeItem?.captions?.trim() ? "Captions Ready" : "No Captions"}
                </button>
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-400">
                <Search size={12} /> Search inside module content
              </div>
              {activeItem?.pdfUrl?.trim() ? (
                <a
                  href={activeItem.pdfUrl.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-xs text-violet-300 underline"
                >
                  <FileText size={12} /> Open lesson PDF
                </a>
              ) : null}
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-400">
                <MessageCircle size={12} /> Ask mentor for clarification
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-400">
                <CalendarDays size={12} /> Next live Q&A on Friday
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 size={12} /> Certificate unlocks at 60%+ overall module exam score
              </div>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
