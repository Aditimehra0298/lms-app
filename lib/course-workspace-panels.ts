import type { CourseCurriculumModule, ManagedCourse, ManagedCourseSeo, ManagedCourseSettings } from "@/lib/content-schema";
import { totalCurriculumSteps } from "@/lib/course-detail-template";

export function sanitizeCourseSettings(raw: ManagedCourseSettings | undefined): ManagedCourseSettings | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: ManagedCourseSettings = {};
  if (typeof raw.showInCatalog === "boolean") out.showInCatalog = raw.showInCatalog;
  if (typeof raw.enrollmentOpen === "boolean") out.enrollmentOpen = raw.enrollmentOpen;
  if (typeof raw.allowQa === "boolean") out.allowQa = raw.allowQa;
  if (typeof raw.featured === "boolean") out.featured = raw.featured;
  const access = raw.accessLabel?.trim();
  if (access) out.accessLabel = access;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeCourseSeo(raw: ManagedCourseSeo | undefined): ManagedCourseSeo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: ManagedCourseSeo = {};
  const title = raw.metaTitle?.trim();
  const desc = raw.metaDescription?.trim();
  const kw = raw.focusKeyword?.trim();
  const og = raw.ogImage?.trim();
  if (title) out.metaTitle = title;
  if (desc) out.metaDescription = desc;
  if (kw) out.focusKeyword = kw;
  if (og) out.ogImage = og;
  if (raw.noIndex === true) out.noIndex = true;
  return Object.keys(out).length > 0 ? out : undefined;
}

export type PublishCheckItem = {
  id: string;
  label: string;
  ok: boolean;
  hint?: string;
};

export function publishChecklist(
  course: Pick<
    ManagedCourse,
    "slug" | "title" | "subtitle" | "image" | "price" | "published" | "curriculum"
  >,
  modules?: CourseCurriculumModule[],
): PublishCheckItem[] {
  const slug = course.slug?.trim();
  const title = course.title?.trim();
  const steps = modules ? totalCurriculumSteps(modules) : totalCurriculumSteps(course.curriculum ?? []);
  return [
    {
      id: "title",
      label: "Course title",
      ok: Boolean(title),
      hint: "Add a title on Course Info",
    },
    {
      id: "slug",
      label: "URL slug",
      ok: Boolean(slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)),
      hint: "Use lowercase letters, numbers, and hyphens only",
    },
    {
      id: "cover",
      label: "Cover image",
      ok: Boolean(course.image?.trim()),
      hint: "Upload or paste image URL on Course Info",
    },
    {
      id: "price",
      label: "Sale price",
      ok: Boolean(course.price?.trim()),
      hint: "Set pricing on the Pricing tab",
    },
    {
      id: "curriculum",
      label: "At least one lesson",
      ok: steps > 0,
      hint: "Add content on Core Section",
    },
    {
      id: "published",
      label: "Marked as published",
      ok: course.published === true,
      hint: "Turn on Publish below",
    },
  ];
}

export function publishReady(checks: PublishCheckItem[]): boolean {
  return checks.every((c) => c.ok);
}

export function defaultSeoForCourse(course: Pick<ManagedCourse, "title" | "subtitle" | "image">): ManagedCourseSeo {
  return {
    metaTitle: `${course.title?.trim() || "Course"} | SF Trainings`,
    metaDescription: course.subtitle?.trim() || "Professional self-paced training from SF Trainings.",
    ogImage: course.image?.trim() || undefined,
  };
}
