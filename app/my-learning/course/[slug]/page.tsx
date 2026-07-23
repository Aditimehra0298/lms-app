"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ResolvedLearningSection } from "@/lib/course-learning-resolve";
import { resolveLearningSection } from "@/lib/course-learning-resolve";
import {
  courseToolResourceLinks,
  resolveCourseLearningToolItems,
} from "@/lib/course-learning-tools";
import { BRAND_LOGO_PUBLIC_PATH } from "@/lib/brand-logo";
import BrandLogo from "@/components/BrandLogo";
import CourseLearningResourceLink, {
  openCourseLearningResource,
} from "@/components/CourseLearningResourceLink";
import { SecureCourseVideoPlayer } from "@/components/SecureCourseVideoPlayer";
import {
  BadgeCheck,
  Bookmark,
  BookOpen,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Download,
  FileText,
  Headphones,
  Link2,
  Lock,
  MessageCircle,
  Play,
  PlayCircle,
  Presentation,
  ScrollText,
} from "lucide-react";
import TutorLedProgramClient from "@/components/TutorLedProgramClient";
import { defaultTutorLedPrograms, type TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  isCoursePurchased,
  subscribeTutorLedPurchases,
} from "@/lib/tutor-led-enrollment-client";
import { getCurriculumForCourse, normalizeCurriculumModules } from "@/lib/course-detail-template";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";
import { curriculumModulesForLearner } from "@/lib/curriculum-learner-filter";
import type { CourseCurriculumModule as SchemaCurriculumModule } from "@/lib/content-schema";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { requestCourseCertificateClient } from "@/lib/request-course-certificate-client";
import { notifyCourseCompletionClient } from "@/lib/notify-course-completion-client";
import { syncLearnerCourseProgressFromServer } from "@/lib/learner-progress-sync-client";
import {
  computeCombinedExamGrade,
  DEFAULT_MODULE_EXAM_PASS_PERCENT,
  examModuleNumbers,
  learnerCredentialsEligible,
} from "@/lib/learner-exam-scores";
import { learnerExamDisplayLabel } from "@/lib/my-learning-exams";
import { CourseCompletedDashboard } from "@/components/CourseCompletedDashboard";
import {
  clearPendingCompletionCelebration,
  markCompletionCelebrationSeen,
} from "@/components/CourseCompletionCelebration";
import { CourseCompletionRewards } from "@/components/CourseCompletionRewards";
import { CoursePlayerFeedbackSection } from "@/components/CoursePlayerFeedbackSection";
import { CoursePlayerExploreCourses } from "@/components/CoursePlayerExploreCourses";
import { CoursePlayerProgressSnapshot } from "@/components/CoursePlayerProgressSnapshot";
import {
  COURSE_PROGRESS_UPDATED_EVENT,
  markModuleCompleted,
  normalizeCompletedModulesForCurriculum,
  readCompletedModules,
} from "@/lib/learner-course-progress";
import { openTutorLedProgram } from "@/lib/push-checkout-or-login";
import {
  findLessonNavIndex,
  flattenLearnerLessons,
} from "@/lib/course-lesson-nav";
import type { CertificateRowDto } from "@/lib/certificate-types";
import { readJsonResponse } from "@/lib/safe-json";
import type { AdminContent } from "@/lib/content-schema";
import type { ManagedCourseCertificateConfig } from "@/lib/certificate-program-config";
import { resolveCertificateAssetsForSlug } from "@/lib/global-certificate-assets";
import {
  healModuleWatchRecord,
  moduleCurriculumRows,
  modulePreviewProgress,
  type PreviewGateModule,
  PREVIEW_WATCH_UPDATED_EVENT,
  readModuleWatchedSeconds,
  requiredPreviewSecondsForModule,
  writeModuleWatchedSeconds,
} from "@/lib/learner-preview-gate";

const toTitle = (slug: string) =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

type CourseCurriculumItem = {
  label?: string;
  kind?: "video" | "reading" | "exam";
  videoUrl?: string;
  lessonVideoSizeMb?: number;
  previewLimitMinutes?: number;
  examUploadUrl?: string;
  description?: string;
  lessonDurationMinutes?: number;
  about?: string;
  learningOutcomes?: string[];
  notes?: string;
  captions?: string;
  pdfUrl?: string;
  pptUrl?: string;
  podcastUrl?: string;
  webhookUrl?: string;
  resourceUrl?: string;
  downloadUrl?: string;
};

type CourseCurriculumModule = {
  title?: string;
  items?: CourseCurriculumItem[];
  subModules?: Array<{ title?: string; items?: CourseCurriculumItem[] }>;
};

function mergeTutorLedPrograms(apiList: TutorLedProgramStored[]): TutorLedProgramStored[] {
  const mergedBySlug = new Map<string, TutorLedProgramStored>();
  for (const p of defaultTutorLedPrograms) mergedBySlug.set(p.slug, p);
  for (const p of apiList) mergedBySlug.set(p.slug, p);
  return Array.from(mergedBySlug.values());
}

function resolveTutorLedHit(
  programs: TutorLedProgramStored[],
  slug: string,
  purchasedThisSlug: boolean,
  isTutorLedPurchase: boolean,
): TutorLedProgramStored | null {
  const slugHit = programs.find((p) => p.slug === slug) ?? null;
  if (!slugHit) return null;
  // Self-paced (managed) purchase always uses the video player, even when slug exists in tutor-led catalog.
  if (purchasedThisSlug && !isTutorLedPurchase) return null;
  if (isTutorLedPurchase) return slugHit;
  if (purchasedThisSlug) return slugHit;
  if (Boolean(slugHit.published) && !purchasedThisSlug) return slugHit;
  return null;
}

