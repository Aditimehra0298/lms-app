"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderOpen,
  GripVertical,
  Layers,
  Loader2,
  Mic,
  Pencil,
  Percent,
  Plus,
  Sparkles,
  Timer,
  Trash2,
  Type,
  Upload,
  Users,
  Video,
} from "lucide-react";
import type {
  AdminContent,
  CourseCurriculumItem,
  CourseCurriculumKind,
  CourseCurriculumModule,
  CourseFinalExam,
  ManagedCategory,
  ManagedCourse,
} from "@/lib/content-schema";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import {
  FOOD_SAFETY_DIPLOMA_CURRICULUM,
  buildGenericCurriculum,
  getCurriculumForCourse,
  totalCurriculumSteps,
} from "@/lib/course-detail-template";
import {
  ENROLLMENTS_UPDATED_EVENT,
  readEnrollments,
  type StoredCourseEnrollment,
} from "@/lib/enrollment-storage";

/** Shared field chrome for the self-paced course editor */
const spField =
  "mt-1.5 w-full rounded-xl border border-white/[0.07] bg-[#060b14]/90 px-3 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-gray-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";
/** Compact variant for nested rows (FAQs) — no top margin */
const spFieldSm =
  "w-full rounded-lg border border-white/[0.07] bg-[#060b14]/90 px-2.5 py-2 text-xs text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-gray-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";

/** Matches SF Trainings admin curriculum mock: Course Info → Core Section → … */
const COURSE_WORKSPACE_TABS = [
  "Course Info",
  "Core Section",
  "Pricing",
  "Settings",
  "SEO",
  "Students",
  "Certificates",
  "Publish",
] as const;
type CourseWorkspaceTab = (typeof COURSE_WORKSPACE_TABS)[number];

const CONTENT_TYPES: { label: string; icon: typeof Video; color: string; kind: CourseCurriculumKind }[] = [
  { label: "Video", icon: Video, color: "from-violet-600 to-indigo-600", kind: "video" },
  { label: "PDF / Doc", icon: FileText, color: "from-rose-500 to-orange-500", kind: "reading" },
  { label: "Quiz", icon: ClipboardList, color: "from-emerald-500 to-teal-600", kind: "exam" },
  { label: "Assignment", icon: FileText, color: "from-sky-500 to-blue-600", kind: "reading" },
  { label: "Tutor Led", icon: Mic, color: "from-fuchsia-500 to-purple-600", kind: "video" },
  { label: "Text", icon: Type, color: "from-slate-500 to-slate-700", kind: "reading" },
  { label: "Timer", icon: Timer, color: "from-amber-500 to-yellow-600", kind: "reading" },
  { label: "Survey", icon: BarChart3, color: "from-cyan-500 to-blue-500", kind: "exam" },
];

/** Module & final exam attachments — aligned with `app/api/admin/upload` (includes CSV). */
const EXAM_FILE_ACCEPT =
  ".pdf,.doc,.docx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/csv";
const VIDEO_FILE_ACCEPT =
  ".mp4,.webm,.mov,.m4v,video/mp4,video/webm,video/quicktime,video/x-m4v";

