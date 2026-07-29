"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Coins,
  Search,
  Rocket,
  Settings,
  ClipboardList,
  FileText,
  FolderOpen,
  GripVertical,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
  Video,
  Award,
  Wrench,
} from "lucide-react";
import AdminCourseLivePreview from "@/components/admin/AdminCourseLivePreview";
import LessonTypeAddControl from "@/components/admin/LessonTypeAddControl";
import AdminContentScopeSection from "@/components/admin/AdminContentScopeSection";
import SimpleRichTextArea from "@/components/admin/SimpleRichTextArea";
import type {
  AdminContent,
  CourseCurriculumItem,
  CourseCurriculumKind,
  CourseCurriculumModule,
  CourseFinalExam,
  ManagedCategory,
  ManagedCourse,
  ManagedCourseHeroSection,
} from "@/lib/content-schema";
import { selfPacedCoverImageHint } from "@/lib/admin-image-hints";
import AdminCourseHeroFieldsEditor from "@/components/admin/AdminCourseHeroFieldsEditor";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import { sanitizeCourseHero } from "@/lib/course-hero-resolve";
import { sanitizeInstructorSection } from "@/lib/course-instructor-section";
import { sanitizeCoursePageContent } from "@/lib/course-page-content-sanitize";
import AdminSelfPacedPageContentEditor from "@/components/admin/AdminSelfPacedPageContentEditor";
import AdminOrganizationSeatPricingEditor from "@/components/admin/AdminOrganizationSeatPricingEditor";
import AdminRegionalPricingEditor from "@/components/admin/AdminRegionalPricingEditor";
import AdminCourseSettingsPanel from "@/components/admin/AdminCourseSettingsPanel";
import AdminCourseSeoPanel from "@/components/admin/AdminCourseSeoPanel";
import AdminCourseCertificatePanel from "@/components/admin/AdminCourseCertificatePanel";
import AdminImageUrlUpload from "@/components/admin/AdminImageUrlUpload";
import AdminCoursePublishPanel from "@/components/admin/AdminCoursePublishPanel";
import AdminCourseStudentsPanel from "@/components/admin/AdminCourseStudentsPanel";
import AdminCourseSubscriptionPanel from "@/components/admin/AdminCourseSubscriptionPanel";
import AdminCourseLearningToolsPanel from "@/components/admin/AdminCourseLearningToolsPanel";
import AdminBulkFoodCoursesImport from "@/components/admin/AdminBulkFoodCoursesImport";
import AdminLessonEditor from "@/components/admin/AdminLessonEditor";
import { sanitizeCertificateConfig } from "@/lib/course-certificate-config";
import { describeCertificateIdFormat } from "@/lib/certificate-ids";
import { sanitizeCourseSeo, sanitizeCourseSettings } from "@/lib/course-workspace-panels";
import AdminCurrencyBadge from "@/components/admin/AdminCurrencyBadge";
import { sanitizeRegionalPrices } from "@/lib/course-regional-pricing";
import { sanitizeOrganizationSeatPricing } from "@/lib/organization-course-pricing";
import { currencyDisplayForCountry, resolvePriceCurrency } from "@/lib/price-currency-detect";
import { getCurriculumForCourse, totalCurriculumSteps } from "@/lib/course-detail-template";

/** Shared field chrome for the self-paced course editor */
const spField =
  "mt-1.5 w-full rounded-xl border border-white/[0.07] bg-[#060b14]/90 px-3 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-gray-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";
/** Compact variant for nested rows (FAQs) — no top margin */
const spFieldSm =
  "w-full rounded-lg border border-white/[0.07] bg-[#060b14]/90 px-2.5 py-2 text-xs text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-gray-600 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";

/** Primary flow: pick course → edit details → add content → price → publish */
const PRIMARY_WORKSPACE_TABS = [
  "Catalog",
  "Course",
  "Content",
  "Learning Tools",
  "Pricing",
  "Students",
  "Certificate",
  "Publish",
] as const;
const MORE_WORKSPACE_TABS = ["Settings", "SEO", "Subscription"] as const;
type PrimaryWorkspaceTab = (typeof PRIMARY_WORKSPACE_TABS)[number];
type MoreWorkspaceTab = (typeof MORE_WORKSPACE_TABS)[number];
type CourseWorkspaceTab = PrimaryWorkspaceTab | MoreWorkspaceTab;

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
  hero: {},
});

function updateDraftHero(
  setDraft: Dispatch<SetStateAction<ManagedCourse>>,
  patch: Partial<ManagedCourseHeroSection>,
) {
  setDraft((d) => ({
    ...d,
    hero: { ...(d.hero ?? {}), ...patch },
  }));
}

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
    hero: sanitizeCourseHero(c.hero),
    instructorSection: sanitizeInstructorSection(c.instructorSection),
    regionalPrices: sanitizeRegionalPrices(c.regionalPrices),
    organizationSeatPricing: sanitizeOrganizationSeatPricing(c.organizationSeatPricing),
    settings: sanitizeCourseSettings(c.settings),
    seo: sanitizeCourseSeo(c.seo),
    certificateConfig: sanitizeCertificateConfig(c.certificateConfig),
    ...sanitizeCoursePageContent(c),
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
      return "Exam";
    default:
      return "Document";
  }
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
  pptUrl: string;
  podcastUrl: string;
  webhookUrl: string;
  resourceUrl: string;
  downloadUrl: string;
  videoUrl: string;
  timedExam: boolean;
  examDurationMinutes: number;
  examUploadUrl: string;
  examPassingScorePercent: number;
}>;