export default function CourseLearningPlayerPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const paramSlug = params?.slug ?? "course";
  const slug = canonicalCourseSlug(paramSlug);
  const courseTitle = useMemo(() => toTitle(slug), [slug]);
  const [apiCourseTitle, setApiCourseTitle] = useState<string | null>(null);
  const [activeVideoStoredUrl, setActiveVideoStoredUrl] = useState<string>("");
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [curriculum, setCurriculum] = useState<CourseCurriculumModule[]>([]);
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const [selectedEntryIdx, setSelectedEntryIdx] = useState(0);
  const [completedModules, setCompletedModules] = useState<number[]>(() => readCompletedModules(slug));
  const [progressHydrated, setProgressHydrated] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(() => new Set([0]));
  const isPurchased = useSyncExternalStore(
    subscribeTutorLedPurchases,
    () => isCoursePurchased(slug),
    () => false,
  );
  const [combinedExamPercent, setCombinedExamPercent] = useState<number | null>(null);
  const [allExamsPassed, setAllExamsPassed] = useState(false);
  const [examMarksSummary, setExamMarksSummary] = useState<{ correct: number; total: number } | null>(null);
  const [watchedSecondsByModule, setWatchedSecondsByModule] = useState<Record<number, number>>({});
  const watchSampleRef = useRef<{ module: number; at: number; position: number } | null>(null);
  const watchAccumRef = useRef<Record<number, number>>({});
  const [learningCopy, setLearningCopy] = useState<ResolvedLearningSection>(() =>
    resolveLearningSection({
      slug,
      title: courseTitle,
      subtitle: "",
      category: "",
      level: "",
      duration: "",
      rating: "",
      learners: "",
      price: "",
      oldPrice: "",
      image: "",
      published: true,
    }),
  );
  const [activeLearningTool, setActiveLearningTool] = useState<string>("E-Workbook");
  const [tutorLedResolved, setTutorLedResolved] = useState<TutorLedProgramStored | null>(
    () => defaultTutorLedPrograms.find((p) => p.slug === slug) ?? null,
  );
  const [courseDuration, setCourseDuration] = useState("");
  const [certAssets, setCertAssets] = useState({ badge: "", template: "", transcript: "" });
  const [certLayout, setCertLayout] = useState<
    Pick<
      ManagedCourseCertificateConfig,
      | "nameTopPercent"
      | "numberTopPercent"
      | "dateTopPercent"
      | "overlayCourseTitle"
      | "overlayScore"
      | "overlayBadge"
    >
  >({});
  const [certRequested, setCertRequested] = useState(false);
  const [hasIssuedCertificate, setHasIssuedCertificate] = useState(false);
  const [hasFinalExam, setHasFinalExam] = useState(false);
  const [lessonBookmarked, setLessonBookmarked] = useState(false);
  const [learnerNote, setLearnerNote] = useState("");
  const [resourcesPanelOpen, setResourcesPanelOpen] = useState(false);
  const [activeLessonTab, setActiveLessonTab] = useState<"notes" | "resources">("notes");
  const certRequestRef = useRef<string | null>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [watermarkUser, setWatermarkUser] = useState("Learner");
  const [watermarkTime, setWatermarkTime] = useState("");

  useEffect(() => {
    if (!paramSlug || canonicalCourseSlug(paramSlug) === paramSlug) return;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(`/my-learning/course/${encodeURIComponent(slug)}${hash}`);
  }, [paramSlug, slug, router]);

  useEffect(() => {
    setCertRequested(window.localStorage.getItem(`sft_cert_requested_${slug}`) === "1");
  }, [slug]);

  useEffect(() => {
    const email = getLearnerEmail()?.trim();
    if (!email) {
      setHasIssuedCertificate(false);
      return;
    }
    let cancelled = false;
    void fetch(`/api/certificates?email=${encodeURIComponent(email)}`, { cache: "no-store" })
      .then((res) => readJsonResponse(res, {} as { ok?: boolean; certificates?: CertificateRowDto[] }))
      .then((data) => {
        if (cancelled || !data.ok || !data.certificates) return;
        const hit = data.certificates.find((c) => c.courseSlug === slug);
        setHasIssuedCertificate(hit?.status === "ready" && hit.visibleToLearner !== false);
      })
      .catch(() => {
        if (!cancelled) setHasIssuedCertificate(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const email = getLearnerEmail()?.trim().toLowerCase() ?? "";
    if (!email || !email.includes("@")) {
      setWatermarkUser("Learner");
      return;
    }
    const [local, domain] = email.split("@");
    const maskedLocal =
      local.length <= 3 ? `${local[0] ?? "l"}***` : `${local.slice(0, 2)}***${local.slice(-1)}`;
    const maskedDomain = domain ? domain.replace(/^[^.]+/, "***") : "***";
    setWatermarkUser(`${maskedLocal}@${maskedDomain}`);
  }, []);

  useEffect(() => {
    const refresh = () => {
      setWatermarkTime(
        new Date().toLocaleString("en-IN", {
          hour12: false,
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };
    refresh();
    const id = window.setInterval(refresh, 20000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/content", { cache: "no-store" })
      .then(async (r) => (r.ok ? readJsonResponse(r, null) : null))
      .then((data) => {
        if (cancelled || !data) return;
        const content = data as AdminContent;
        const assets = resolveCertificateAssetsForSlug(content, slug);
        const courseCfg = content.managedCourses?.find((c) => c.slug === slug)?.certificateConfig;
        setCertAssets({
          badge: assets.badgeImage,
          template: assets.templateImage,
          transcript: assets.transcriptFile,
        });
        setCertLayout({
          nameTopPercent: courseCfg?.nameTopPercent,
          numberTopPercent: courseCfg?.numberTopPercent,
          dateTopPercent: courseCfg?.dateTopPercent,
          overlayCourseTitle: courseCfg?.overlayCourseTitle,
          overlayScore: courseCfg?.overlayScore,
          overlayBadge: courseCfg?.overlayBadge,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    let isTutorLedPurchase = false;
    let purchasedThisSlug = false;
    try {
      const raw = window.localStorage.getItem("sft_purchased_courses");
      const parsed = raw ? (JSON.parse(raw) as Array<{ slug?: string; deliveryKind?: string }>) : [];
      if (Array.isArray(parsed)) {
        const row = parsed.find((c) => (c.slug ?? "").trim() === slug);
        purchasedThisSlug = !!row;
        isTutorLedPurchase =
          row?.deliveryKind === "tutor-led" || row?.deliveryKind === "workshop";
      }
    } catch {
      isTutorLedPurchase = false;
      purchasedThisSlug = false;
    }

    const applyPrograms = (programs: TutorLedProgramStored[]) => {
      if (cancelled) return;
      setTutorLedResolved(resolveTutorLedHit(programs, slug, purchasedThisSlug, isTutorLedPurchase));
    };

    applyPrograms(mergeTutorLedPrograms([]));

    void (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
        if (!res.ok) return;
        const data = await readJsonResponse(res, {} as { tutorLedPrograms?: TutorLedProgramStored[] });
        const apiList = Array.isArray(data.tutorLedPrograms) ? data.tutorLedPrograms : [];
        applyPrograms(mergeTutorLedPrograms(apiList));
      } catch {
        // Keep default merge from above.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const load = () => {
      setCompletedModules(readCompletedModules(slug));
      setProgressHydrated(true);
    };
    load();
    window.addEventListener("storage", load);
    window.addEventListener(COURSE_PROGRESS_UPDATED_EVENT, load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener(COURSE_PROGRESS_UPDATED_EVENT, load);
    };
  }, [slug]);

  const refreshExamGrades = useMemo(
    () => () => {
      const summary = computeCombinedExamGrade(
        slug,
        curriculum as Parameters<typeof computeCombinedExamGrade>[1],
      );
      setCombinedExamPercent(summary.combinedPercent);
      setAllExamsPassed(summary.allExamsPassed);
      if (summary.totalQuestions > 0) {
        setExamMarksSummary({ correct: summary.totalCorrect, total: summary.totalQuestions });
      } else {
        setExamMarksSummary(null);
      }
    },
    [slug, curriculum],
  );

  useEffect(() => {
    refreshExamGrades();
    void syncLearnerCourseProgressFromServer(slug).then(() => {
      setCompletedModules(readCompletedModules(slug));
      refreshExamGrades();
    });
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ courseSlug?: string }>).detail;
      if (!detail?.courseSlug || detail.courseSlug === slug) refreshExamGrades();
    };
    window.addEventListener("sft-exam-scores-updated", onUpdate);
    window.addEventListener("storage", refreshExamGrades);
    return () => {
      window.removeEventListener("sft-exam-scores-updated", onUpdate);
      window.removeEventListener("storage", refreshExamGrades);
    };
  }, [slug, refreshExamGrades, completedModules]);

  useEffect(() => {
    const load = () => setWatchedSecondsByModule(readModuleWatchedSeconds(slug));
    load();
    const onWatch = (e: Event) => {
      const detail = (e as CustomEvent<{ courseSlug?: string }>).detail;
      if (!detail?.courseSlug || detail.courseSlug === slug) load();
    };
    window.addEventListener(PREVIEW_WATCH_UPDATED_EVENT, onWatch);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(PREVIEW_WATCH_UPDATED_EVENT, onWatch);
      window.removeEventListener("storage", load);
    };
  }, [slug]);

  useEffect(() => {
    if (!curriculum.length || !slug) return;
    const allDone = curriculum.every((_, idx) => completedModules.includes(idx + 1));
    if (!allDone) return;

    const examModules = examModuleNumbers(
      curriculum as Parameters<typeof examModuleNumbers>[0],
    );
    const examsRequired = examModules.length > 0;
    const scoreForCert = combinedExamPercent ?? 100;
    if (examsRequired && (!allExamsPassed || combinedExamPercent == null)) return;

    const flagKey = `sft_cert_requested_${slug}`;
    if (certRequestRef.current === slug) return;

    const email = getLearnerEmail();
    if (!email) return;

    certRequestRef.current = slug;
    void notifyCourseCompletionClient({
      learnerEmail: email,
      courseSlug: slug,
      courseName: apiCourseTitle || courseTitle,
      deliveryKind: "self-paced",
    });
    void requestCourseCertificateClient({
      learnerEmail: email,
      courseSlug: slug,
      scorePercent: scoreForCert,
    }).then((r) => {
      if (r.ok) {
        window.localStorage.setItem(flagKey, "1");
        setCertRequested(true);
      } else {
        certRequestRef.current = null;
        console.warn("[certificate] auto-request failed:", r.message);
      }
    });
  }, [slug, curriculum, completedModules, allExamsPassed, combinedExamPercent]);

  const { allModulesDone, eligible } = useMemo(
    () =>
      learnerCredentialsEligible(
        curriculum as SchemaCurriculumModule[],
        completedModules,
        allExamsPassed,
      ),
    [curriculum, completedModules, allExamsPassed],
  );

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, { cache: "no-store" });
        const titleFallback = courseTitle;
        let resolved: CourseCurriculumModule[] = [];

        if (res.ok) {
          const data = await readJsonResponse(res, {} as {
            title?: string;
            category?: string;
            duration?: string;
            curriculum?: CourseCurriculumModule[];
            certificatePreviewLabel?: string;
            learningSection?: ResolvedLearningSection;
            finalExam?: { title?: string; examUploadUrl?: string } | null;
          });
          if (data.title?.trim()) setApiCourseTitle(data.title.trim());
          if (data.duration?.trim()) setCourseDuration(data.duration.trim());
          if (data.learningSection) setLearningCopy(data.learningSection);
          const fe = data.finalExam;
          setHasFinalExam(
            Boolean(
              fe &&
                (fe.title?.trim() ||
                  fe.examUploadUrl?.trim()),
            ),
          );
          resolved = curriculumModulesForLearner(
            normalizeCurriculumModules(
            data.curriculum?.length
              ? (data.curriculum as SchemaCurriculumModule[])
              : getCurriculumForCourse(
                  slug,
                  data.category,
                  data.title?.trim() || titleFallback,
                  null,
                ),
            ),
          );
        } else {
          setHasFinalExam(false);
          resolved = curriculumModulesForLearner(
            normalizeCurriculumModules(
            getCurriculumForCourse(slug, undefined, titleFallback, null),
            ),
          );
        }
        setCurriculum(resolved);
        const healedCompleted = normalizeCompletedModulesForCurriculum(slug, resolved.length);
        setCompletedModules(healedCompleted);
        setSelectedModuleIdx(0);
        setSelectedEntryIdx(0);

        const priorWatch = readModuleWatchedSeconds(slug);
        let healed = priorWatch;
        let watchChanged = false;
        resolved.forEach((mod, idx) => {
          const moduleNumber = idx + 1;
          const nextVal = healModuleWatchRecord(mod as PreviewGateModule, priorWatch[moduleNumber] ?? 0);
          if (nextVal !== (priorWatch[moduleNumber] ?? 0)) {
            healed = { ...healed, [moduleNumber]: nextVal };
            watchChanged = true;
          }
        });
        if (watchChanged) {
          writeModuleWatchedSeconds(slug, healed);
          setWatchedSecondsByModule(healed);
        }
      } catch {
        const fallback = normalizeCurriculumModules(
          getCurriculumForCourse(slug, undefined, courseTitle, null),
        );
        setCurriculum(fallback);
        setSelectedModuleIdx(0);
        setSelectedEntryIdx(0);
        setActiveVideoStoredUrl("");
      }
    };
    void loadCourse();
  }, [slug]);

  const activeModule = curriculum[selectedModuleIdx];
  const activeModuleItems = useMemo(
    () => moduleCurriculumRows(activeModule as PreviewGateModule),
    [activeModule],
  );
  const activeItem = activeModuleItems[selectedEntryIdx];
  const selectedModuleNumber = selectedModuleIdx + 1;
  const lessonStorageKey = `${slug}_${selectedModuleNumber}_${selectedEntryIdx}`;

  useEffect(() => {
    setLessonBookmarked(window.localStorage.getItem(`sft_bookmark_${lessonStorageKey}`) === "1");
    setLearnerNote(window.localStorage.getItem(`sft_learner_note_${lessonStorageKey}`) ?? "");
  }, [lessonStorageKey]);

  const toggleLessonBookmark = () => {
    const next = !lessonBookmarked;
    setLessonBookmarked(next);
    window.localStorage.setItem(`sft_bookmark_${lessonStorageKey}`, next ? "1" : "0");
  };

  const saveLearnerNote = () => {
    window.localStorage.setItem(`sft_learner_note_${lessonStorageKey}`, learnerNote);
  };

  const requiredSecondsByModule = useMemo(() => {
    const out: Record<number, number> = {};
    curriculum.forEach((module, idx) => {
      out[idx + 1] = requiredPreviewSecondsForModule(module as PreviewGateModule);
    });
    return out;
  }, [curriculum]);

  const moduleWatchProgress = (moduleNumber: number) => {
    const mod = curriculum[moduleNumber - 1];
    return modulePreviewProgress(mod as PreviewGateModule, watchedSecondsByModule[moduleNumber] ?? 0);
  };

  const persistModuleWatch = (moduleNumber: number, watchedSec: number) => {
    setWatchedSecondsByModule((prev) => {
      const existing = prev[moduleNumber] ?? 0;
      const nextVal = Math.max(existing, watchedSec);
      if (nextVal <= existing) return prev;
      const next = { ...prev, [moduleNumber]: nextVal };
      writeModuleWatchedSeconds(slug, next);
      return next;
    });
  };

  const recordVideoWatchProgress = (moduleNumber: number, video: HTMLVideoElement) => {
    const current = video.currentTime;
    if (!Number.isFinite(current) || current < 0) return;

    const now = performance.now();
    const last = watchSampleRef.current;
    let accumulated = watchAccumRef.current[moduleNumber] ?? 0;

    if (last?.module === moduleNumber && !video.paused && !video.ended) {
      const deltaPos = current - last.position;
      const deltaWall = (now - last.at) / 1000;
      if (deltaPos > 0 && deltaPos <= 4 && deltaWall > 0 && deltaWall <= 4) {
        accumulated += Math.min(deltaPos, deltaWall);
      }
    }
    watchAccumRef.current[moduleNumber] = accumulated;
    watchSampleRef.current = { module: moduleNumber, at: now, position: current };

    persistModuleWatch(moduleNumber, Math.max(accumulated, current));
  };

  const onVideoEnded = (moduleNumber: number) => {
    const mod = curriculum[moduleNumber - 1];
    const required = requiredPreviewSecondsForModule(mod as PreviewGateModule);
    const accumulated = watchAccumRef.current[moduleNumber] ?? 0;
    persistModuleWatch(moduleNumber, Math.max(accumulated, required));
  };

  useEffect(() => {
    const itemVideo = activeItem?.kind === "video" ? activeItem.videoUrl?.trim() : "";
    if (itemVideo) {
      setActiveVideoStoredUrl(itemVideo);
      setVideoLoadError(null);
      return;
    }
    const moduleVideo = activeModuleItems.find((it) => it.kind === "video" && it.videoUrl?.trim())?.videoUrl?.trim();
    if (moduleVideo) {
      setActiveVideoStoredUrl(moduleVideo);
      setVideoLoadError(null);
      return;
    }
    setActiveVideoStoredUrl("");
    setVideoLoadError(null);
  }, [activeItem?.kind, activeItem?.videoUrl, activeModuleItems, slug]);

  useEffect(() => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.add(selectedModuleIdx);
      return next;
    });
    watchSampleRef.current = null;
  }, [selectedModuleIdx, selectedEntryIdx]);

  const navigableLessons = useMemo(() => flattenLearnerLessons(curriculum), [curriculum]);
  const currentLessonNavIdx = findLessonNavIndex(
    navigableLessons,
    selectedModuleIdx,
    selectedEntryIdx,
  );
  const goToLessonNavIdx = (navIdx: number) => {
    const target = navigableLessons[navIdx];
    if (!target) return;
    setSelectedModuleIdx(target.moduleIdx);
    setSelectedEntryIdx(target.entryIdx);
    setExpandedModules((prev) => new Set(prev).add(target.moduleIdx));
  };

  const handleMarkModuleComplete = () => {
    const moduleNumber = selectedModuleIdx + 1;
    markModuleCompleted(slug, moduleNumber, curriculum.length, {
      courseTitle: apiCourseTitle || courseTitle,
      moduleTitle: moduleTitle(activeModule ?? {}, selectedModuleIdx),
      badgeImageUrl: certAssets.badge || undefined,
    });
    setCompletedModules(readCompletedModules(slug));
  };

  const toggleModuleExpanded = (idx: number) => {
    setSelectedModuleIdx(idx);
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const expandAllModules = () => {
    setExpandedModules(new Set(curriculum.map((_, idx) => idx)));
  };

  const resourceLinks = useMemo(() => {
    const out = courseToolResourceLinks(learningCopy.courseTools);
    if (activeItem?.kind === "exam" && activeItem.examUploadUrl?.trim()) {
      out.push({ label: "Exam File", url: activeItem.examUploadUrl.trim() });
    }
    return out;
  }, [learningCopy.courseTools, activeItem]);

  const toolItems = useMemo(
    () => resolveCourseLearningToolItems(learningCopy.courseTools),
    [learningCopy.courseTools],
  );
  const toolItemLabelsKey = useMemo(() => toolItems.map((t) => t.label).join("|"), [toolItems]);

  const activeToolItem = toolItems.find((t) => t.label === activeLearningTool) ?? toolItems[0];
  const customBrandLogo = learningCopy.brandLogoUrl?.trim() || "";
  const isDefaultBrandPath =
    !customBrandLogo ||
    customBrandLogo === BRAND_LOGO_PUBLIC_PATH ||
    customBrandLogo === "/SF-WHITE-LOGO.png" ||
    customBrandLogo.endsWith("/SF-WHITE-LOGO.png");
  const logoUrl = customBrandLogo || BRAND_LOGO_PUBLIC_PATH;
  const useHeaderBrandLogo = isDefaultBrandPath;
  const lessonVideoClass = activeVideoStoredUrl
    ? "h-[320px] w-full bg-black object-contain md:h-[460px] xl:h-[560px]"
    : "h-[200px] w-full bg-black object-contain md:h-[220px] xl:h-[240px]";
  const sidebarLayoutVersion =
    curriculum.length + selectedModuleIdx + expandedModules.size + (resourcesPanelOpen ? 1 : 0);
  const moduleTitle = (module: CourseCurriculumModule, idx: number) =>
    module.title?.trim() || `Module ${idx + 1}`;

  const completionStateReady = progressHydrated && curriculum.length > 0;
  const completionUnlocked = eligible || hasIssuedCertificate;
  const courseProgressComplete =
    allModulesDone ||
    (curriculum.length > 0 && completedModules.length >= curriculum.length);
  const showCompletionDashboard =
    completionStateReady && (completionUnlocked || courseProgressComplete);

  useEffect(() => {
    if (!showCompletionDashboard) return;
    markCompletionCelebrationSeen(slug);
    clearPendingCompletionCelebration(slug);
    const hash = window.location.hash.replace("#", "").toLowerCase();
    if (hash) return;
    const path = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", `${path}#credentials`);
  }, [showCompletionDashboard, slug]);

  useEffect(() => {
    if (!showCompletionDashboard) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [showCompletionDashboard]);

  useEffect(() => {
    setActiveLearningTool((prev) => {
      if (toolItems.some((t) => t.label === prev)) return prev;
      return toolItems[0]?.label ?? "E-Workbook";
    });
    // Only re-run when the available tool labels change (not on every tools object identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toolItemLabelsKey is the intentional trigger
  }, [toolItemLabelsKey]);

  const learningToolButtonClass = (tool: (typeof toolItems)[number]) => {
    const selected = activeLearningTool === tool.label;
    const available = Boolean(tool.value);
    if (selected) {
      return "border-amber-300/70 bg-gradient-to-br from-amber-500/30 to-violet-600/25 text-white shadow-[0_0_22px_rgba(245,158,11,0.35)] ring-2 ring-amber-300/50";
    }
    if (available) {
      return "border-amber-400/40 bg-amber-500/15 text-amber-100 hover:border-amber-300/60 hover:bg-amber-500/25 hover:shadow-[0_0_14px_rgba(245,158,11,0.2)]";
    }
    return "border-violet-400/35 bg-violet-500/12 text-violet-100 hover:border-violet-300/50 hover:bg-violet-500/20 hover:shadow-[0_0_14px_rgba(139,92,246,0.2)]";
  };

  if (tutorLedResolved) {
    if (!isPurchased) {
      return (
        <div className="my-learning-course-player">
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

  if (!tutorLedResolved && !isPurchased) {
    return (
      <div className="my-learning-course-player">
        <main className="mx-auto max-w-[1760px] px-4 py-16 md:px-6 xl:px-8">
          <Link href="/my-learning?tab=learning" className="text-xs text-gray-400 hover:text-amber-200">
            ← My Learning
          </Link>
          <h1 className="mt-4 text-3xl font-bold">{apiCourseTitle || courseTitle}</h1>
          <p className="mt-2 max-w-xl text-gray-300">
            Enroll in this self-paced course to access video lessons, module exams, and your certificate.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/courses/${encodeURIComponent(slug)}`}
              className="inline-flex rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-300"
            >
              View course & enroll
            </Link>
            <Link
              href="/courses"
              className="inline-flex rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/5"
            >
              Browse courses
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if ((hasIssuedCertificate || completedModules.length > 0) && !completionStateReady) {
    return (
      <div className="my-learning-course-player">
        <main className="mx-auto flex max-w-[1760px] items-center justify-center px-4 py-24">
          <p className="text-sm text-gray-400">Loading your course progress…</p>
        </main>
      </div>
    );
  }

  if (showCompletionDashboard) {
    return (
      <div className="my-learning-course-player">
        <main className="mx-auto max-w-[1760px] px-4 py-5 md:px-6 xl:px-8">
          <CourseCompletedDashboard
            courseSlug={slug}
            courseTitle={apiCourseTitle || courseTitle}
            courseDuration={courseDuration}
            curriculum={curriculum as SchemaCurriculumModule[]}
            completedModules={completedModules}
            combinedExamPercent={combinedExamPercent}
            allExamsPassed={allExamsPassed}
            templateImageUrl={certAssets.template || undefined}
            badgeImageUrl={certAssets.badge || undefined}
            certificateLayout={certLayout}
            certRequested={certRequested}
            hasFinalExam={hasFinalExam}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="my-learning-course-player">
      <main className="mx-auto max-w-[1760px] px-4 py-5 md:px-6 xl:px-8">
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/my-learning?tab=learning" className="hover:text-amber-200">
            My Learning
          </Link>
          <ChevronRight size={12} />
          <span className="text-violet-200">{courseTitle}</span>
        </div>

        <h1 className="text-4xl font-bold">{apiCourseTitle || courseTitle}</h1>

        <section className="mt-4 grid gap-3 xl:grid-cols-[1.9fr_1fr] xl:items-start">
          <div ref={leftColumnRef} className="space-y-3">
            <article className="overflow-hidden rounded-xl border border-white/10 bg-[#0c1324]">
              <div className="relative bg-black">
                {activeVideoStoredUrl ? (
                  <SecureCourseVideoPlayer
                    storedUrl={activeVideoStoredUrl}
                    courseSlug={slug}
                    onTimeUpdate={(video) => recordVideoWatchProgress(selectedModuleNumber, video)}
                    onEnded={() => onVideoEnded(selectedModuleNumber)}
                    onError={(message) => setVideoLoadError(message)}
                    className={lessonVideoClass}
                  />
                ) : (
                  <div
                    className={`${lessonVideoClass} flex flex-col items-center justify-center gap-3 text-sm text-gray-400`}
                  >
                    {useHeaderBrandLogo ? (
                      <BrandLogo forceDark className="h-8 w-auto opacity-40" width={160} height={40} />
                    ) : (
                      <Image
                        src={logoUrl}
                        alt="SF Trainings"
                        className="h-8 w-auto opacity-40"
                        width={160}
                        height={40}
                      />
                    )}
                    {learningCopy.noVideoMessage}
                  </div>
                )}
                {activeVideoStoredUrl ? (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                    <div className="absolute left-[8%] top-[16%] rotate-[-12deg] text-[11px] font-semibold tracking-wide text-white/16">
                      {watermarkUser} · {watermarkTime}
                    </div>
                    <div className="absolute right-[10%] top-[38%] rotate-[10deg] text-[11px] font-semibold tracking-wide text-white/16">
                      {watermarkUser} · {watermarkTime}
                    </div>
                    <div className="absolute left-[22%] bottom-[18%] rotate-[-8deg] text-[11px] font-semibold tracking-wide text-white/16">
                      {watermarkUser} · {watermarkTime}
                    </div>
                  </div>
                ) : null}
                {videoLoadError ? (
                  <div className="border-t border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                    {videoLoadError}
                  </div>
                ) : null}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 py-2"
                  aria-hidden
                >
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/35 bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                    <BadgeCheck className="h-3.5 w-3.5 text-amber-300" />
                    {learningCopy.certifiedBadgeLabel}
                  </span>
                  {activeItem?.kind === "video" ? (
                    <span className="rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-violet-200">
                      {activeModule?.title?.trim() || "Course module"}
                    </span>
                  ) : null}
                </div>
                <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/55 px-2 py-1.5 backdrop-blur-sm">
                  {useHeaderBrandLogo ? (
                    <BrandLogo forceDark className="h-6 w-auto opacity-90" width={120} height={28} />
                  ) : (
                    <Image
                      src={logoUrl}
                      alt="SF Trainings"
                      className="h-6 w-auto opacity-90"
                      width={120}
                      height={28}
                    />
                  )}
                </div>
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
                <button
                  type="button"
                  onClick={toggleLessonBookmark}
                  className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition ${
                    lessonBookmarked
                      ? "border-amber-300/50 bg-amber-500/20 text-amber-100"
                      : "border-white/15 bg-black/30 text-gray-300 hover:border-amber-300/40"
                  }`}
                >
                  <Bookmark size={14} className={lessonBookmarked ? "fill-current" : undefined} />{" "}
                  {lessonBookmarked ? "Bookmarked" : learningCopy.bookmarkLabel}
                </button>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="mb-3 rounded-lg border border-violet-400/35 bg-gradient-to-br from-violet-600/15 via-[#121a32] to-amber-500/10 p-3 shadow-[0_0_28px_rgba(139,92,246,0.12)]">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
                    {learningCopy.learningToolsTitle}
                  </p>
                  <p className="mt-0.5 text-[11px] text-violet-200/80">{learningCopy.learningToolsHint}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                    {toolItems.map((tool) => {
                      const Icon = tool.icon;
                      const available = Boolean(tool.value);
                      return (
                        <button
                          key={tool.label}
                          type="button"
                          onClick={() => {
                            setActiveLearningTool(tool.label);
                            if (tool.value) {
                              void openCourseLearningResource(tool.value, slug, "open");
                            }
                          }}
                          className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition ${learningToolButtonClass(tool)}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          {tool.label}
                          {available ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-md border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-gray-300">
                    {activeToolItem?.value ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <CourseLearningResourceLink
                          href={activeToolItem.value}
                          courseSlug={slug}
                          mode="open"
                          className="font-semibold text-amber-200 underline hover:text-amber-100"
                        >
                          Open {activeToolItem.label} →
                        </CourseLearningResourceLink>
                        {activeToolItem.key !== "webhook" ? (
                          <CourseLearningResourceLink
                            href={activeToolItem.value}
                            courseSlug={slug}
                            mode="download"
                            className="inline-flex items-center gap-1 font-semibold text-violet-200 underline hover:text-violet-100"
                          >
                            <Download size={12} aria-hidden />
                            Download
                          </CourseLearningResourceLink>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-gray-500">
                        No {activeToolItem?.label?.toLowerCase() ?? "content"} uploaded for this course
                        yet. Check back after your instructor adds materials.
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-violet-100">About the Module</p>
                <p className="mt-2 text-sm leading-7 text-gray-300">
                  {activeItem?.about?.trim()
                    ? activeItem.about.trim()
                    : `Welcome to ${moduleTitle(activeModule ?? {}, selectedModuleIdx)}. Work through the lessons in this module, then complete the module assessment when it unlocks.`}
                </p>
                {activeItem?.description?.trim() ? (
                  <p className="mt-2 text-sm leading-7 text-gray-300">{activeItem.description.trim()}</p>
                ) : null}

                <p className="mt-4 text-sm font-semibold text-violet-100">Learning Outcomes</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {(
                    activeItem?.learningOutcomes?.length
                      ? activeItem.learningOutcomes
                      : [
                          `Understand the key ideas covered in ${moduleTitle(activeModule ?? {}, selectedModuleIdx)}`,
                          "Apply practical techniques from this module’s lessons",
                          "Complete the module lessons and supporting materials in order",
                          "Prepare for the module examination with confidence",
                        ]
                  ).map((point) => (
                    <div key={point} className="rounded-md border border-white/10 bg-black/30 p-2 text-xs text-gray-300">
                      {point}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleMarkModuleComplete}
                  disabled={completedModules.includes(selectedModuleNumber)}
                  className="rounded-md border border-violet-300/35 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {completedModules.includes(selectedModuleNumber)
                    ? "Module Completed"
                    : learningCopy.markCompleteLabel}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToLessonNavIdx(currentLessonNavIdx - 1)}
                    disabled={currentLessonNavIdx <= 0}
                    className="rounded-md border border-white/15 bg-black/25 px-6 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {learningCopy.previousLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => goToLessonNavIdx(currentLessonNavIdx + 1)}
                    disabled={currentLessonNavIdx < 0 || currentLessonNavIdx >= navigableLessons.length - 1}
                    className="rounded-md bg-violet-600 px-8 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {learningCopy.nextLabel}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr_minmax(140px,0.75fr)]">
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center gap-5 text-sm">
                    <button
                      type="button"
                      onClick={() => setActiveLessonTab("notes")}
                      className={`pb-1 ${
                        activeLessonTab === "notes"
                          ? "border-b-2 border-violet-400 text-violet-100"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {learningCopy.notesTabLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLessonTab("resources");
                        setResourcesPanelOpen(true);
                      }}
                      className={`pb-1 ${
                        activeLessonTab === "resources"
                          ? "border-b-2 border-violet-400 text-violet-100"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {learningCopy.resourcesTabLabel}
                    </button>
                  </div>
                  {activeLessonTab === "notes" ? (
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <input
                      value={learnerNote}
                      onChange={(e) => setLearnerNote(e.target.value)}
                      placeholder={
                        activeItem?.notes?.trim()
                          ? `Instructor notes: ${activeItem.notes.trim().slice(0, 80)}…`
                          : "Write your personal note for this lesson…"
                      }
                      className="rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={saveLearnerNote}
                      className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500"
                    >
                      {learningCopy.saveNoteLabel}
                    </button>
                  </div>
                  ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {resourceLinks.length > 0 ? (
                      resourceLinks.map((res) => (
                        <div
                          key={`${res.label}-${res.url}`}
                          className="rounded-md border border-white/10 bg-black/30 p-2 text-xs"
                        >
                          <CourseLearningResourceLink
                            href={res.url}
                            courseSlug={slug}
                            mode="open"
                            className="font-semibold text-violet-200 underline hover:border-violet-300/40"
                          >
                            {res.label}
                          </CourseLearningResourceLink>
                          {res.label !== "Webhook" ? (
                            <CourseLearningResourceLink
                              href={res.url}
                              courseSlug={slug}
                              mode="download"
                              className="ml-2 text-[10px] font-semibold text-amber-200 underline"
                            >
                              Download
                            </CourseLearningResourceLink>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No resources uploaded for this lesson yet.</p>
                    )}
                  </div>
                  )}
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">Resources</p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLessonTab("resources");
                        setResourcesPanelOpen(true);
                      }}
                      className="text-xs text-violet-200 hover:text-violet-100"
                    >
                      View All
                    </button>
                  </div>
                  <div className={`grid gap-2 sm:grid-cols-2 ${resourcesPanelOpen ? "" : "max-h-28 overflow-hidden"}`}>
                    {resourceLinks.length > 0 ? (
                      resourceLinks.map((res) => {
                        const iconMap: Record<string, typeof FileText> = {
                          "E-Workbook": BookOpen,
                          Transcript: ScrollText,
                          PPT: Presentation,
                          Podcast: Headphones,
                          Webhook: Link2,
                          "Exam File": FileText,
                        };
                        const Icon = iconMap[res.label] ?? FileText;
                        return (
                          <div
                            key={`${res.label}-${res.url}`}
                            className="group rounded-md border border-white/10 bg-black/30 p-2 transition hover:border-violet-300/35 hover:bg-white/5"
                          >
                            <CourseLearningResourceLink
                              href={res.url}
                              courseSlug={slug}
                              mode="open"
                              className="block"
                            >
                              <div className="inline-flex items-center gap-1.5 rounded border border-violet-300/30 bg-violet-500/15 px-2 py-1 text-[10px] font-semibold text-violet-100">
                                <Icon size={12} />
                                {res.label}
                              </div>
                              <p className="mt-2 text-xs text-gray-400 group-hover:text-violet-200">
                                Open resource
                              </p>
                            </CourseLearningResourceLink>
                            {res.label !== "Webhook" ? (
                              <CourseLearningResourceLink
                                href={res.url}
                                courseSlug={slug}
                                mode="download"
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-200 underline"
                              >
                                <Download size={10} aria-hidden />
                                Download
                              </CourseLearningResourceLink>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-md border border-white/10 bg-black/30 p-2 text-xs text-gray-400 sm:col-span-2">
                        {learningCopy.resourcesEmptyMessage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center rounded-lg border border-amber-300/35 bg-gradient-to-b from-amber-500/10 to-violet-950/20 p-4 text-center">
                  {useHeaderBrandLogo ? (
                    <BrandLogo forceDark className="h-10 w-auto" width={160} height={44} />
                  ) : (
                    <Image
                      src={logoUrl}
                      alt="SF Trainings"
                      className="h-10 w-auto"
                      width={160}
                      height={44}
                      unoptimized={logoUrl.startsWith("http")}
                    />
                  )}
                  <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {learningCopy.accreditedBadgeLabel}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
                    {learningCopy.accreditedDescription}
                  </p>
                </div>
              </div>
            </article>

            <CoursePlayerExploreCourses
              currentSlug={slug}
              leftColumnRef={leftColumnRef}
              sidebarRef={sidebarRef}
              layoutVersion={sidebarLayoutVersion}
            />
          </div>

          <aside ref={sidebarRef} className="space-y-3">
            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <div className="rounded-md border border-white/10 bg-black/30 p-2">
                <p className="text-xs text-gray-400">{learningCopy.progressLabel}</p>
                <p className="text-xl font-bold">
                  {curriculum.length > 0
                    ? `${Math.round((completedModules.length / curriculum.length) * 100)}% Completed`
                    : "0% Completed"}
                </p>
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold">Course Modules ({curriculum.length})</h3>
                <button
                  type="button"
                  onClick={expandAllModules}
                  className="text-xs text-violet-200 hover:text-violet-100"
                >
                  Expand All
                </button>
              </div>
              <div className="space-y-2">
                {curriculum.map((module, idx) => (
                  <div
                    key={`${moduleTitle(module, idx)}-${idx}`}
                    className={`rounded-lg border px-2.5 py-2.5 text-sm shadow-sm ${
                      completedModules.includes(idx + 1)
                        ? "border-emerald-300/35 bg-gradient-to-r from-emerald-500/20 to-[#13263a] text-emerald-100"
                        : idx === selectedModuleIdx
                          ? "border-violet-300/40 bg-gradient-to-r from-violet-500/25 to-[#121a32] text-violet-100"
                          : "border-white/10 bg-black/25 text-gray-200"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleModuleExpanded(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") toggleModuleExpanded(idx);
                      }}
                      className="flex cursor-pointer items-center justify-between gap-3"
                    >
                      <div className="inline-flex items-start gap-2">
                        <span
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                            completedModules.includes(idx + 1)
                              ? "bg-emerald-500/30 text-emerald-100"
                              : idx === selectedModuleIdx
                                ? "bg-violet-500/35 text-violet-100"
                                : "bg-white/10 text-gray-200"
                          }`}
                        >
                          {completedModules.includes(idx + 1) ? (
                            <CheckCheck size={12} />
                          ) : (
                            <Circle size={12} />
                          )}
                        </span>
                        <span className="line-clamp-2 font-semibold">{moduleTitle(module, idx)}</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        {completedModules.includes(idx + 1) && (
                          <span className="rounded border border-emerald-300/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-200">
                            Completed
                          </span>
                        )}
                        {idx === selectedModuleIdx ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
                      </div>
                    </div>
                    {expandedModules.has(idx) && (
                      <div className="mt-2 space-y-1.5 rounded-md border border-white/10 bg-black/30 p-2">
                        {moduleCurriculumRows(module as PreviewGateModule).map((entry, entryIdx) => {
                          const entryKey = `${moduleTitle(module, idx)}-${entry.label ?? "entry"}-${entry.kind ?? "item"}-${entryIdx}`;
                          return entry.kind === "exam" ? (
                            (() => {
                              const progress = moduleWatchProgress(idx + 1);
                              const examLabel = learnerExamDisplayLabel(
                                entry.label,
                                `Module ${idx + 1} exam`,
                              );
                              if (!progress.unlocked) {
                                return (
                                  <div
                                    key={entryKey}
                                    className="flex items-center justify-between gap-2 rounded-md border border-amber-300/25 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100"
                                  >
                                    <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                                      {examLabel}
                                    </span>
                                    <span className="shrink-0 inline-flex items-center gap-1 rounded border border-amber-300/35 bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-100">
                                      <Lock size={10} />
                                      Locked
                                    </span>
                                  </div>
                                );
                              }
                              if (!entry.examUploadUrl?.trim()) {
                                return (
                                  <div
                                    key={entryKey}
                                    className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] text-gray-400"
                                  >
                                    <span className="truncate">{examLabel}</span>
                                    <span className="shrink-0 text-[10px] text-amber-300">Exam file pending</span>
                                  </div>
                                );
                              }
                              return (
                                <Link
                                  key={entryKey}
                                  href={`/my-learning/course/${slug}/exam?module=${idx + 1}`}
                                  className="flex items-center justify-between rounded-md border border-emerald-300/30 bg-emerald-500/15 px-2 py-1.5 text-[11px] text-emerald-200 hover:bg-emerald-500/25"
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <CheckCircle2 size={11} className="text-emerald-300" />
                                    {examLabel}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded border border-emerald-200/30 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-100">
                                    <PlayCircle size={10} />
                                    Start exam
                                  </span>
                                </Link>
                              );
                            })()
                          ) : (
                            <button
                              key={entryKey}
                              type="button"
                              onClick={() => {
                                setSelectedModuleIdx(idx);
                                setSelectedEntryIdx(entryIdx);
                              }}
                              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] ${
                                entryIdx === selectedEntryIdx
                                  ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/30"
                                  : "bg-black/35 text-gray-300 hover:bg-white/5"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {entry.kind === "video" ? (
                                  <PlayCircle size={11} className="text-emerald-300" />
                                ) : (
                                  <FileText size={11} className="text-violet-300" />
                                )}
                                {entry.label?.trim() || `Lesson ${entryIdx + 1}`}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="rounded border border-white/10 bg-black/25 px-1.5 py-0.5 text-[10px] text-gray-300">
                                  {entry.kind === "video" ? "Video" : "Reading"}
                                </span>
                                {entry.kind === "video" && (entry.previewLimitMinutes ?? 0) > 0 ? (
                                  <span className="inline-flex items-center rounded border border-cyan-300/35 bg-cyan-500/15 px-1 py-0.5 text-[9px] text-cyan-100">
                                    <Lock size={9} />
                                  </span>
                                ) : null}
                              </span>
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
                {learningCopy.certificationRuleText}
                {combinedExamPercent !== null ? (
                  <span className="ml-2 inline-flex rounded bg-black/25 px-2 py-0.5 text-xs">
                    Combined grade: {combinedExamPercent}%
                    {allExamsPassed ? " ✓ All exams passed" : ` ✗ Pass each exam at ${DEFAULT_MODULE_EXAM_PASS_PERCENT}%+`}
                  </span>
                ) : (
                  <span className="ml-2 inline-flex rounded bg-black/25 px-2 py-0.5 text-xs">
                    Pass each module exam at {DEFAULT_MODULE_EXAM_PASS_PERCENT}%+ (unlimited retakes).
                  </span>
                )}
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <h3 className="text-sm font-semibold">{learningCopy.quickToolsTitle}</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setActiveLearningTool("E-Workbook")}
                  className="rounded border border-white/10 bg-black/25 px-2 py-1.5 hover:border-violet-300/40"
                >
                  {learningCopy.courseTools?.eWorkbookUrl?.trim() ? "E-Workbook Ready" : "No E-Workbook"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLearningTool("Transcript")}
                  className="rounded border border-white/10 bg-black/25 px-2 py-1.5 hover:border-violet-300/40"
                >
                  {learningCopy.courseTools?.transcriptUrl?.trim() ? "Transcript Ready" : "No Transcript"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveLessonTab("resources");
                    setResourcesPanelOpen(true);
                  }}
                  className="rounded border border-white/10 bg-black/25 px-2 py-1.5 hover:border-violet-300/40"
                >
                  {resourceLinks.length > 0 ? "Resources Ready" : "No Resources"}
                </button>
              </div>
              <Link
                href="/my-learning?tab=community"
                className="mt-3 inline-flex items-center gap-2 text-xs text-violet-300 underline hover:text-violet-200"
              >
                <MessageCircle size={12} /> Ask mentor in community
              </Link>
              {learningCopy.courseTools?.pptUrl?.trim() ? (
                <CourseLearningResourceLink
                  href={learningCopy.courseTools.pptUrl.trim()}
                  courseSlug={slug}
                  className="mt-2 inline-flex items-center gap-2 text-xs text-violet-300 underline"
                >
                  <Presentation size={12} /> Open course PPT
                </CourseLearningResourceLink>
              ) : null}
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-gray-400">
                <MessageCircle size={12} /> Need help? Use community or contact support below.
              </div>
              <div className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 size={12} /> Pass every exam at {DEFAULT_MODULE_EXAM_PASS_PERCENT}%+ — combined score = certificate %
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <p className="text-sm font-semibold text-violet-100">Need help?</p>
              <p className="mt-2 text-xs text-gray-300">
                If anything is unclear in this module, contact support and share your course + module name for faster
                help.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/contact"
                  className="rounded-md border border-violet-300/35 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-500/25"
                >
                  Contact support
                </Link>
                <Link
                  href="/my-learning?tab=community"
                  className="rounded-md border border-white/15 bg-black/25 px-3 py-1.5 text-xs text-gray-300"
                >
                  Ask mentor
                </Link>
              </div>
            </article>

            <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
              <p className="text-sm font-semibold text-violet-100">Next actions</p>
              <div className="mt-2 space-y-2 text-xs text-gray-300">
                <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
                  Complete remaining lessons in this module.
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
                  Complete the module lessons to unlock the assessment.
                </div>
                <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
                  Pass module exam at {DEFAULT_MODULE_EXAM_PASS_PERCENT}% or above.
                </div>
              </div>
            </article>

            <CoursePlayerProgressSnapshot
              courseSlug={slug}
              curriculum={curriculum as SchemaCurriculumModule[]}
              completedModules={completedModules}
              watchedSecondsByModule={watchedSecondsByModule}
            />
            <CoursePlayerFeedbackSection
              courseSlug={slug}
              courseTitle={apiCourseTitle || courseTitle}
              activeModuleTitle={activeModule?.title}
            />
          </aside>
        </section>

        {allModulesDone ? (
          <CourseCompletionRewards
            courseSlug={slug}
            courseTitle={apiCourseTitle || courseTitle}
            courseDuration={courseDuration}
            curriculum={curriculum as SchemaCurriculumModule[]}
            completedModules={completedModules}
            combinedExamPercent={combinedExamPercent}
            allExamsPassed={allExamsPassed}
            badgeImageUrl={certAssets.badge || undefined}
            templateImageUrl={certAssets.template || undefined}
            transcriptTemplateUrl={certAssets.transcript || undefined}
            certRequested={certRequested}
          />
        ) : null}
      </main>
    </div>
  );
}