/** Parse currency-ish strings like "$49.00" or "49" for discount math. */
function parseMoneyInput(s: string): number | null {
  const cleaned = s.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Percent saved vs list price when list price is above sale price. */
function computeDiscountPercent(saleStr: string, listStr: string): number | null {
  const sale = parseMoneyInput(saleStr);
  const list = parseMoneyInput(listStr);
  if (sale === null || list === null || list <= 0 || sale >= list) return null;
  return Math.round((1 - sale / list) * 100);
}

function isSelfPaced(c: ManagedCourse): boolean {
  return !c.learningFormat || c.learningFormat === "self-paced";
}

const emptyDraft = (): ManagedCourse => ({
  slug: "",
  title: "",
  subtitle: "",
  category: "",
  level: "Beginner",
  duration: "3h 00m",
  rating: "4.6",
  learners: "0",
  price: "$49.00",
  oldPrice: "$79.00",
  image: "/course-food-safety.png",
  published: true,
  learningFormat: "self-paced",
  instructorName: "",
  pageBadge: "",
  highlights: [],
  faqs: [],
  trainerRole: "",
  trainerExperience: "",
  trainerBio: "",
  trainerCertifications: [],
  trainerWorkedWith: [],
});

function sanitizeManagedCourse(c: ManagedCourse): ManagedCourse {
  const faqs = Array.isArray(c.faqs)
    ? c.faqs.filter(
        (f): f is { q: string; a: string } =>
          !!f &&
          typeof f === "object" &&
          typeof (f as { q?: unknown }).q === "string" &&
          typeof (f as { a?: unknown }).a === "string",
      )
    : [];
  return {
    ...c,
    highlights: Array.isArray(c.highlights) ? c.highlights.filter((h): h is string => typeof h === "string") : [],
    faqs,
    trainerCertifications: Array.isArray(c.trainerCertifications)
      ? c.trainerCertifications.filter((x): x is string => typeof x === "string")
      : [],
    trainerWorkedWith: Array.isArray(c.trainerWorkedWith)
      ? c.trainerWorkedWith.filter((x): x is string => typeof x === "string")
      : [],
  };
}

function cloneMods(m: CourseCurriculumModule[]): CourseCurriculumModule[] {
  return JSON.parse(JSON.stringify(m)) as CourseCurriculumModule[];
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rowIcon(kind: CourseCurriculumKind) {
  switch (kind) {
    case "video":
      return Video;
    case "exam":
      return ClipboardList;
    default:
      return FileText;
  }
}

function kindToLessonLabel(kind: CourseCurriculumKind): string {
  switch (kind) {
    case "video":
      return "Video";
    case "exam":
      return "Quiz";
    default:
      return "Document";
  }
}

function lessonLabelToKind(label: string): CourseCurriculumKind {
  if (label === "Quiz") return "exam";
  if (label === "Video") return "video";
  return "reading";
}

type LessonSelection =
  | { scope: "module"; mi: number; ri: number }
  | { scope: "sub"; mi: number; si: number; ri: number };

function moduleStepCount(m: CourseCurriculumModule): number {
  let n = m.items.length;
  for (const sm of m.subModules ?? []) n += sm.items.length;
  return n;
}

function lessonIndexLabel(sel: LessonSelection): string {
  if (sel.scope === "module") return `${sel.mi + 1}.${sel.ri + 1}`;
  return `${sel.mi + 1}.S${sel.si + 1}.${sel.ri + 1}`;
}

function getLessonFromModules(modules: CourseCurriculumModule[], sel: LessonSelection): CourseCurriculumItem | undefined {
  const mod = modules[sel.mi];
  if (!mod) return undefined;
  if (sel.scope === "module") return mod.items[sel.ri];
  return mod.subModules?.[sel.si]?.items[sel.ri];
}

function patchLessonRow(
  modules: CourseCurriculumModule[],
  sel: LessonSelection,
  patch: RowPatch,
): CourseCurriculumModule[] {
  return modules.map((m, mi) => {
    if (mi !== sel.mi) return m;
    if (sel.scope === "module") {
      const items = m.items.map((row, j) => (j === sel.ri ? { ...row, ...patch } : row));
      return { ...m, items };
    }
    const subMods = [...(m.subModules ?? [])];
    const sm = subMods[sel.si];
    if (!sm) return m;
    subMods[sel.si] = {
      ...sm,
      items: sm.items.map((row, j) => (j === sel.ri ? { ...row, ...patch } : row)),
    };
    return { ...m, subModules: subMods };
  });
}

type RowPatch = Partial<{
  label: string;
  kind: CourseCurriculumKind;
  description: string;
  about: string;
  learningOutcomes: string[];
  notes: string;
  captions: string;
  pdfUrl: string;
  podcastUrl: string;
  resourceUrl: string;
  downloadUrl: string;
  videoUrl: string;
  timedExam: boolean;
  examDurationMinutes: number;
  examUploadUrl: string;
  examPassingScorePercent: number;
}>;

function stripFinalExamForSave(f: CourseFinalExam): CourseFinalExam | undefined {
  const title = f.title?.trim();
  const has =
    !!title ||
    !!f.examUploadUrl?.trim() ||
    typeof f.passingScorePercent === "number" ||
    !!f.timedExam ||
    typeof f.examDurationMinutes === "number";
  if (!has) return undefined;
  return { ...f, title: title || undefined };
}

export default function AdminCoursesWorkspace() {
  const [content, setContent] = useState<AdminContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<CourseWorkspaceTab>("Course Info");

  const [categoryFilterSlug, setCategoryFilterSlug] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManagedCourse>(emptyDraft);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [modules, setModules] = useState<CourseCurriculumModule[]>([]);
  const [expandedModuleIdx, setExpandedModuleIdx] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState<LessonSelection | null>(null);
  const [videoSource, setVideoSource] = useState<"upload" | "url">("upload");
  const [lessonPreviewable, setLessonPreviewable] = useState(true);
  const [lessonFree, setLessonFree] = useState(false);
  const [lessonDownload, setLessonDownload] = useState(true);
  const [uploadingExam, setUploadingExam] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [finalExamDraft, setFinalExamDraft] = useState<CourseFinalExam>({});
  const [enrollmentRows, setEnrollmentRows] = useState<StoredCourseEnrollment[]>([]);

  const load = useCallback(async () => {
    setLoadError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 25_000);
    try {
      const res = await fetch("/api/admin/content", { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as AdminContent;
      setContent({
        ...data,
        managedCourses: Array.isArray(data.managedCourses)
          ? data.managedCourses.map(sanitizeManagedCourse)
          : [],
      });
    } catch {
      setLoadError("Could not load admin content. Check that the dev server is running and try again.");
      setContent(null);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sync = () => setEnrollmentRows(readEnrollments());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(ENROLLMENTS_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ENROLLMENTS_UPDATED_EVENT, sync);
    };
  }, []);

  const categories: ManagedCategory[] = useMemo(
    () => (content?.categories?.length ? content.categories : []),
    [content],
  );

  const selfPacedCourses = useMemo(() => {
    return (content?.managedCourses ?? []).filter(isSelfPaced);
  }, [content]);

  const filteredTableCourses = useMemo(() => {
    if (!categoryFilterSlug) return selfPacedCourses;
    return selfPacedCourses.filter(
      (c) => canonicalCategorySlug(c.category) === canonicalCategorySlug(categoryFilterSlug),
    );
  }, [selfPacedCourses, categoryFilterSlug]);

  const selectedCourse = useMemo(
    () => (selectedSlug ? selfPacedCourses.find((c) => c.slug === selectedSlug) ?? null : null),
    [selfPacedCourses, selectedSlug],
  );

  const workspaceCourseSlug = useMemo(() => {
    if (selectedCourse?.slug) return selectedCourse.slug;
    if (isCreating) {
      return draft.slug?.trim() || slugify(draft.title || "");
    }
    return "";
  }, [selectedCourse?.slug, isCreating, draft.slug, draft.title]);

  const persistManagedCourses = async (nextCourses: ManagedCourse[]) => {
    if (!content) return;
    setSavingCatalog(true);
    setLoadError(null);
    try {
      const payload: AdminContent = { ...content, managedCourses: nextCourses };
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!put.ok) throw new Error("save");
      await load();
    } catch {
      setLoadError("Save failed. Try again.");
    } finally {
      setSavingCatalog(false);
    }
  };

  const openCreate = () => {
    const firstCat = categories[0]?.slug ?? "";
    setWorkspaceTab("Course Info");
    setIsCreating(true);
    setEditingSlug(null);
    setSelectedSlug("");
    setDraft({ ...emptyDraft(), category: firstCat });
  };

  const openEditTableRow = (course: ManagedCourse) => {
    setWorkspaceTab("Course Info");
    setIsCreating(false);
    setEditingSlug(course.slug);
    setSelectedSlug(course.slug);
    setDraft(sanitizeManagedCourse({ ...course, learningFormat: "self-paced" }));
  };

  const saveCatalogDraft = async (opts?: { goToCurriculumAfter?: boolean }) => {
    if (!content) return;
    const slug = editingSlug ?? slugify(draft.slug || draft.title);
    if (!slug.trim()) {
      setLoadError("Slug or title is required.");
      return;
    }
    const normalized: ManagedCourse = {
      ...draft,
      slug,
      learningFormat: "self-paced",
      faqs: (draft.faqs ?? []).filter((f) => f.q.trim() && f.a.trim()),
    };
    const others = (content.managedCourses ?? []).filter((c) => {
      if (editingSlug) return c.slug !== editingSlug;
      return c.slug !== slug;
    });
    await persistManagedCourses([...others, normalized]);
    setIsCreating(false);
    setEditingSlug(slug);
    setSelectedSlug(slug);
    if (opts?.goToCurriculumAfter) {
      setWorkspaceTab("Core Section");
    }
  };

  const deleteCourse = async (slug: string) => {
    if (!content) return;
    if (!window.confirm(`Remove course “${slug}” from the catalog?`)) return;
    const next = (content.managedCourses ?? []).filter((c) => c.slug !== slug);
    await persistManagedCourses(next);
    if (selectedSlug === slug) {
      setSelectedSlug("");
      setIsCreating(false);
      setEditingSlug(null);
      setDraft(emptyDraft());
    }
  };

  const uploadCover = async (file: File) => {
    setUploadingImage(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setDraft((d) => ({ ...d, image: data.url! }));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    setExpandedModuleIdx(0);
    setSelectedLesson(null);
  }, [selectedSlug]);

  useEffect(() => {
    if (!content || !selectedSlug || isCreating) {
      setModules([]);
      setFinalExamDraft({});
      setSelectedLesson(null);
      return;
    }
    const c = (content.managedCourses ?? []).find((x) => x.slug === selectedSlug && isSelfPaced(x));
    if (!c) return;
    setModules(cloneMods(getCurriculumForCourse(c.slug, c.category, c.title, c.curriculum)));
    setFinalExamDraft({ ...(c.finalExam ?? {}) });
  }, [selectedSlug, content, isCreating]);

  useEffect(() => {
    if (modules.length === 0) {
      setSelectedLesson(null);
      return;
    }
    const mi = Math.min(expandedModuleIdx, modules.length - 1);
    const mod = modules[mi];
    setSelectedLesson((prev) => {
      if (prev && prev.mi === mi) {
        if (prev.scope === "module" && prev.ri < mod.items.length) return prev;
        if (prev.scope === "sub") {
          const sm = mod.subModules?.[prev.si];
          if (sm && prev.ri < sm.items.length) return prev;
        }
      }
      if (mod.items.length > 0) return { scope: "module", mi, ri: 0 };
      const subs = mod.subModules ?? [];
      for (let si = 0; si < subs.length; si++) {
        if (subs[si].items.length > 0) return { scope: "sub", mi, si, ri: 0 };
      }
      return null;
    });
  }, [modules, expandedModuleIdx]);

  useEffect(() => {
    if (workspaceTab !== "Pricing") return;
    if (isCreating) return;
    if (!selectedCourse) return;
    setDraft((prev) =>
      prev.slug === selectedCourse.slug ? prev : { ...selectedCourse, learningFormat: "self-paced" },
    );
    setEditingSlug(selectedCourse.slug);
    setIsCreating(false);
  }, [workspaceTab, selectedCourse?.slug, isCreating]);

  const saveCurriculumOnly = async () => {
    if (!content || !selectedCourse || isCreating) return;
    setSavingCurriculum(true);
    setLoadError(null);
    try {
      const updated: ManagedCourse = {
        ...selectedCourse,
        curriculum: cloneMods(modules),
        finalExam: stripFinalExamForSave(finalExamDraft),
      };
      const others = (content.managedCourses ?? []).filter((c) => c.slug !== updated.slug);
      const payload: AdminContent = { ...content, managedCourses: [...others, updated] };
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!put.ok) throw new Error("save");
      await load();
    } catch {
      setLoadError("Curriculum save failed.");
    } finally {
      setSavingCurriculum(false);
    }
  };

  const persistCurriculumSnapshot = async (
    nextModules: CourseCurriculumModule[],
    nextFinalExam: CourseFinalExam = finalExamDraft,
  ) => {
    if (!content || !selectedCourse || isCreating) return;
    setSavingCurriculum(true);
    setLoadError(null);
    try {
      const updated: ManagedCourse = {
        ...selectedCourse,
        curriculum: cloneMods(nextModules),
        finalExam: stripFinalExamForSave(nextFinalExam),
      };
      const others = (content.managedCourses ?? []).filter((c) => c.slug !== updated.slug);
      const payload: AdminContent = { ...content, managedCourses: [...others, updated] };
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!put.ok) throw new Error("save");
      await load();
    } catch {
      setLoadError("Curriculum save failed.");
    } finally {
      setSavingCurriculum(false);
    }
  };

  const applyFoodSafetyTemplate = () => {
    setModules(cloneMods(FOOD_SAFETY_DIPLOMA_CURRICULUM));
    setExpandedModuleIdx(0);
    setSelectedLesson({ scope: "module", mi: 0, ri: 0 });
  };

  const applyGenericTemplate = () => {
    if (!selectedCourse) return;
    setModules(cloneMods(buildGenericCurriculum(selectedCourse.title)));
    setExpandedModuleIdx(0);
    setSelectedLesson({ scope: "module", mi: 0, ri: 0 });
  };

  const addModule = () => {
    const mi = modules.length;
    setModules((prev) => [
      ...prev,
      {
        title: `New module ${prev.length + 1}`,
        items: [
          { label: "Video — Lesson overview", kind: "video" },
          { label: "Reading — Supporting material", kind: "reading" },
          { label: "Module examination (10 MCQs)", kind: "exam" },
        ],
      },
    ]);
    setExpandedModuleIdx(mi);
    setSelectedLesson({ scope: "module", mi, ri: 0 });
  };

  const removeModule = (idx: number) => {
    const maxIdxAfter = Math.max(0, modules.length - 2);
    setModules((prev) => prev.filter((_, i) => i !== idx));
    setExpandedModuleIdx((e) => Math.min(e, maxIdxAfter));
    setSelectedLesson((prev) => {
      if (!prev) return null;
      if (prev.mi === idx) return null;
      if (prev.mi > idx) return { ...prev, mi: prev.mi - 1 };
      return prev;
    });
  };

  const updateModuleTitle = (idx: number, title: string) => {
    setModules((prev) => prev.map((m, i) => (i === idx ? { ...m, title } : m)));
  };

  const updateRow = (sel: LessonSelection, patch: RowPatch) => {
    setModules((prev) => patchLessonRow(prev, sel, patch));
  };

  const addRow = (mi: number) => {
    let nextSel: LessonSelection | null = null;
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const items = [...m.items, { label: "Reading — New item", kind: "reading" as const, description: "" }];
        nextSel = { scope: "module", mi, ri: items.length - 1 };
        return { ...m, items };
      }),
    );
    if (nextSel) setSelectedLesson(nextSel);
  };

  /** End-of-module quiz row (learners open via module exam in My Learning). */
  const addModuleExamRow = (mi: number) => {
    let nextSel: LessonSelection | null = null;
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const items = [
          ...m.items,
          {
            label: "Module examination (10 MCQs)",
            kind: "exam" as const,
            description: "",
          },
        ];
        nextSel = { scope: "module", mi, ri: items.length - 1 };
        return { ...m, items };
      }),
    );
    if (nextSel) {
      setExpandedModuleIdx(mi);
      setSelectedLesson(nextSel);
    }
  };

  const addSubModuleExamRow = (mi: number, si: number) => {
    let nextSel: LessonSelection | null = null;
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const subMods = [...(m.subModules ?? [])];
        const sm = subMods[si];
        if (!sm) return m;
        const items = [
          ...sm.items,
          {
            label: "Sub-module examination (10 MCQs)",
            kind: "exam" as const,
            description: "",
          },
        ];
        subMods[si] = { ...sm, items };
        nextSel = { scope: "sub", mi, si, ri: items.length - 1 };
        return { ...m, subModules: subMods };
      }),
    );
    if (nextSel) {
      setExpandedModuleIdx(mi);
      setSelectedLesson(nextSel);
    }
  };

  const addSubRow = (mi: number, si: number) => {
    let nextSel: LessonSelection | null = null;
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const subMods = [...(m.subModules ?? [])];
        const sm = subMods[si];
        if (!sm) return m;
        const items = [...sm.items, { label: "Reading — New item", kind: "reading" as const, description: "" }];
        subMods[si] = { ...sm, items };
        nextSel = { scope: "sub", mi, si, ri: items.length - 1 };
        return { ...m, subModules: subMods };
      }),
    );
    if (nextSel) setSelectedLesson(nextSel);
  };

  const removeRow = (sel: LessonSelection) => {
    setModules((prev) =>
      prev.map((m, mi) => {
        if (mi !== sel.mi) return m;
        if (sel.scope === "module") {
          return { ...m, items: m.items.filter((_, j) => j !== sel.ri) };
        }
        const subMods = [...(m.subModules ?? [])];
        const sm = subMods[sel.si];
        if (!sm) return m;
        subMods[sel.si] = { ...sm, items: sm.items.filter((_, j) => j !== sel.ri) };
        return { ...m, subModules: subMods };
      }),
    );
    setSelectedLesson((prev) => {
      if (!prev) return null;
      if (prev.mi !== sel.mi) return prev;
      if (prev.scope !== sel.scope) return prev;
      if (sel.scope === "module" && prev.scope === "module") {
        if (prev.ri === sel.ri) return null;
        if (prev.ri > sel.ri) return { ...prev, ri: prev.ri - 1 };
        return prev;
      }
      if (sel.scope === "sub" && prev.scope === "sub" && prev.si === sel.si) {
        if (prev.ri === sel.ri) return null;
        if (prev.ri > sel.ri) return { ...prev, ri: prev.ri - 1 };
        return prev;
      }
      return prev;
    });
  };

  const addSubModule = (mi: number) => {
    let nextSel: LessonSelection | null = null;
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const existing = m.subModules ?? [];
        const si = existing.length;
        const subModules = [
          ...existing,
          {
            title: `Sub-module ${existing.length + 1}`,
            items: [{ label: "Reading — New item", kind: "reading" as const, description: "" }],
          },
        ];
        nextSel = { scope: "sub", mi, si, ri: 0 };
        return { ...m, subModules };
      }),
    );
    if (nextSel) {
      setExpandedModuleIdx(mi);
      setSelectedLesson(nextSel);
    }
  };

  const removeSubModule = (mi: number, si: number) => {
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const subMods = [...(m.subModules ?? [])].filter((_, j) => j !== si);
        return { ...m, subModules: subMods.length ? subMods : undefined };
      }),
    );
    setSelectedLesson((prev) => {
      if (!prev || prev.mi !== mi) return prev;
      if (prev.scope === "sub") {
        if (prev.si === si) return null;
        if (prev.si > si) return { ...prev, si: prev.si - 1 };
      }
      return prev;
    });
  };

  const updateSubModuleTitle = (mi: number, si: number, title: string) => {
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const subMods = [...(m.subModules ?? [])];
        if (!subMods[si]) return m;
        subMods[si] = { ...subMods[si], title };
        return { ...m, subModules: subMods };
      }),
    );
  };

  const appendLessonOfKind = (kind: CourseCurriculumKind, label: string) => {
    const mi = expandedModuleIdx;
    const sel = selectedLesson;
    let nextSel: LessonSelection | null = null;
    setModules((prev) => {
      const mod = prev[mi];
      if (!mod) return prev;
      if (sel?.mi === mi && sel.scope === "sub" && mod.subModules?.[sel.si]) {
        const si = sel.si;
        const subMods = mod.subModules!.map((s, i) =>
          i === si ? { ...s, items: [...s.items, { label, kind, description: "" }] } : s,
        );
        const ri = subMods[si].items.length - 1;
        nextSel = { scope: "sub", mi, si, ri };
        return prev.map((m, i) => (i === mi ? { ...mod, subModules: subMods } : m));
      }
      const items = [...mod.items, { label, kind, description: "" }];
      nextSel = { scope: "module", mi, ri: items.length - 1 };
      return prev.map((m, i) => (i === mi ? { ...mod, items } : m));
    });
    if (nextSel) setSelectedLesson(nextSel);
  };

  const appendLessonOfKindToModule = (mi: number, kind: CourseCurriculumKind, label: string) => {
    let nextSel: LessonSelection | null = null;
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const items = [...m.items, { label, kind, description: "" }];
        nextSel = { scope: "module", mi, ri: items.length - 1 };
        return { ...m, items };
      }),
    );
    setExpandedModuleIdx(mi);
    if (nextSel) setSelectedLesson(nextSel);
  };

  const uploadLessonVideo = async (sel: LessonSelection, file: File) => {
    setUploadingVideo(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      const nextModules = patchLessonRow(modules, sel, { videoUrl: data.url });
      setModules(nextModules);
      await persistCurriculumSnapshot(nextModules);
      setVideoSource("upload");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Video upload failed.");
    } finally {
      setUploadingVideo(false);
    }
  };

  const uploadExamAsset = async (sel: LessonSelection, file: File) => {
    setUploadingExam(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      const nextModules = patchLessonRow(modules, sel, { examUploadUrl: data.url });
      setModules(nextModules);
      await persistCurriculumSnapshot(nextModules);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Exam file upload failed.");
    } finally {
      setUploadingExam(false);
    }
  };

  const uploadFinalExamAsset = async (file: File) => {
    setUploadingExam(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      const nextFinalExam = { ...finalExamDraft, examUploadUrl: data.url };
      setFinalExamDraft(nextFinalExam);
      await persistCurriculumSnapshot(modules, nextFinalExam);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Final exam upload failed.");
    } finally {
      setUploadingExam(false);
    }
  };

  const steps = totalCurriculumSteps(modules);
  const catLabel =
    categories.find((c) => canonicalCategorySlug(c.slug) === canonicalCategorySlug(selectedCourse?.category ?? ""))
      ?.title ?? selectedCourse?.category ?? "—";

  const overviewStats = useMemo(() => {
    let lessons = 0;
    let quizzes = 0;
    let readings = 0;
    const countItem = (it: CourseCurriculumItem) => {
      lessons += 1;
      if (it.kind === "exam") quizzes++;
      else if (it.kind === "reading") readings++;
    };
    for (const m of modules) {
      for (const it of m.items) countItem(it);
      for (const sm of m.subModules ?? []) {
        for (const it of sm.items) countItem(it);
      }
    }
    const estMinutes = Math.max(lessons * 15, lessons > 0 ? 15 : 0);
    const h = Math.floor(estMinutes / 60);
    const min = estMinutes % 60;
    const durationLabel = lessons === 0 ? "—" : h > 0 ? `${h}h ${min}m` : `${min}m`;
    return {
      modules: modules.length,
      lessons,
      quizzes,
      assignments: readings > 0 ? Math.max(1, Math.ceil(readings / 3)) : 0,
      resources: readings,
      durationLabel,
    };
  }, [modules]);

  const catalogFormOpen = isCreating || !!editingSlug;
  const canEditCurriculum = !!selectedSlug && !isCreating && !!selectedCourse;
  const canEditPricing = isCreating || !!selectedCourse;
  const pricingDiscountPct = useMemo(
    () => computeDiscountPercent(draft.price, draft.oldPrice),
    [draft.price, draft.oldPrice],
  );

  const enrollmentsForCourse = useMemo(
    () => enrollmentRows.filter((e) => e.courseSlug === workspaceCourseSlug),
    [enrollmentRows, workspaceCourseSlug],
  );

  const enrollmentsDisplay = useMemo(() => {
    const byEmail = new Map<string, StoredCourseEnrollment>();
    for (const r of enrollmentsForCourse) {
      const prev = byEmail.get(r.learnerEmail);
      if (!prev || new Date(r.enrolledAt) > new Date(prev.enrolledAt)) {
        byEmail.set(r.learnerEmail, r);
      }
    }
    return [...byEmail.values()].sort(
      (a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime(),
    );
  }, [enrollmentsForCourse]);

  if (!content && !loadError) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-violet-500/25 bg-gradient-to-b from-[#0b1224] to-[#070b14] px-6 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" aria-hidden />
        <p className="text-sm font-medium text-gray-300">Loading catalog…</p>
        <p className="max-w-xs text-xs text-gray-500">Pulling courses and categories from the server.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="relative border-b border-white/[0.06] bg-[#6f55ff]/[0.07] px-4 py-5 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_0%_0%,rgba(111,85,255,0.22),transparent_50%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-500/20 ring-1 ring-violet-400/30">
                <BookOpen className="h-6 w-6 text-violet-200" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/90">Self-paced catalog</p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">Course workspace</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-[10px] font-medium text-gray-300">
                      Course Info
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-[10px] font-medium text-gray-300">
                      Core Section
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="text-[10px] text-gray-500">Publish when ready</span>
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedCourse ? (
                <Link
                  href={`/courses/${selectedCourse.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                  Preview live page
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {loadError ? (
          <p className="mx-4 mb-4 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100 sm:mx-6">
            {loadError}
          </p>
        ) : null}

        <div className="px-2 pb-2 pt-3 sm:px-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-black/35 p-1 ring-1 ring-white/[0.04]">
            {COURSE_WORKSPACE_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setWorkspaceTab(tab)}
                className={`relative rounded-lg px-3 py-2.5 text-[11px] font-semibold transition sm:px-4 ${
                  workspaceTab === tab
                    ? "bg-violet-600 text-white shadow-[0_4px_20px_rgba(111,85,255,0.35)]"
                    : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {workspaceTab === "Course Info" ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1224] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-black/20 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/25">
                  <FolderOpen className="h-5 w-5 text-emerald-300" aria-hidden />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white sm:text-base">Catalog</h2>
                  <p className="text-[11px] text-gray-500">Select a row to edit, or create a new self-paced course.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-medium text-gray-300">
                  {filteredTableCourses.length} shown
                </span>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-indigo-500"
                >
                  <Plus className="h-4 w-4" /> New course
                </button>
              </div>
            </div>
            <div className="border-b border-white/[0.05] px-4 py-3 sm:px-5">
              <label className="flex max-w-xs flex-col gap-1.5 text-[11px] font-medium text-gray-500">
                Filter by category
                <select
                  value={categoryFilterSlug}
                  onChange={(e) => setCategoryFilterSlug(e.target.value)}
                  className={`${spField} cursor-pointer text-sm`}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d1528] shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.03] text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {["Course", "Slug", "Category", "Level", "Price", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTableCourses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center">
                        <p className="text-sm font-medium text-gray-400">No courses match this filter</p>
                        <p className="mt-1 text-[11px] text-gray-600">Try “All categories” or add a new course.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTableCourses.map((c) => {
                      const catTitle = categories.find((x) => x.slug === c.category)?.title ?? c.category;
                      const sel = selectedSlug === c.slug && !isCreating;
                      return (
                        <tr
                          key={c.slug}
                          className={`transition hover:bg-violet-500/[0.06] ${sel ? "border-l-2 border-l-violet-500 bg-violet-500/[0.08]" : "border-l-2 border-l-transparent"}`}
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => openEditTableRow(c)}
                              className="flex w-full max-w-md items-center gap-3 text-left"
                            >
                              <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50 shadow-inner">
                                <Image src={c.image} alt="" fill unoptimized className="object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white">{c.title}</p>
                                <p className="truncate text-[11px] text-gray-500">{c.subtitle}</p>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-violet-200/90">{c.slug}</td>
                          <td className="px-4 py-3 text-gray-300">{catTitle}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-gray-300">{c.level}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-amber-300">{c.price}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                c.published ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/15 text-amber-200"
                              }`}
                            >
                              {c.published ? "Live" : "Draft"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                title="Edit details"
                                onClick={() => openEditTableRow(c)}
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-violet-500/20 hover:text-violet-100"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => void deleteCourse(c.slug)}
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-red-500/15 hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {catalogFormOpen ? (
            <section className="overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-b from-[#101a32] via-[#0d1528] to-[#0a0f1c] shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-violet-500/10">
              <div className="border-b border-white/[0.06] bg-violet-500/[0.08] px-4 py-4 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/80">Course editor</p>
                    <h2 className="mt-1 text-lg font-bold text-white">
                      {isCreating ? "Create self-paced course" : `Edit “${draft.title || editingSlug}”`}
                    </h2>
                    <p className="mt-2 max-w-xl text-xs leading-relaxed text-gray-400">
                      Save here first, then use <strong className="text-gray-300">Core Section</strong> for modules, lessons, and
                      exams. Public URL:{" "}
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-violet-200">
                        /courses/{editingSlug ?? slugify(draft.slug || draft.title || "slug")}
                      </code>
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-6">
              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                {!editingSlug || isCreating ? (
                  <label className="block md:col-span-2">
                    <span className="text-[11px] text-gray-500">URL slug</span>
                    <input
                      value={draft.slug}
                      onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                      className={`${spField} font-mono text-xs`}
                      placeholder="my-course-slug"
                    />
                  </label>
                ) : (
                  <p className="md:col-span-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-gray-400">
                    Slug: {editingSlug}
                  </p>
                )}
                <label className="block">
                  <span className="text-[11px] text-gray-500">Title</span>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    className={spField}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-gray-500">Subtitle</span>
                  <input
                    value={draft.subtitle}
                    onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
                    className={spField}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-gray-500">Instructor name</span>
                  <input
                    value={draft.instructorName ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, instructorName: e.target.value }))}
                    className={spField}
                    placeholder="e.g. Dr. Giri"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-gray-500">Detail page badge (e.g. SELF-PACED)</span>
                  <input
                    value={draft.pageBadge ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, pageBadge: e.target.value }))}
                    className={spField}
                    placeholder="SELF-PACED"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-gray-500">Instructor role (public page)</span>
                  <input
                    value={draft.trainerRole ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, trainerRole: e.target.value }))}
                    className={spField}
                    placeholder="Senior Instructor"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-gray-500">Instructor experience line</span>
                  <input
                    value={draft.trainerExperience ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, trainerExperience: e.target.value }))}
                    className={spField}
                    placeholder="10+ years · 5,000+ learners taught"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-gray-500">Instructor bio (public page)</span>
                  <textarea
                    value={draft.trainerBio ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, trainerBio: e.target.value }))}
                    rows={3}
                    className={`${spField} min-h-[5.5rem] resize-y font-mono text-[12px]`}
                    placeholder="Short bio shown on /courses/[slug]…"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-gray-500">Certifications (comma-separated)</span>
                  <input
                    value={(draft.trainerCertifications ?? []).join(", ")}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        trainerCertifications: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    className={spField}
                    placeholder="Certified Trainer, PMP, …"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-gray-500">Worked with (comma-separated)</span>
                  <input
                    value={(draft.trainerWorkedWith ?? []).join(", ")}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        trainerWorkedWith: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    className={spField}
                    placeholder="IBM, Deloitte, …"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-gray-500">Highlights (one bullet per line — public course page)</span>
                  <textarea
                    value={(draft.highlights ?? []).join("\n")}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        highlights: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    rows={5}
                    className={`${spField} min-h-[8rem] resize-y font-mono text-[12px]`}
                    placeholder={"Lifetime access\nHands-on labs"}
                  />
                </label>
                <div className="md:col-span-2">
                  <span className="text-[11px] text-gray-500">FAQs (public course page)</span>
                  <div className="mt-2 space-y-2">
                    {(draft.faqs ?? []).map((faq, i) => (
                      <div
                        key={i}
                        className="grid gap-2 rounded-xl border border-white/[0.08] bg-black/30 p-3 sm:grid-cols-[1fr_minmax(0,2fr)_auto]"
                      >
                        <input
                          value={faq.q}
                          onChange={(e) =>
                            setDraft((d) => {
                              const next = [...(d.faqs ?? [])];
                              next[i] = { ...next[i], q: e.target.value };
                              return { ...d, faqs: next };
                            })
                          }
                          className={spFieldSm}
                          placeholder="Question"
                        />
                        <textarea
                          value={faq.a}
                          onChange={(e) =>
                            setDraft((d) => {
                              const next = [...(d.faqs ?? [])];
                              next[i] = { ...next[i], a: e.target.value };
                              return { ...d, faqs: next };
                            })
                          }
                          rows={2}
                          className={`${spFieldSm} resize-y sm:min-h-[2.75rem]`}
                          placeholder="Answer"
                        />
                        <button
                          type="button"
                          className="rounded-lg border border-red-500/35 px-3 py-2 text-[11px] font-medium text-red-200 transition hover:bg-red-500/15"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              faqs: (d.faqs ?? []).filter((_, j) => j !== i),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="rounded-lg border border-dashed border-violet-500/35 px-3 py-2 text-[11px] font-semibold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/10"
                      onClick={() => setDraft((d) => ({ ...d, faqs: [...(d.faqs ?? []), { q: "", a: "" }] }))}
                    >
                      + Add FAQ
                    </button>
                  </div>
                </div>
                <label className="block">
                  <span className="text-[11px] text-gray-500">Category</span>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                    className={spField}
                  >
                    {categories.length === 0 ? (
                      <option value="">Add categories first</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.title}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] text-gray-500">Level</span>
                    <input
                      value={draft.level}
                      onChange={(e) => setDraft((d) => ({ ...d, level: e.target.value }))}
                      className={spField}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-gray-500">Duration</span>
                    <input
                      value={draft.duration}
                      onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
                      className={spField}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] text-gray-500">Sale price</span>
                    <input
                      value={draft.price}
                      onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                      className={spField}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-gray-500">Old price (list)</span>
                    <input
                      value={draft.oldPrice}
                      onChange={(e) => setDraft((d) => ({ ...d, oldPrice: e.target.value }))}
                      className={spField}
                    />
                  </label>
                </div>
                <p className="md:col-span-2 text-[10px] text-gray-600">
                  Discount vs list price: use the{" "}
                  <button
                    type="button"
                    onClick={() => setWorkspaceTab("Pricing")}
                    className="font-medium text-violet-300 underline decoration-violet-500/40 hover:text-violet-200"
                  >
                    Pricing
                  </button>{" "}
                  tab for a live preview.
                </p>
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-gray-500">Cover image URL</span>
                  <input
                    value={draft.image}
                    onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
                    className={`${spField} font-mono text-[12px]`}
                  />
                </label>
                <div className="md:col-span-2">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-400/35 bg-violet-500/[0.07] py-3 text-xs font-semibold text-violet-100 transition hover:border-violet-400/55 hover:bg-violet-500/15">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImage ? "Uploading…" : "Upload cover image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadCover(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 md:col-span-2">
                  <input
                    id="course-published"
                    type="checkbox"
                    checked={draft.published}
                    onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))}
                    className="h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 accent-emerald-500"
                  />
                  <label htmlFor="course-published" className="cursor-pointer text-xs leading-snug text-gray-300">
                    <span className="font-semibold text-white">Published on site</span>
                    <span className="mt-0.5 block text-[11px] text-gray-500">When off, the course stays hidden from the catalog.</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-white/[0.06] pt-5">
                <button
                  type="button"
                  disabled={savingCatalog}
                  onClick={() => void saveCatalogDraft()}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {savingCatalog ? "Saving…" : "Save course"}
                </button>
                <button
                  type="button"
                  disabled={savingCatalog}
                  onClick={() => void saveCatalogDraft({ goToCurriculumAfter: true })}
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-gray-100 transition hover:border-violet-400/35 hover:bg-violet-500/10 disabled:opacity-50"
                >
                  Save &amp; go to Core Section
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingSlug(null);
                    if (isCreating) {
                      setDraft(emptyDraft());
                      setSelectedSlug("");
                    }
                  }}
                  className="rounded-xl border border-transparent px-4 py-2.5 text-xs text-gray-400 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-gray-200"
                >
                  Close editor
                </button>
              </div>
              </div>
            </section>
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 bg-[#0b1224]/60 px-4 py-6 text-center text-xs text-gray-500">
              <span className="mb-2 block font-medium text-gray-300">No course selected</span>
              Click <strong className="text-gray-400">New course</strong> or the pencil on a row to open the editor.
              <span className="mt-2 block text-[11px] leading-relaxed text-gray-500">
                There you can edit the catalog card, <strong className="text-gray-400">public /courses/[slug] page</strong> fields
                (badge, highlights, FAQs, instructor copy), then use <strong className="text-gray-400">Core Section</strong> for
                modules.
              </span>
            </p>
          )}
        </>
      ) : null}

      {workspaceTab === "Core Section" ? (
        <>
          {!canEditCurriculum ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-8 text-center">
              <p className="text-sm font-medium text-amber-100">Choose a saved course first</p>
              <p className="mt-2 text-xs text-amber-200/80">
                Open <strong>Course Info</strong>, create the course (title, cover image) and click{" "}
                <strong>Save course</strong>. Then open this tab to build modules.
              </p>
              <button
                type="button"
                onClick={() => setWorkspaceTab("Course Info")}
                className="mt-4 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
              >
                Go to Course Info
              </button>
            </div>
          ) : (
            <>
              {/* Toolbar — matches curriculum mock */}
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1224] p-4">
                <div>
                  <nav className="mb-2 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                    <span>Courses</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <span className="max-w-[220px] truncate font-medium text-violet-300">{selectedCourse!.title}</span>
                  </nav>
                  <h2 className="text-xl font-semibold text-white md:text-2xl">Core Section</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {catLabel} · Edit <strong className="font-medium text-gray-300">modules &amp; module exams</strong> below,
                    then configure the <strong className="font-medium text-gray-300">final exam</strong> in its own panel.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/courses/${selectedCourse!.slug}?tab=course-content`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/15 bg-[#0a1120] px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/5"
                  >
                    Preview Course
                  </Link>
                  <button
                    type="button"
                    onClick={() => void saveCurriculumOnly()}
                    disabled={savingCurriculum}
                    className="rounded-lg border border-white/15 bg-[#0a1120] px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveCurriculumOnly()}
                    disabled={savingCurriculum}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(111,85,255,0.35)] hover:bg-[#7d63ff] disabled:opacity-50"
                  >
                    Publish Course
                    <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                  </button>
                </div>
              </div>

              <section
                className="rounded-2xl border border-violet-500/25 bg-[#070c16] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5"
                aria-labelledby="curriculum-modules-heading"
              >
                <header className="flex flex-wrap gap-3 border-b border-white/10 pb-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/25">
                    <Layers className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      id="curriculum-modules-heading"
                      className="text-base font-semibold tracking-tight text-white md:text-lg"
                    >
                      Modules &amp; module examinations
                    </h3>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500">
                      Course structure, lessons, sub-modules, and <strong className="font-medium text-gray-400">per-module</strong>{" "}
                      quizzes. Everything here is saved as the course curriculum.
                    </p>
                  </div>
                </header>

                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-white/10 bg-[#0d1528] px-3 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Templates &amp; bulk actions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={applyFoodSafetyTemplate}
                        className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/20"
                      >
                        Load Food Safety diploma track
                      </button>
                      <button
                        type="button"
                        onClick={applyGenericTemplate}
                        className="rounded-lg border border-violet-500/35 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/20"
                      >
                        Load themed generic modules
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveCurriculumOnly()}
                        disabled={savingCurriculum}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        {savingCurriculum ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Save curriculum to site
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
                {/* Left — Course structure */}
                <div className="rounded-xl border border-white/10 bg-[#0d1528] p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">Module tree</h3>
                    <button
                      type="button"
                      onClick={addModule}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/25"
                    >
                      <Plus className="h-3 w-3" /> Add Module
                    </button>
                  </div>
                  <div className="space-y-1">
                    {modules.map((mod, mi) => {
                      const open = expandedModuleIdx === mi;
                      return (
                        <div key={`mod-${mi}`} className="rounded-lg border border-white/8 bg-black/25">
                          <button
                            type="button"
                            onClick={() => setExpandedModuleIdx(mi)}
                            className="flex w-full items-center gap-2 px-2 py-2 text-left text-xs"
                          >
                            <GripVertical className="h-3.5 w-3.5 shrink-0 text-gray-600" />
                            {open ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                            )}
                            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
                            <span className="min-w-0 flex-1 truncate font-medium text-gray-200">{mod.title}</span>
                            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400">
                              {moduleStepCount(mod)}
                            </span>
                          </button>
                          {open ? (
                            <div className="border-t border-white/8 px-2 py-2 space-y-2">
                              <label className="block text-[10px] text-gray-500">
                                Module title
                                <input
                                  value={mod.title}
                                  onChange={(e) => updateModuleTitle(mi, e.target.value)}
                                  className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white outline-none"
                                />
                              </label>
                              {mod.items.length > 0 ? (
                                <ul className="rounded-md border border-white/8 bg-black/20 px-1 py-1">
                                  <li className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-wide text-gray-600">
                                    Module lessons
                                  </li>
                                  {mod.items.map((les, ri) => {
                                    const Icon = rowIcon(les.kind);
                                    const sel =
                                      selectedLesson?.scope === "module" &&
                                      selectedLesson.mi === mi &&
                                      selectedLesson.ri === ri;
                                    const rowSel: LessonSelection = { scope: "module", mi, ri };
                                    return (
                                      <li key={`${mi}-${ri}`}>
                                        <div
                                          className={`mt-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${
                                            sel
                                              ? "bg-[#6f55ff]/25 text-white ring-1 ring-[#6f55ff]/40"
                                              : "text-gray-400 hover:bg-white/5"
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setExpandedModuleIdx(mi);
                                              setSelectedLesson(rowSel);
                                            }}
                                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                          >
                                            <Icon className="h-3 w-3 shrink-0 opacity-80" />
                                            <span className="text-gray-500">
                                              {mi + 1}.{ri + 1}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">{les.label}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => removeRow(rowSel)}
                                            className="shrink-0 rounded p-1 text-gray-500 hover:bg-rose-500/15 hover:text-rose-300"
                                            title="Delete lesson"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : null}
                              {(mod.subModules ?? []).map((sm, si) => (
                                <div
                                  key={`sm-${mi}-${si}`}
                                  className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-2"
                                >
                                  <label className="block text-[10px] text-gray-500">
                                    Sub-module title
                                    <input
                                      value={sm.title}
                                      onChange={(e) => updateSubModuleTitle(mi, si, e.target.value)}
                                      className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white outline-none"
                                    />
                                  </label>
                                  <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2">
                                    {sm.items.map((les, ri) => {
                                      const Icon = rowIcon(les.kind);
                                      const sel =
                                        selectedLesson?.scope === "sub" &&
                                        selectedLesson.mi === mi &&
                                        selectedLesson.si === si &&
                                        selectedLesson.ri === ri;
                                      const rowSel: LessonSelection = { scope: "sub", mi, si, ri };
                                      return (
                                        <li key={`${mi}-s${si}-${ri}`}>
                                          <div
                                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${
                                              sel
                                                ? "bg-[#6f55ff]/25 text-white ring-1 ring-[#6f55ff]/40"
                                                : "text-gray-400 hover:bg-white/5"
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setExpandedModuleIdx(mi);
                                                setSelectedLesson(rowSel);
                                              }}
                                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                            >
                                              <Icon className="h-3 w-3 shrink-0 opacity-80" />
                                              <span className="shrink-0 text-gray-500">
                                                {lessonIndexLabel(rowSel)}
                                              </span>
                                              <span className="min-w-0 flex-1 truncate">{les.label}</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => removeRow(rowSel)}
                                              className="shrink-0 rounded p-1 text-gray-500 hover:bg-rose-500/15 hover:text-rose-300"
                                              title="Delete lesson"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                  <button
                                    type="button"
                                    onClick={() => addSubRow(mi, si)}
                                    className="mt-2 text-[10px] font-medium text-violet-300 hover:text-violet-200"
                                  >
                                    + Add row in sub-module
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addSubModuleExamRow(mi, si)}
                                    className="mt-1 block w-full rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-1.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/20"
                                  >
                                    + Sub-module examination (quiz)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeSubModule(mi, si)}
                                    className="mt-1 block text-[10px] font-medium text-rose-300/90 hover:text-rose-200"
                                  >
                                    Remove sub-module
                                  </button>
                                </div>
                              ))}
                              <div className="rounded-lg border border-dashed border-amber-500/35 bg-amber-500/10 px-2 py-2">
                                <p className="text-[10px] font-semibold text-amber-100">Module examination</p>
                                <p className="mt-0.5 text-[10px] leading-snug text-gray-500">
                                  Adds an end-of-module quiz. Configure timer, passing %, and paper upload in the lesson
                                  editor.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => addModuleExamRow(mi)}
                                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-1.5 text-[10px] font-semibold text-amber-50 hover:bg-amber-500/25"
                                >
                                  <ClipboardList className="h-3 w-3" /> Add module examination
                                </button>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-[#0b1326] p-2">
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                                  Add New Content (this module)
                                </p>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {CONTENT_TYPES.map(({ label, icon: Icon, color, kind }) => (
                                    <button
                                      key={`mod-${mi}-${label}`}
                                      type="button"
                                      onClick={() => appendLessonOfKindToModule(mi, kind, `${label} — New item`)}
                                      className={`flex flex-col items-center gap-1 rounded-lg bg-linear-to-br ${color} px-1 py-1.5 text-center shadow-lg transition hover:brightness-110`}
                                    >
                                      <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                                      <span className="text-[8px] font-semibold leading-tight text-white">{label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => addRow(mi)}
                                className="block text-[10px] font-medium text-violet-300 hover:text-violet-200"
                              >
                                + Add lesson row (module)
                              </button>
                              <button
                                type="button"
                                onClick={() => addSubModule(mi)}
                                className="block text-[10px] font-medium text-amber-300/90 hover:text-amber-200"
                              >
                                + Add sub-module
                              </button>
                              <button
                                type="button"
                                onClick={() => removeModule(mi)}
                                className="block text-[10px] font-medium text-rose-300/90 hover:text-rose-200"
                              >
                                Remove module
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addModule}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 py-2 text-[11px] text-gray-400 hover:border-violet-500/40 hover:text-violet-200"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add New Module
                  </button>
                </div>

                {/* Middle — Edit lesson */}
                <div className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
                  {selectedLesson && getLessonFromModules(modules, selectedLesson) ? (
                    <>
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white">Edit Lesson</h3>
                        <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] text-gray-400">
                          {lessonIndexLabel(selectedLesson)}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <label className="block">
                          <span className="mb-1 block text-[11px] text-gray-500">Lesson Title</span>
                          <input
                            value={getLessonFromModules(modules, selectedLesson)!.label}
                            onChange={(e) => updateRow(selectedLesson, { label: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] text-gray-500">Lesson Type</span>
                          <select
                            value={kindToLessonLabel(getLessonFromModules(modules, selectedLesson)!.kind)}
                            onChange={(e) =>
                              updateRow(selectedLesson, {
                                kind: lessonLabelToKind(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-500/40"
                          >
                            <option>Video</option>
                            <option>Document</option>
                            <option>Quiz</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] text-gray-500">Description</span>
                          <textarea
                            value={getLessonFromModules(modules, selectedLesson)!.description ?? ""}
                            onChange={(e) => updateRow(selectedLesson, { description: e.target.value })}
                            rows={5}
                            placeholder="Lesson summary for your team (saved with curriculum)."
                            className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm leading-relaxed outline-none focus:border-violet-500/40"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] text-gray-500">About this lesson (shown below video)</span>
                          <textarea
                            value={getLessonFromModules(modules, selectedLesson)!.about ?? ""}
                            onChange={(e) => updateRow(selectedLesson, { about: e.target.value })}
                            rows={4}
                            placeholder="What this lesson/module covers."
                            className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm leading-relaxed outline-none focus:border-violet-500/40"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[11px] text-gray-500">
                            Learning outcomes (one per line)
                          </span>
                          <textarea
                            value={(getLessonFromModules(modules, selectedLesson)!.learningOutcomes ?? []).join("\n")}
                            onChange={(e) =>
                              updateRow(selectedLesson, {
                                learningOutcomes: e.target.value
                                  .split("\n")
                                  .map((x) => x.trim())
                                  .filter((x) => x.length > 0),
                              })
                            }
                            rows={6}
                            placeholder={"Understand X\nApply Y\nComplete Z"}
                            className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm leading-relaxed outline-none focus:border-violet-500/40"
                          />
                        </label>
                        <div className="grid gap-3 rounded-lg border border-white/10 bg-black/30 p-3 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-gray-500">Notes (text)</span>
                            <textarea
                              value={getLessonFromModules(modules, selectedLesson)!.notes ?? ""}
                              onChange={(e) => updateRow(selectedLesson, { notes: e.target.value })}
                              rows={3}
                              placeholder="Lesson notes for learners"
                              className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-gray-500">Captions</span>
                            <input
                              value={getLessonFromModules(modules, selectedLesson)!.captions ?? ""}
                              onChange={(e) => updateRow(selectedLesson, { captions: e.target.value })}
                              placeholder="Caption text or URL"
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-gray-500">PDF URL</span>
                            <input
                              value={getLessonFromModules(modules, selectedLesson)!.pdfUrl ?? ""}
                              onChange={(e) => updateRow(selectedLesson, { pdfUrl: e.target.value })}
                              placeholder="https://...pdf"
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-gray-500">Podcast URL</span>
                            <input
                              value={getLessonFromModules(modules, selectedLesson)!.podcastUrl ?? ""}
                              onChange={(e) => updateRow(selectedLesson, { podcastUrl: e.target.value })}
                              placeholder="https://...audio"
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-gray-500">Resources URL</span>
                            <input
                              value={getLessonFromModules(modules, selectedLesson)!.resourceUrl ?? ""}
                              onChange={(e) => updateRow(selectedLesson, { resourceUrl: e.target.value })}
                              placeholder="https://...resources"
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-gray-500">Download URL</span>
                            <input
                              value={getLessonFromModules(modules, selectedLesson)!.downloadUrl ?? ""}
                              onChange={(e) => updateRow(selectedLesson, { downloadUrl: e.target.value })}
                              placeholder="https://...download"
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                            />
                          </label>
                        </div>
                        {getLessonFromModules(modules, selectedLesson)!.kind === "exam" ? (
                          <div className="space-y-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                            <p className="text-[11px] font-medium text-amber-100">Quiz / examination</p>
                            <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-gray-200">
                              <span>Timed exam</span>
                              <input
                                type="checkbox"
                                checked={!!getLessonFromModules(modules, selectedLesson)!.timedExam}
                                onChange={(e) =>
                                  updateRow(selectedLesson, {
                                    timedExam: e.target.checked,
                                    ...(e.target.checked
                                      ? {}
                                      : { examDurationMinutes: undefined }),
                                  })
                                }
                                className="accent-amber-500"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-[11px] text-gray-500">
                                Duration (minutes)
                                {!getLessonFromModules(modules, selectedLesson)!.timedExam ? (
                                  <span className="text-gray-600"> — optional when not timed</span>
                                ) : null}
                              </span>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                disabled={!getLessonFromModules(modules, selectedLesson)!.timedExam}
                                value={
                                  getLessonFromModules(modules, selectedLesson)!.examDurationMinutes ?? ""
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateRow(selectedLesson, {
                                    examDurationMinutes: v === "" ? undefined : Math.max(1, Number(v) || 1),
                                  });
                                }}
                                placeholder="e.g. 30"
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none disabled:opacity-40"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1 block text-[11px] text-gray-500">
                                Passing score (% correct to pass)
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={
                                  getLessonFromModules(modules, selectedLesson)!.examPassingScorePercent ?? ""
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateRow(selectedLesson, {
                                    examPassingScorePercent:
                                      v === "" ? undefined : Math.min(100, Math.max(0, Math.round(Number(v) || 0))),
                                  });
                                }}
                                placeholder="e.g. 70"
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                              />
                            </label>
                            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                              <p className="mb-2 text-[11px] font-medium text-gray-400">Exam paper / attachment</p>
                              <p className="mb-2 text-[10px] text-gray-500">
                                PDF, Word, or CSV — same upload API as other admin files.
                              </p>
                              {getLessonFromModules(modules, selectedLesson)!.examUploadUrl ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <a
                                    href={getLessonFromModules(modules, selectedLesson)!.examUploadUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="truncate text-xs text-violet-300 underline"
                                  >
                                    {getLessonFromModules(modules, selectedLesson)!.examUploadUrl}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => updateRow(selectedLesson, { examUploadUrl: undefined })}
                                    className="text-[10px] text-rose-300 hover:text-rose-200"
                                  >
                                    Clear
                                  </button>
                                </div>
                              ) : (
                                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/15 py-2 text-xs text-amber-100 hover:bg-amber-500/25">
                                  <Upload className="h-3.5 w-3.5" />
                                  {uploadingExam ? "Uploading…" : "Upload exam file (PDF / Word / CSV)"}
                                  <input
                                    type="file"
                                    accept={EXAM_FILE_ACCEPT}
                                    className="hidden"
                                    disabled={uploadingExam}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) void uploadExamAsset(selectedLesson, f);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        ) : null}
                        <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                          <p className="mb-2 text-[11px] font-medium text-gray-400">Video Source</p>
                          <div className="flex flex-wrap gap-4 text-xs">
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="radio"
                                name="vsrc"
                                checked={videoSource === "upload"}
                                onChange={() => setVideoSource("upload")}
                                className="accent-violet-500"
                              />
                              Upload Video
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 text-gray-300">
                              <input
                                type="radio"
                                name="vsrc"
                                checked={videoSource === "url"}
                                onChange={() => setVideoSource("url")}
                                className="accent-violet-500"
                              />
                              Video URL
                            </label>
                          </div>
                          <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-[#0a1120] p-3">
                            {videoSource === "upload" ? (
                              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-violet-500/35 bg-violet-500/15 py-2 text-xs text-violet-100 hover:bg-violet-500/25">
                                <Upload className="h-3.5 w-3.5" />
                                {uploadingVideo ? "Uploading…" : "Upload lesson video"}
                                <input
                                  type="file"
                                  accept={VIDEO_FILE_ACCEPT}
                                  className="hidden"
                                  disabled={uploadingVideo || !selectedLesson}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f && selectedLesson) void uploadLessonVideo(selectedLesson, f);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            ) : (
                              <input
                                value={getLessonFromModules(modules, selectedLesson)!.videoUrl ?? ""}
                                onChange={(e) => updateRow(selectedLesson, { videoUrl: e.target.value })}
                                placeholder="https://.../lesson-video.mp4"
                                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                              />
                            )}
                            {getLessonFromModules(modules, selectedLesson)!.videoUrl ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <a
                                  href={getLessonFromModules(modules, selectedLesson)!.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="truncate text-xs text-violet-300 underline"
                                >
                                  {getLessonFromModules(modules, selectedLesson)!.videoUrl}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => updateRow(selectedLesson, { videoUrl: undefined })}
                                  className="text-[10px] text-rose-300 hover:text-rose-200"
                                >
                                  Clear
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-gray-500">Duration (HH:MM:SS)</span>
                            <input
                              defaultValue="00:15:30"
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm outline-none"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-[11px] text-gray-500">Preview (minutes)</span>
                            <input
                              defaultValue="3"
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                            />
                          </label>
                        </div>
                        <div className="space-y-2 border-t border-white/10 pt-3">
                          {(
                            [
                              ["Make this lesson previewable", lessonPreviewable, setLessonPreviewable],
                              ["Free Content", lessonFree, setLessonFree],
                              ["Download Allowed", lessonDownload, setLessonDownload],
                            ] as const
                          ).map(([label, on, setOn]) => (
                            <div key={label} className="flex cursor-pointer items-center justify-between gap-3 text-xs">
                              <span className="text-gray-300">{label}</span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={on}
                                onClick={() => setOn(!on)}
                                className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-emerald-600" : "bg-gray-700"}`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                          <button
                            type="button"
                            className="rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-white/5"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveCurriculumOnly()}
                            disabled={savingCurriculum}
                            className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff] disabled:opacity-50"
                          >
                            Update Lesson
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[280px] flex-col items-center justify-center text-center text-sm text-gray-500">
                      Select a lesson from the structure panel, add a module, or use{" "}
                      <strong className="text-gray-400">Add module examination</strong> under each module.
                    </div>
                  )}
                </div>

              </div>

              <section className="rounded-xl border border-white/10 bg-[#0b1224] p-4">
                <h3 className="mb-4 text-sm font-semibold text-white">Curriculum overview</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {[
                    ["Total Modules", String(overviewStats.modules)],
                    ["Total Lessons", String(overviewStats.lessons)],
                    ["Total Duration", overviewStats.durationLabel],
                    ["Total Quizzes", String(overviewStats.quizzes)],
                    ["Total Assignments", String(overviewStats.assignments)],
                    ["Total Resources", String(overviewStats.resources)],
                  ].map(([k, v]) => (
                    <article
                      key={k}
                      className="rounded-xl border border-white/10 bg-[#0d1528] p-3 text-center shadow-inner"
                    >
                      <p className="text-[11px] text-gray-500">{k}</p>
                      <p className="mt-2 text-xl font-bold text-white">{v}</p>
                    </article>
                  ))}
                </div>
              </section>
                </div>
              </section>

              <section
                className="mt-6 rounded-2xl border border-amber-500/35 bg-[#0c1018] p-4 shadow-[inset_0_1px_0_rgba(251,191,36,0.07)] md:p-5"
                aria-labelledby="final-exam-heading"
              >
                <header className="flex flex-wrap gap-3 border-b border-amber-500/25 pb-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30">
                    <Award className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      id="final-exam-heading"
                      className="text-base font-semibold tracking-tight text-white md:text-lg"
                    >
                      Final certification exam
                    </h3>
                    <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500">
                      <strong className="font-medium text-amber-200/90">Course-wide</strong> capstone — not part of the module
                      list above. Learners open it with{" "}
                      <span className="rounded bg-black/40 px-1 font-mono text-[11px] text-gray-300">?final=1</span> on the
                      exam URL. Saved with the same Publish / Save actions as the curriculum.
                    </p>
                  </div>
                </header>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="text-[11px] text-gray-500">Title shown on exam screen</span>
                    <input
                      value={finalExamDraft.title ?? ""}
                      onChange={(e) => setFinalExamDraft((d) => ({ ...d, title: e.target.value }))}
                      placeholder={`Final examination — ${selectedCourse!.title.slice(0, 48)}`}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-gray-200">
                    <span>Timed final exam</span>
                    <input
                      type="checkbox"
                      checked={!!finalExamDraft.timedExam}
                      onChange={(e) =>
                        setFinalExamDraft((d) => ({
                          ...d,
                          timedExam: e.target.checked,
                          ...(e.target.checked ? {} : { examDurationMinutes: undefined }),
                        }))
                      }
                      className="accent-amber-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-gray-500">Duration (minutes)</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      disabled={!finalExamDraft.timedExam}
                      value={finalExamDraft.examDurationMinutes ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFinalExamDraft((d) => ({
                          ...d,
                          examDurationMinutes: v === "" ? undefined : Math.max(1, Number(v) || 1),
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none disabled:opacity-40"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-[11px] text-gray-500">Passing score (% minimum correct)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={finalExamDraft.passingScorePercent ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFinalExamDraft((d) => ({
                          ...d,
                          passingScorePercent:
                            v === "" ? undefined : Math.min(100, Math.max(0, Math.round(Number(v) || 0))),
                        }));
                      }}
                      placeholder="e.g. 70"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                    />
                  </label>
                  <div className="md:col-span-2 rounded-lg border border-amber-500/20 bg-black/30 p-3">
                    <p className="mb-2 text-[11px] font-medium text-amber-100/90">Final exam paper / attachment</p>
                    {finalExamDraft.examUploadUrl ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={finalExamDraft.examUploadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-xs text-violet-300 underline"
                        >
                          {finalExamDraft.examUploadUrl}
                        </a>
                        <button
                          type="button"
                          onClick={() => setFinalExamDraft((d) => ({ ...d, examUploadUrl: undefined }))}
                          className="text-[10px] text-rose-300 hover:text-rose-200"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 py-2 text-xs text-amber-100 hover:bg-amber-500/20">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingExam ? "Uploading…" : "Upload final exam file (PDF / Word / CSV)"}
                        <input
                          type="file"
                          accept={EXAM_FILE_ACCEPT}
                          className="hidden"
                          disabled={uploadingExam}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void uploadFinalExamAsset(f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </>
      ) : null}

      {workspaceTab === "Pricing" ? (
        <>
          {!canEditPricing ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-8 text-center">
              <p className="text-sm font-medium text-amber-100">Select or create a course</p>
              <p className="mt-2 text-xs text-amber-200/80">
                Open <strong>Course Info</strong>, pick a course from the catalog or create one, then set sale and list prices
                here.
              </p>
              <button
                type="button"
                onClick={() => setWorkspaceTab("Course Info")}
                className="mt-4 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
              >
                Go to Course Info
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1224] p-4">
                <div>
                  <nav className="mb-2 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                    <span>Courses</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <span className="max-w-[240px] truncate font-medium text-violet-300">
                      {selectedCourse?.title?.trim() || draft.title?.trim() || "New course"}
                    </span>
                  </nav>
                  <h2 className="text-xl font-semibold text-white md:text-2xl">Pricing &amp; discounts</h2>
                  <p className="mt-1 max-w-2xl text-xs text-gray-400">
                    Set the <strong className="font-medium text-gray-300">sale price</strong> learners pay and an optional{" "}
                    <strong className="font-medium text-gray-300">list price</strong> to show savings (strike-through on the
                    site when list is higher than sale).
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingCatalog}
                  onClick={() => void saveCatalogDraft()}
                  className="rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff] disabled:opacity-50"
                >
                  {savingCatalog ? "Saving…" : "Save pricing"}
                </button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
                <div className="space-y-4 rounded-xl border border-white/10 bg-[#0d1528] p-4">
                  <h3 className="text-sm font-semibold text-white">Course prices</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] text-gray-500">Sale price (current)</span>
                      <input
                        value={draft.price}
                        onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                        placeholder="$49.00"
                        className="mt-1 w-full rounded-lg border border-emerald-500/25 bg-black/40 px-3 py-2 text-sm text-emerald-100 outline-none placeholder:text-gray-600 focus:border-emerald-500/45"
                      />
                      <p className="mt-1 text-[10px] text-gray-600">Amount charged at checkout.</p>
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-gray-500">List price (original)</span>
                      <input
                        value={draft.oldPrice}
                        onChange={(e) => setDraft((d) => ({ ...d, oldPrice: e.target.value }))}
                        placeholder="$89.00"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500/35"
                      />
                      <p className="mt-1 text-[10px] text-gray-600">
                        Optional. Must be <strong className="text-gray-500">above</strong> sale price to show a discount.
                      </p>
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Same fields as <strong className="text-gray-400">Course Info</strong> — edit here or there; one catalog
                    save updates both.
                  </p>
                </div>

                <aside className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/25 text-violet-200">
                      <Percent className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white">Discount preview</h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                        Based on sale vs list price (numbers only; currency symbols are ignored for math).
                      </p>
                    </div>
                  </div>
                  {pricingDiscountPct !== null ? (
                    <div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-500/15 px-3 py-3">
                      <p className="text-[11px] font-medium text-emerald-100">Active discount</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-50">{pricingDiscountPct}% off</p>
                      <p className="mt-2 text-[11px] text-emerald-200/85">
                        List <span className="line-through opacity-80">{draft.oldPrice || "—"}</span>
                        {" → "}
                        <span className="font-semibold">{draft.price || "—"}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg border border-white/10 bg-black/25 px-3 py-3 text-[11px] text-gray-500">
                      <p className="font-medium text-gray-400">No discount shown</p>
                      <p className="mt-1 leading-relaxed">
                        Enter a <strong className="text-gray-400">list price</strong> higher than the{" "}
                        <strong className="text-gray-400">sale price</strong>, or leave list empty for full-price display.
                      </p>
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
        </>
      ) : null}

      {workspaceTab === "Students" ? (
        <>
          {!canEditPricing ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-8 text-center">
              <p className="text-sm font-medium text-amber-100">Select or create a course</p>
              <p className="mt-2 text-xs text-amber-200/80">
                Choose a course from the catalog or create one, then view enrolled learners here.
              </p>
              <button
                type="button"
                onClick={() => setWorkspaceTab("Course Info")}
                className="mt-4 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
              >
                Go to Course Info
              </button>
            </div>
          ) : !workspaceCourseSlug ? (
            <div className="rounded-xl border border-white/10 bg-[#0b1224] px-4 py-8 text-center">
              <Users className="mx-auto h-10 w-10 text-violet-400/80" aria-hidden />
              <p className="mt-3 text-sm font-medium text-gray-200">Course URL slug required</p>
              <p className="mx-auto mt-2 max-w-md text-xs text-gray-500">
                Add a <strong className="text-gray-400">slug</strong> (or title to auto-generate one) on{" "}
                <strong className="text-gray-400">Course Info</strong> so enrollments from checkout can match this course.
              </p>
              <button
                type="button"
                onClick={() => setWorkspaceTab("Course Info")}
                className="mt-4 rounded-lg border border-white/15 bg-black/30 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5"
              >
                Edit Course Info
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#0b1224] p-4">
                <div>
                  <nav className="mb-2 flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                    <span>Courses</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <span className="max-w-[240px] truncate font-medium text-violet-300">
                      {selectedCourse?.title?.trim() || draft.title?.trim() || "Course"}
                    </span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <span className="text-gray-400">Students</span>
                  </nav>
                  <h2 className="text-xl font-semibold text-white md:text-2xl">Enrolled learners</h2>
                  <p className="mt-1 max-w-2xl text-xs text-gray-400">
                    Learners who completed checkout for this course while signed in are listed below (same browser profile).
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-gray-400">
                  <Users className="h-4 w-4 text-violet-400" aria-hidden />
                  <span>
                    <strong className="font-semibold text-gray-200">{enrollmentsDisplay.length}</strong> enrolled
                  </span>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#0d1528]">
                {enrollmentsDisplay.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-gray-500">
                    No enrollments recorded for <span className="font-mono text-gray-400">{workspaceCourseSlug}</span> yet.
                    <p className="mx-auto mt-2 max-w-lg text-xs text-gray-600">
                      Complete a purchase from checkout while logged in as a learner — the email used at sign-in is attached to
                      the enrollment.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Learner</th>
                          <th className="px-4 py-3 font-medium">Email</th>
                          <th className="px-4 py-3 font-medium">Enrolled</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {enrollmentsDisplay.map((row) => (
                          <tr key={row.learnerEmail} className="text-gray-200">
                            <td className="px-4 py-3">
                              {row.learnerName?.trim() ? (
                                <span>{row.learnerName}</span>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-violet-200/90">{row.learnerEmail}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">
                              {new Date(row.enrolledAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <p className="mt-3 text-[11px] text-gray-600">
                Demo storage: enrollments are kept in this browser&apos;s local storage. Guests who checkout without an email on
                file appear as <span className="font-mono text-gray-500">guest@demo.local</span>.
              </p>
            </>
          )}
        </>
      ) : null}

      {workspaceTab !== "Course Info" &&
      workspaceTab !== "Core Section" &&
      workspaceTab !== "Pricing" &&
      workspaceTab !== "Students" ? (
        <div className="rounded-xl border border-white/10 border-dashed bg-[#0b1224]/80 px-6 py-16 text-center">
          <p className="text-sm font-medium text-gray-300">{workspaceTab}</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-gray-500">
            Not wired yet — matches the SF Trainings tab pattern. Use <strong className="text-gray-400">Course Info</strong>,{" "}
            <strong className="text-gray-400">Pricing</strong>, or <strong className="text-gray-400">Core Section</strong>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
