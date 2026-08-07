import type { ManagedCourse, ManagedCourseHeroSection } from "@/lib/content-schema";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import { isFoodSafetyMasterclassSlug } from "@/lib/food-safety-masterclass-page";
import { resolveCourseListThumbnail } from "@/lib/course-thumbnail";

export const DEFAULT_HACCP_CERTIFICATE_PREVIEW = "/certificates/haccp-certificate-preview.jpg";

export type ResolvedCourseHero = {
  backgroundImage: string;
  previewImage: string;
  previewLabel: string;
  ratingCount: string;
  studentsLabel: string;
  lastUpdated: string;
  language: string;
  captions: string;
  lectureCount: string;
  projects: string;
  certificate: string;
  access: string;
  shareable: string;
  moneyBackGuarantee: string;
  enrollButtonLabel: string;
  wishlistButtonLabel: string;
  certificatePreviewImage: string;
  certificatePreviewLabel: string;
};

function trimOrEmpty(s: string | undefined): string {
  return (s ?? "").trim();
}

function reviewCountFromLearners(learners: string): string {
  const n = parseInt(learners.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(n) || n <= 0) return "1,200";
  return Math.max(120, Math.round(n * 0.07)).toLocaleString();
}

function formatLearnersEnrolled(learners: string): string {
  const trimmed = learners.trim();
  if (/enrolled/i.test(trimmed)) return trimmed;
  return `${trimmed} students enrolled`;
}

function defaultHeroBackground(course: ManagedCourse): string {
  const own = resolveCourseListThumbnail(course);
  if (own) return own;
  if (canonicalCategorySlug(course.category) === "cyber-security") return "/p2.png";
  return course.image?.trim() || "/p2.png";
}

function defaultCertificatePreviewImage(course: ManagedCourse): string {
  const cat = canonicalCategorySlug(course.category);
  if (isFoodSafetyMasterclassSlug(course.slug) || cat === "food-safety") {
    return DEFAULT_HACCP_CERTIFICATE_PREVIEW;
  }
  return "";
}

function pickHeroString(
  hero: ManagedCourseHeroSection | undefined,
  key: keyof ManagedCourseHeroSection,
  fallback: string,
): string {
  const v = trimOrEmpty(hero?.[key]);
  return v || fallback;
}

export function resolveCourseHero(
  course: ManagedCourse,
  computedLectureCount: number,
): ResolvedCourseHero {
  const hero = course.hero;
  const ratingCountRaw = trimOrEmpty(hero?.ratingCount);
  const ratingCount = ratingCountRaw
    ? ratingCountRaw.replace(/^\(|\)$/g, "").replace(/\s*ratings?$/i, "").trim()
    : reviewCountFromLearners(course.learners);

  const lectureFallback =
    computedLectureCount > 0 ? `${computedLectureCount} Lectures` : "85 Lectures";

  return {
    backgroundImage: pickHeroString(hero, "backgroundImage", defaultHeroBackground(course)),
    previewImage: pickHeroString(hero, "previewImage", course.image || defaultHeroBackground(course)),
    previewLabel: pickHeroString(hero, "previewLabel", "Preview this course"),
    ratingCount,
    studentsLabel: pickHeroString(hero, "studentsLabel", formatLearnersEnrolled(course.learners)),
    lastUpdated: pickHeroString(hero, "lastUpdated", "05/2024"),
    language: pickHeroString(hero, "language", "English"),
    captions: pickHeroString(hero, "captions", "English [Auto]"),
    lectureCount: pickHeroString(hero, "lectureCount", lectureFallback),
    projects: pickHeroString(hero, "projects", "5 Hands-on"),
    certificate: pickHeroString(hero, "certificate", "Yes"),
    access: pickHeroString(hero, "access", "Lifetime"),
    shareable: pickHeroString(hero, "shareable", "Yes"),
    moneyBackGuarantee: pickHeroString(hero, "moneyBackGuarantee", "7 days money-back guarantee"),
    enrollButtonLabel: pickHeroString(hero, "enrollButtonLabel", "Enroll Now"),
    wishlistButtonLabel: pickHeroString(hero, "wishlistButtonLabel", "Add to Wishlist"),
    certificatePreviewImage: pickHeroString(
      hero,
      "certificatePreviewImage",
      defaultCertificatePreviewImage(course),
    ),
    certificatePreviewLabel: pickHeroString(
      hero,
      "certificatePreviewLabel",
      "Certificate of Attainment",
    ),
  };
}

export function sanitizeCourseHero(
  hero: ManagedCourseHeroSection | undefined,
): ManagedCourseHeroSection | undefined {
  if (!hero || typeof hero !== "object") return undefined;
  const keys: (keyof ManagedCourseHeroSection)[] = [
    "backgroundImage",
    "previewImage",
    "previewLabel",
    "ratingCount",
    "studentsLabel",
    "lastUpdated",
    "language",
    "captions",
    "lectureCount",
    "projects",
    "certificate",
    "access",
    "shareable",
    "moneyBackGuarantee",
    "enrollButtonLabel",
    "wishlistButtonLabel",
    "certificatePreviewImage",
    "certificatePreviewLabel",
    "aboutText",
  ];
  const out: ManagedCourseHeroSection = {};
  for (const key of keys) {
    const v = trimOrEmpty(hero[key]);
    if (v) out[key] = v;
  }
  const includes = Array.isArray(hero.courseIncludes)
    ? hero.courseIncludes.map((s) => String(s).trim()).filter(Boolean)
    : [];
  if (includes.length > 0) out.courseIncludes = includes;
  return Object.keys(out).length > 0 ? out : undefined;
}