export type AdminCoursesWorkspaceMode = "full" | "lessons";

type AdminCoursesWorkspaceProps = {
  /** lessons = curriculum-only view (Admin → Lessons). */
  mode?: AdminCoursesWorkspaceMode;
};

export default function AdminCoursesWorkspace({ mode = "full" }: AdminCoursesWorkspaceProps) {
  const isLessonsMode = mode === "lessons";
  const [content, setContent] = useState<AdminContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<CourseWorkspaceTab>("Catalog");

  const [categoryFilterSlug, setCategoryFilterSlug] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManagedCourse>(emptyDraft);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingTeamImage, setUploadingTeamImage] = useState(false);
  const [uploadingHeroField, setUploadingHeroField] = useState<
    null | "backgroundImage" | "previewImage" | "certificatePreviewImage"
  >(null);

  const [modules, setModules] = useState<CourseCurriculumModule[]>([]);
  const [expandedModuleIdx, setExpandedModuleIdx] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState<LessonSelection | null>(null);
  const [finalExamDraft] = useState<CourseFinalExam>({});

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

  const putAdminContent = useCallback(async (payload: AdminContent) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const put = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!put.ok) {
        const errBody = (await put.json().catch(() => ({}))) as { error?: string };
        throw new Error(errBody.error ?? `Save failed (${put.status})`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("Save timed out. Check the dev server and try again.");
      }
      throw e;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const persistManagedCourses = async (nextCourses: ManagedCourse[]): Promise<boolean> => {
    if (!content) return false;
    setSavingCatalog(true);
    setLoadError(null);
    setSaveNotice(null);
    try {
      const payload: AdminContent = { ...content, managedCourses: nextCourses };
      await putAdminContent(payload);
      setContent(payload);
      setSaveNotice("Course saved.");
      void load();
      return true;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Save failed. Try again.");
      return false;
    } finally {
      setSavingCatalog(false);
    }
  };

  const openCreate = () => {
    const firstCat = categories[0]?.slug ?? "";
    setWorkspaceTab("Course");
    setIsCreating(true);
    setEditingSlug(null);
    setSelectedSlug("");
    setDraft({ ...emptyDraft(), category: firstCat });
  };

  const openEditTableRow = (course: ManagedCourse) => {
    setIsCreating(false);
    setEditingSlug(course.slug);
    setSelectedSlug(course.slug);
    setDraft(sanitizeManagedCourse({ ...course, learningFormat: "self-paced" }));
    setWorkspaceTab(isLessonsMode ? "Content" : "Course");
  };

  const saveCatalogDraft = async (opts?: { goToCurriculumAfter?: boolean }) => {
    if (!content) return;
    const previousSlug = editingSlug;
    const slug = slugify((draft.slug || draft.title || "").trim());
    if (!slug.trim()) {
      setLoadError("Slug or title is required.");
      return;
    }
    const others = (content.managedCourses ?? []).filter((c) => {
      if (previousSlug) return c.slug !== previousSlug;
      return c.slug !== slug;
    });
    if (others.some((c) => c.slug === slug)) {
      setLoadError("That URL slug is already used by another course. Pick a different slug.");
      return;
    }
    const normalized: ManagedCourse = sanitizeManagedCourse({
      ...draft,
      slug,
      learningFormat: "self-paced",
      faqs: (draft.faqs ?? []).filter((f) => f.q.trim() && f.a.trim()),
      finalExam: undefined,
    });
    const ok = await persistManagedCourses([...others, normalized]);
    if (!ok) return;
    setDraft(normalized);
    setIsCreating(false);
    setEditingSlug(slug);
    setSelectedSlug(slug);
    if (opts?.goToCurriculumAfter) {
      setWorkspaceTab("Content");
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

  const uploadAdminFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
    return data.url;
  };

  const uploadCover = async (file: File) => {
    setUploadingImage(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-cover", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setDraft((d) => ({ ...d, image: data.url }));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadHeroImage = async (
    field: "backgroundImage" | "previewImage" | "certificatePreviewImage",
    file: File,
  ) => {
    setUploadingHeroField(field);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-cover", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      updateDraftHero(setDraft, { [field]: data.url });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Image upload failed.");
    } finally {
      setUploadingHeroField(null);
    }
  };

  useEffect(() => {
    setExpandedModuleIdx(0);
    setSelectedLesson(null);
  }, [selectedSlug]);

  useEffect(() => {
    if (!content || !selectedSlug || isCreating) {
      setModules([]);
      setSelectedLesson(null);
      return;
    }
    const c = (content.managedCourses ?? []).find((x) => x.slug === selectedSlug && isSelfPaced(x));
    if (!c) return;
    setModules(cloneMods(getCurriculumForCourse(c.slug, c.category, c.title, c.curriculum)));
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
    // Hydrate pricing draft from the selected course, but never wipe an in-progress
    // Course-tab edit (including a pending slug rename) for the same course.
    setDraft((prev) => {
      if (editingSlug && editingSlug === selectedCourse.slug) return prev;
      if (prev.slug === selectedCourse.slug) return prev;
      return { ...selectedCourse, learningFormat: "self-paced" };
    });
    if (!editingSlug) setEditingSlug(selectedCourse.slug);
    setIsCreating(false);
  }, [workspaceTab, selectedCourse?.slug, isCreating, editingSlug]);

  const saveCurriculumOnly = async () => {
    if (!content) {
      setLoadError("Admin content is still loading. Wait a moment and try again.");
      return;
    }
    if (isCreating || !selectedCourse) {
      setLoadError("Save the course on the Course tab first, then edit content here.");
      return;
    }
    setSavingCurriculum(true);
    setLoadError(null);
    setSaveNotice(null);
    try {
      const updated: ManagedCourse = {
        ...selectedCourse,
        curriculum: cloneMods(modules),
        finalExam: undefined,
      };
      const others = (content.managedCourses ?? []).filter((c) => c.slug !== updated.slug);
      const payload: AdminContent = { ...content, managedCourses: [...others, updated] };
      await putAdminContent(payload);
      setContent(payload);
      setSaveNotice("Curriculum saved.");
      void load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Curriculum save failed.");
    } finally {
      setSavingCurriculum(false);
    }
  };

  const persistCurriculumSnapshot = async (nextModules: CourseCurriculumModule[]) => {
    if (!content || !selectedCourse || isCreating) return;
    setSavingCurriculum(true);
    setLoadError(null);
    try {
      const updated: ManagedCourse = {
        ...selectedCourse,
        curriculum: cloneMods(nextModules),
        finalExam: undefined,
      };
      const others = (content.managedCourses ?? []).filter((c) => c.slug !== updated.slug);
      const payload: AdminContent = { ...content, managedCourses: [...others, updated] };
      await putAdminContent(payload);
      setContent(payload);
      setSaveNotice("Curriculum saved (exam file linked).");
      void load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Curriculum save failed.");
    } finally {
      setSavingCurriculum(false);
    }
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
          { label: "Module examination", kind: "exam" },
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

  const moveModule = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= modules.length) return;
    setModules((prev) => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setExpandedModuleIdx((prev) => {
      if (prev === idx) return target;
      if (prev === target) return idx;
      return prev;
    });
    setSelectedLesson((prev) => {
      if (!prev) return prev;
      if (prev.mi === idx) return { ...prev, mi: target };
      if (prev.mi === target) return { ...prev, mi: idx };
      return prev;
    });
  };

  const updateModuleTitle = (idx: number, title: string) => {
    setModules((prev) => prev.map((m, i) => (i === idx ? { ...m, title } : m)));
  };

  const updateRow = (sel: LessonSelection, patch: RowPatch) => {
    let nextModules = modules;
    setModules((prev) => {
      nextModules = patchLessonRow(prev, sel, patch);
      return nextModules;
    });
    if (patch.examUploadUrl?.trim()) {
      void persistCurriculumSnapshot(nextModules);
    }
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
            label: "Module examination",
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
            label: "Sub-module examination",
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

  const moveRow = (sel: LessonSelection, direction: -1 | 1) => {
    const target = sel.ri + direction;
    if (target < 0) return;
    setModules((prev) =>
      prev.map((m, mi) => {
        if (mi !== sel.mi) return m;
        if (sel.scope === "module") {
          if (target >= m.items.length) return m;
          const items = [...m.items];
          const [moved] = items.splice(sel.ri, 1);
          items.splice(target, 0, moved);
          return { ...m, items };
        }
        const subMods = [...(m.subModules ?? [])];
        const sm = subMods[sel.si];
        if (!sm || target >= sm.items.length) return m;
        const items = [...sm.items];
        const [moved] = items.splice(sel.ri, 1);
        items.splice(target, 0, moved);
        subMods[sel.si] = { ...sm, items };
        return { ...m, subModules: subMods };
      }),
    );
    setSelectedLesson((prev) => {
      if (!prev || prev.mi !== sel.mi || prev.scope !== sel.scope) return prev;
      if (sel.scope === "module" && prev.scope === "module") {
        if (prev.ri === sel.ri) return { ...prev, ri: target };
        if (prev.ri === target) return { ...prev, ri: sel.ri };
      }
      if (sel.scope === "sub" && prev.scope === "sub" && prev.si === sel.si) {
        if (prev.ri === sel.ri) return { ...prev, ri: target };
        if (prev.ri === target) return { ...prev, ri: sel.ri };
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

  const moveSubModule = (mi: number, si: number, direction: -1 | 1) => {
    const target = si + direction;
    if (target < 0) return;
    setModules((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const subMods = [...(m.subModules ?? [])];
        if (target >= subMods.length) return m;
        const [moved] = subMods.splice(si, 1);
        subMods.splice(target, 0, moved);
        return { ...m, subModules: subMods };
      }),
    );
    setSelectedLesson((prev) => {
      if (!prev || prev.mi !== mi || prev.scope !== "sub") return prev;
      if (prev.si === si) return { ...prev, si: target };
      if (prev.si === target) return { ...prev, si };
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

  const steps = totalCurriculumSteps(modules);
  const catLabel =
    categories.find((c) => canonicalCategorySlug(c.slug) === canonicalCategorySlug(selectedCourse?.category ?? ""))
      ?.title ?? selectedCourse?.category ?? "—";

  const overviewStats = useMemo(() => {
    let lessons = 0;
    let quizzes = 0;
    let readings = 0;
    let explicitMinutes = 0;
    let estimatedMinutes = 0;
    const countItem = (it: CourseCurriculumItem) => {
      lessons += 1;
      if (it.kind === "exam") quizzes++;
      else if (it.kind === "reading") readings++;
      const minutes = typeof it.lessonDurationMinutes === "number" ? Math.max(0, Math.round(it.lessonDurationMinutes)) : 0;
      if (minutes > 0) explicitMinutes += minutes;
      else if (it.kind === "video") estimatedMinutes += 15;
    };
    for (const m of modules) {
      for (const it of m.items) countItem(it);
      for (const sm of m.subModules ?? []) {
        for (const it of sm.items) countItem(it);
      }
    }
    const estMinutes = Math.max(explicitMinutes + estimatedMinutes, lessons > 0 ? 15 : 0);
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
  const previewSlug = useMemo(() => {
    const fromDraft = slugify(draft.slug || draft.title || "");
    const raw =
      fromDraft ||
      editingSlug ||
      selectedSlug ||
      (isCreating ? slugify(draft.title || "") : "");
    const s = raw.trim();
    return s.length >= 2 ? s : null;
  }, [editingSlug, selectedSlug, isCreating, draft.slug, draft.title]);
  const canEditCurriculum = !!selectedSlug && !isCreating && !!selectedCourse;
  const canEditPricing = isCreating || !!selectedCourse;
  const hidePreviewForWorkspaceTab = workspaceTab === "Students";
  const visiblePrimaryTabs = isLessonsMode
    ? (["Catalog", "Content"] as const satisfies readonly CourseWorkspaceTab[])
    : PRIMARY_WORKSPACE_TABS;

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
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 ${isLessonsMode ? "bg-sky-500/20 ring-sky-400/30" : "bg-violet-500/20 ring-violet-400/30"}`}
              >
                {isLessonsMode ? (
                  <Video className="h-6 w-6 text-sky-200" aria-hidden />
                ) : (
                  <BookOpen className="h-6 w-6 text-violet-200" aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isLessonsMode ? "text-sky-300/90" : "text-violet-300/90"}`}
                >
                  {isLessonsMode ? "Self-paced lessons" : "Self-paced catalog"}
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {isLessonsMode ? "Lesson builder" : "Course workspace"}
                </h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  {isLessonsMode ? (
                    <>
                      Pick a course, then add <strong className="text-gray-300">modules</strong>, videos, PDFs, and
                      quizzes. Learners see this under the course Content tab.
                    </>
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {(["Catalog", "Course", "Content", "Learning Tools", "Publish"] as const).map((step, i) => (
                        <span key={step} className="inline-flex items-center gap-2">
                          {i > 0 ? <span className="text-gray-600">→</span> : null}
                          <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-0.5 text-[10px] font-medium text-gray-300">
                            {step}
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {loadError ? (
          <p className="mx-4 mb-4 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-100 sm:mx-6">
            {loadError}
          </p>
        ) : null}
        {saveNotice ? (
          <p className="mx-4 mb-4 mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100 sm:mx-6">
            {saveNotice}
          </p>
        ) : null}

        <div className="px-2 pb-2 pt-3 sm:px-3">
          <div className="flex flex-nowrap items-center gap-1 overflow-x-auto rounded-xl bg-black/35 p-1 ring-1 ring-white/[0.04]">
            {visiblePrimaryTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setWorkspaceTab(tab)}
                className={`relative rounded-lg px-3 py-2.5 text-[11px] font-semibold transition sm:px-4 ${
                  workspaceTab === tab
                    ? isLessonsMode
                      ? "bg-sky-600 text-white shadow-[0_4px_20px_rgba(14,165,233,0.35)]"
                      : "bg-violet-600 text-white shadow-[0_4px_20px_rgba(111,85,255,0.35)]"
                    : "text-gray-500 hover:bg-white/[0.04] hover:text-gray-200"
                }`}
              >
                {tab === "Content" && isLessonsMode ? "Lessons" : tab === "Pricing" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {tab}
                  </span>
                ) : tab === "Publish" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Rocket className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {tab}
                  </span>
                ) : tab === "Certificate" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {tab}
                  </span>
                ) : tab === "Learning Tools" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Tools
                  </span>
                ) : (
                  tab
                )}
              </button>
            ))}
            {!isLessonsMode ? (
            <label className="ml-auto flex min-w-[7.5rem] items-center gap-1.5 rounded-lg px-2 py-1">
              <span className="sr-only">More options</span>
              <select
                value={(MORE_WORKSPACE_TABS as readonly string[]).includes(workspaceTab) ? workspaceTab : ""}
                onChange={(e) => {
                  const v = e.target.value as MoreWorkspaceTab;
                  if (v) setWorkspaceTab(v);
                }}
                className={`cursor-pointer rounded-lg border bg-black/50 px-2.5 py-2 text-[11px] font-semibold outline-none transition ${
                  (MORE_WORKSPACE_TABS as readonly string[]).includes(workspaceTab)
                    ? "border-violet-500/50 text-violet-100 ring-2 ring-violet-500/25"
                    : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
                }`}
              >
                <option value="">More…</option>
                {MORE_WORKSPACE_TABS.map((tab) => (
                  <option key={tab} value={tab}>
                    {tab}
                  </option>
                ))}
              </select>
            </label>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-6">

      {workspaceTab === "Catalog" ? (
        <>
          {!isLessonsMode ? <AdminBulkFoodCoursesImport onSaved={() => void load()} /> : null}
          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1224] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-black/20 px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/25">
                  <FolderOpen className="h-5 w-5 text-emerald-300" aria-hidden />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white sm:text-base">Catalog</h2>
                  <p className="text-[11px] text-gray-500">
                    {isLessonsMode
                      ? "Select a course to open its lesson builder."
                      : "Select a row to edit, or create a new self-paced course."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-medium text-gray-300">
                  {filteredTableCourses.length} shown
                </span>
                {!isLessonsMode ? (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-indigo-500"
                  >
                    <Plus className="h-4 w-4" /> New course
                  </button>
                ) : null}
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
                    {(isLessonsMode
                      ? ["Course", "Slug", "Lessons", "Status", "Actions"]
                      : ["Course", "Slug", "Category", "Level", "Price", "Status", "Actions"]
                    ).map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTableCourses.length === 0 ? (
                    <tr>
                      <td colSpan={isLessonsMode ? 5 : 7} className="px-4 py-14 text-center">
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
                              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50 shadow-inner">
                                <Image src={c.image} alt="" fill unoptimized className="object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1 pt-3">
                                  <p className="truncate text-[10px] font-bold tabular-nums text-amber-300">
                                    {c.price?.trim() || "Set in Pricing"}
                                  </p>
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white">{c.title}</p>
                                <p className="truncate text-[11px] text-gray-500">{c.subtitle}</p>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-violet-200/90">{c.slug}</td>
                          {isLessonsMode ? (
                            <td className="px-4 py-3 tabular-nums text-gray-300">
                              {totalCurriculumSteps(c.curriculum ?? [])}
                            </td>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-gray-300">{catTitle}</td>
                              <td className="px-4 py-3">
                                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-gray-300">
                                  {c.level}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <AdminCurrencyBadge
                                      currency={resolvePriceCurrency(c.price)}
                                      showCode={false}
                                    />
                                    <span className="font-semibold tabular-nums text-amber-300">{c.price}</span>
                                  </div>
                                  {(c.regionalPrices?.length ?? 0) > 0 ? (
                                    <span className="text-[10px] text-gray-500">
                                      +{c.regionalPrices!.length} regional (
                                      {c.regionalPrices!
                                        .slice(0, 3)
                                        .map((r) => currencyDisplayForCountry(r.countryCode).code)
                                        .join(", ")}
                                      {c.regionalPrices!.length > 3 ? "…" : ""})
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                            </>
                          )}
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
                                title={isLessonsMode ? "Edit lessons" : "Edit details"}
                                onClick={() => openEditTableRow(c)}
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-violet-500/20 hover:text-violet-100"
                              >
                                {isLessonsMode ? <Video className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                              </button>
                              {!isLessonsMode ? (
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={() => void deleteCourse(c.slug)}
                                  className="rounded-lg p-2 text-gray-500 transition hover:bg-red-500/15 hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null}
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
        </>
      ) : null}

      {workspaceTab === "Course" ? (
        <>
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
                      <span className="text-slate-300">Same for most courses</span> = shared labels.{" "}
                      <span className="text-violet-200">This course only</span> = title, about, FAQs, modules.
                      Save here, then use <strong className="text-gray-300">Content</strong> for lessons. URL:{" "}
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-violet-200">
                        /courses/{slugify(draft.slug || draft.title || "slug") || "slug"}
                      </code>
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-5 p-4 sm:p-6">
              <AdminContentScopeSection
                scope="course"
                title="Course card & basics"
                description="Title, cover, instructor, and catalog listing — unique for every course."
              >
              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-gray-500">URL slug</span>
                  <input
                    value={draft.slug}
                    onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                    onBlur={() =>
                      setDraft((d) => {
                        const next = slugify((d.slug || d.title || "").trim());
                        return next && next !== d.slug ? { ...d, slug: next } : d;
                      })
                    }
                    className={`${spField} font-mono text-xs`}
                    placeholder="my-course-slug"
                  />
                  <p className="mt-1 text-[10px] text-gray-500">
                    Public URL:{" "}
                    <code className="font-mono text-violet-200/90">
                      /courses/{slugify(draft.slug || draft.title || "slug") || "slug"}
                    </code>
                    {editingSlug && editingSlug !== slugify(draft.slug || draft.title) ? (
                      <span className="mt-1 block text-amber-200/90">
                        Will rename from <code className="font-mono">{editingSlug}</code> when you click Save
                        course.
                      </span>
                    ) : null}
                  </p>
                </label>
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
              </div>
              </AdminContentScopeSection>

              <AdminContentScopeSection
                scope="course"
                title="Hero & enroll card"
                description="Top of the public course page before checkout — images, stats, and about text."
              >
                <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                <div className="md:col-span-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3">
                  <h3 className="text-sm font-semibold text-amber-100">Hero fields</h3>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    Public page at <code className="font-mono text-violet-200/90">/courses/[slug]</code> — expand sections below.
                  </p>
                  <div className="mt-3">
                    <AdminCourseHeroFieldsEditor
                      draft={draft}
                      setDraft={setDraft}
                      onUploadHeroImage={uploadHeroImage}
                      uploadingHeroField={uploadingHeroField}
                      fieldClass={spField}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-gray-600">
                    Duration & level come from the Course tab; star rating & price from fields above.
                  </p>
                </div>

                <div className="md:col-span-2 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-4">
                  <h3 className="text-sm font-semibold text-violet-100">Instructor tab (landing page)</h3>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Shown on <strong className="text-gray-300">Instructor</strong> tab — expert team image, pillars,
                    expertise grid, and sidebar instructor cards.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="block md:col-span-2">
                      <span className="text-[11px] text-gray-500">Headline</span>
                      <input
                        value={draft.instructorSection?.headline ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            instructorSection: { ...d.instructorSection, headline: e.target.value },
                          }))
                        }
                        className={spField}
                        placeholder="Course developed by industry experts"
                      />
                    </label>
                    <AdminImageUrlUpload
                      label="Team image (Instructor tab)"
                      value={draft.instructorSection?.teamImage ?? ""}
                      onChange={(url) =>
                        setDraft((d) => ({
                          ...d,
                          instructorSection: { ...d.instructorSection, teamImage: url },
                        }))
                      }
                      onUploadFile={async (file) => {
                        setUploadingTeamImage(true);
                        setLoadError(null);
                        try {
                          const fd = new FormData();
                          fd.append("file", file);
                          const res = await fetch("/api/admin/upload-cover", { method: "POST", body: fd });
                          const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
                          if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
                          setDraft((d) => ({
                            ...d,
                            instructorSection: { ...d.instructorSection, teamImage: data.url },
                          }));
                        } catch (e) {
                          setLoadError(e instanceof Error ? e.message : "Team image upload failed.");
                        } finally {
                          setUploadingTeamImage(false);
                        }
                      }}
                      uploading={uploadingTeamImage}
                      placeholder="/sft-expert-team.png"
                      hint="Shown on the Instructor tab (~4:3). Recommended 1200×900 px. JPEG, PNG, WebP, or GIF · max 6 MB."
                      obscureValue
                      className="block md:col-span-2"
                    />
                    <label className="block md:col-span-2">
                      <span className="text-[11px] text-gray-500">Intro paragraphs (one per line)</span>
                      <textarea
                        value={(draft.instructorSection?.introParagraphs ?? []).join("\n\n")}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            instructorSection: {
                              ...d.instructorSection,
                              introParagraphs: e.target.value
                                .split(/\n\n+/)
                                .map((s) => s.trim())
                                .filter(Boolean),
                            },
                          }))
                        }
                        rows={5}
                        className={`${spField} min-h-[6rem] resize-y text-[12px]`}
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-[11px] text-gray-500">
                        Sidebar instructors — one per line: Name | Role
                      </span>
                      <textarea
                        value={(draft.instructorSection?.sidebarInstructors ?? [])
                          .map((s) => `${s.name} | ${s.role}`)
                          .join("\n")}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            instructorSection: {
                              ...d.instructorSection,
                              sidebarInstructors: e.target.value
                                .split("\n")
                                .map((line) => line.trim())
                                .filter(Boolean)
                                .map((line) => {
                                  const [name, role] = line.split("|").map((x) => x.trim());
                                  return { name: name || line, role: role || "" };
                                }),
                            },
                          }))
                        }
                        rows={5}
                        className={`${spField} min-h-[6rem] resize-y font-mono text-[12px]`}
                        placeholder="HACCP Specialist | Risk assessment & CCPs"
                      />
                    </label>
                  </div>
                </div>
                </div>
              </AdminContentScopeSection>

              <AdminSelfPacedPageContentEditor
                draft={draft}
                setDraft={setDraft}
                fieldClass={spField}
                textareaClass={`${spField} min-h-[5rem] resize-y text-[12px] leading-relaxed`}
              />

              <AdminContentScopeSection
                scope="course"
                title="Instructor bio, highlights & FAQs"
                description="Trainer profile, bullet highlights, and FAQ pairs shown on the public course page."
              >
              <div className="grid gap-4 md:grid-cols-2 md:gap-5">
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
                <div className="md:col-span-2">
                  <span className="mb-1.5 block text-[11px] text-gray-500">Instructor bio (public page)</span>
                  <SimpleRichTextArea
                    value={draft.trainerBio ?? ""}
                    onChange={(v) => setDraft((d) => ({ ...d, trainerBio: v }))}
                    rows={4}
                    label="Bio"
                    placeholder="Short bio shown on /courses/[slug]…"
                  />
                </div>
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
                        <SimpleRichTextArea
                          value={faq.a}
                          onChange={(v) =>
                            setDraft((d) => {
                              const next = [...(d.faqs ?? [])];
                              next[i] = { ...next[i], a: v };
                              return { ...d, faqs: next };
                            })
                          }
                          rows={2}
                          label="Answer"
                          placeholder="Answer text for learners…"
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
                <p className="md:col-span-2 text-[10px] text-gray-600">
                  Set country-wise prices in the{" "}
                  <button
                    type="button"
                    onClick={() => setWorkspaceTab("Pricing")}
                    className="font-medium text-violet-300 underline decoration-violet-500/40 hover:text-violet-200"
                  >
                    Pricing
                  </button>{" "}
                  tab.
                </p>
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-gray-500">Cover image URL</span>
                  <div className="relative">
                    <input
                      type="password"
                      value={draft.image}
                      onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))}
                      className={`${spField} pr-20 font-mono text-[12px]`}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = (e.currentTarget
                          .parentElement?.querySelector("input") ??
                          null) as HTMLInputElement | null;
                        if (!input) return;
                        input.type = input.type === "password" ? "text" : "password";
                        e.currentTarget.textContent = input.type === "password" ? "Show" : "Hide";
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-semibold text-gray-300 hover:bg-black/55"
                    >
                      Show
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-gray-600">{selfPacedCoverImageHint}</p>
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
                <p className="md:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-[11px] text-gray-400">
                  <span className="font-semibold text-emerald-200/90">Publish status:</span>{" "}
                  {draft.published ? (
                    <span className="text-emerald-300">Live</span>
                  ) : (
                    <span className="text-amber-300">Draft (hidden)</span>
                  )}
                  {" — "}
                  <button
                    type="button"
                    onClick={() => setWorkspaceTab("Publish")}
                    className="font-medium text-violet-300 underline decoration-violet-500/40 hover:text-violet-200"
                  >
                    Open Publish tab
                  </button>{" "}
                  for checklist and go-live toggle.
                </p>
              </div>
              </AdminContentScopeSection>
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
                  Save &amp; go to Content
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingSlug(null);
                    setWorkspaceTab("Catalog");
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
            <div className="rounded-xl border border-dashed border-white/15 bg-[#0b1224]/60 px-4 py-10 text-center">
              <p className="text-sm font-medium text-gray-300">No course open for editing</p>
              <p className="mt-2 text-xs text-gray-500">
                Pick a course from the catalog or create a new one — the editor opens on this tab.
              </p>
              <button
                type="button"
                onClick={() => setWorkspaceTab("Catalog")}
                className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Go to Catalog
              </button>
            </div>
          )}
        </>
      ) : null}

      {workspaceTab === "Content" ? (
        <>
          {!canEditCurriculum ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-8 text-center">
              <p className="text-sm font-medium text-amber-100">Choose a saved course first</p>
              <p className="mt-2 text-xs text-amber-200/80">
                {isLessonsMode ? (
                  <>
                    Open the <strong>Catalog</strong> tab and select a course to build its modules and lessons.
                  </>
                ) : (
                  <>
                    Open the <strong>Course</strong> tab, add title and cover image, then click{" "}
                    <strong>Save course</strong>. Then return here to build modules.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setWorkspaceTab(isLessonsMode ? "Catalog" : "Course")}
                className="mt-4 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
              >
                {isLessonsMode ? "Go to Catalog" : "Go to Course"}
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
                  <h2 className="text-xl font-semibold text-white md:text-2xl">
                    {isLessonsMode ? "Lesson builder" : "Course content"}
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {catLabel} · Build <strong className="font-medium text-gray-300">modules</strong>, add video / document /
                    exam lessons. Course learning tools (E-Workbook, Transcript, PPT, Podcast, Additional Resources) are set once
                    for the whole course on the Course tab.
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
                    className="inline-flex items-center gap-1 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(111,85,255,0.35)] hover:bg-[#7d63ff] disabled:opacity-50"
                  >
                    {savingCurriculum ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save curriculum
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
                          <div className="flex w-full items-center gap-2 px-2 py-2 text-xs">
                            <button
                              type="button"
                              onClick={() => setExpandedModuleIdx(mi)}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
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
                            <span className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveModule(mi, -1)}
                                title="Move module up"
                                className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-200"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveModule(mi, 1)}
                                title="Move module down"
                                className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-200"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          </div>
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
                                            onClick={() => moveRow(rowSel, -1)}
                                            className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-200"
                                            title="Move lesson up"
                                          >
                                            <ChevronUp className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => moveRow(rowSel, 1)}
                                            className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-200"
                                            title="Move lesson down"
                                          >
                                            <ChevronDown className="h-3.5 w-3.5" />
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
                                  <div className="mt-1 flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => moveSubModule(mi, si, -1)}
                                      title="Move sub-module up"
                                      className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-200"
                                    >
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveSubModule(mi, si, 1)}
                                      title="Move sub-module down"
                                      className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-200"
                                    >
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
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
                                              onClick={() => moveRow(rowSel, -1)}
                                              className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-200"
                                              title="Move lesson up"
                                            >
                                              <ChevronUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => moveRow(rowSel, 1)}
                                              className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-200"
                                              title="Move lesson down"
                                            >
                                              <ChevronDown className="h-3.5 w-3.5" />
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
                                  Add lesson to this module
                                </p>
                                <LessonTypeAddControl
                                  onAdd={(kind, title) => appendLessonOfKindToModule(mi, kind, title)}
                                />
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
                    <AdminLessonEditor
                      lesson={getLessonFromModules(modules, selectedLesson)!}
                      lessonIndexLabel={lessonIndexLabel(selectedLesson)}
                      onPatch={(patch) => updateRow(selectedLesson, patch)}
                      onSave={() => void saveCurriculumOnly()}
                      saving={savingCurriculum}
                    />
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
            </>
          )}
        </>
      ) : null}

      {workspaceTab === "Learning Tools" ? (
        <AdminCourseLearningToolsPanel
          draft={draft}
          setDraft={setDraft}
          canEdit={canEditPricing}
          saving={savingCatalog}
          onSave={() => void saveCatalogDraft()}
          onGoCourseInfo={() => setWorkspaceTab("Course")}
        />
      ) : null}

      {workspaceTab === "Pricing" ? (
        <>
          {!canEditPricing ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-8 text-center">
              <p className="text-sm font-medium text-amber-100">Select or create a course</p>
              <p className="mt-2 text-xs text-amber-200/80">
                Open the <strong>Course</strong> tab, pick a course from the catalog or create one, then set sale and list prices
                here.
              </p>
              <button
                type="button"
                onClick={() => setWorkspaceTab("Course")}
                className="mt-4 rounded-lg bg-[#6f55ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7d63ff]"
              >
                Go to Course
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
                  <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-white md:text-2xl">
                    <Coins className="h-6 w-6 text-amber-300" aria-hidden />
                    Pricing by country &amp; currency
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs text-gray-400">
                    Set prices in Indian Rupee (₹), US Dollar ($), Euro (€), British Pound (£), and other currencies per
                    country. Currency icons show which symbol each row uses.
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

              <div className="mt-4">
                <AdminRegionalPricingEditor draft={draft} setDraft={setDraft} />
                <AdminOrganizationSeatPricingEditor draft={draft} setDraft={setDraft} />
              </div>
            </>
          )}
        </>
      ) : null}

      {workspaceTab === "Certificate" ? (
        <AdminCourseCertificatePanel
          draft={draft}
          setDraft={setDraft}
          canEdit={canEditPricing}
          saving={savingCatalog}
          onSave={() => void saveCatalogDraft()}
          onGoCourseInfo={() => setWorkspaceTab("Course")}
          onGoContent={() => setWorkspaceTab("Content")}
          finalExam={finalExamDraft}
        />
      ) : null}

      {workspaceTab === "Settings" ? (
        <AdminCourseSettingsPanel
          draft={draft}
          setDraft={setDraft}
          canEdit={canEditPricing}
          saving={savingCatalog}
          onSave={() => void saveCatalogDraft()}
          onGoCourseInfo={() => setWorkspaceTab("Course")}
        />
      ) : null}

      {workspaceTab === "SEO" ? (
        <AdminCourseSeoPanel
          draft={draft}
          setDraft={setDraft}
          canEdit={canEditPricing}
          saving={savingCatalog}
          onSave={() => void saveCatalogDraft()}
          onGoCourseInfo={() => setWorkspaceTab("Course")}
        />
      ) : null}

      {workspaceTab === "Students" ? (
        <AdminCourseStudentsPanel
          courseTitle={selectedCourse?.title?.trim() || draft.title?.trim() || ""}
          workspaceCourseSlug={workspaceCourseSlug}
          canEdit={canEditPricing}
          onGoCourseInfo={() => setWorkspaceTab("Course")}
        />
      ) : null}

      {workspaceTab === "Subscription" ? (
        <AdminCourseSubscriptionPanel
          draft={draft}
          canEdit={canEditPricing}
          onGoCourseInfo={() => setWorkspaceTab("Course")}
        />
      ) : null}

      {workspaceTab === "Publish" ? (
        <AdminCoursePublishPanel
          draft={draft}
          setDraft={setDraft}
          modules={modules}
          canEdit={canEditPricing}
          saving={savingCatalog}
          onSave={() => void saveCatalogDraft()}
          onGoCourseInfo={() => setWorkspaceTab("Course")}
        />
      ) : null}

        </div>
        {previewSlug && !hidePreviewForWorkspaceTab ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-violet-200">Course Preview</h3>
            <AdminCourseLivePreview
              slug={previewSlug}
              title={draft.title?.trim() || selectedCourse?.title}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
