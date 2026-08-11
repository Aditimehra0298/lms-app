import type { ManagedCourse } from "@/lib/content-schema";

/**
 * Shared stock images that were historically forced onto every course when a real
 * cover was missing. Prefer empty / "No image" over showing these for every card.
 */
const GENERIC_PLACEHOLDERS = new Set([
  "",
  "/course-food-safety.png",
  "/course-food-safety.jpg",
]);

export function isGenericCoursePlaceholder(src: string | undefined | null): boolean {
  const s = (src ?? "").trim();
  if (!s) return true;
  return GENERIC_PLACEHOLDERS.has(s);
}

/** True for any LMS-usable image path (public upload, asset, or remote URL). */
export function isUsableCourseImageSrc(src: string | undefined | null): boolean {
  const s = (src ?? "").trim();
  if (!s || s.startsWith("blob:")) return false;
  return (
    s.startsWith("/") ||
    /^https?:\/\//i.test(s) ||
    s.startsWith("data:")
  );
}

/**
 * Return the course's own image URL as stored (including `/uploads/covers/...`).
 * Does not substitute a shared default — empty string means “no cover yet”.
 */
export function resolveCourseImageSrc(image: string | undefined | null): string {
  const s = (image ?? "").trim();
  if (!isUsableCourseImageSrc(s)) return "";
  return s;
}

type ThumbSource = {
  image?: string | null;
  hero?: {
    previewImage?: string | null;
    backgroundImage?: string | null;
    certificatePreviewImage?: string | null;
  } | null;
  certificateConfig?: {
    templateImage?: string | null;
    badgeImage?: string | null;
  } | null;
  slug?: string | null;
  title?: string | null;
};

/**
 * My Learning / catalog card thumbnail for one course.
 * Prefer that course's own cover, hero, or certificate art — never a shared stock default.
 */
export function resolveCourseListThumbnail(course: ThumbSource | null | undefined): string {
  if (!course) return "";
  const candidates = [
    course.image,
    course.hero?.previewImage,
    course.hero?.backgroundImage,
    course.hero?.certificatePreviewImage,
    course.certificateConfig?.badgeImage,
    course.certificateConfig?.templateImage,
  ];
  for (const raw of candidates) {
    const s = resolveCourseImageSrc(raw);
    if (!s || isGenericCoursePlaceholder(s)) continue;
    return s;
  }
  // Last resort: keep an intentional non-generic path already on the course
  return resolveCourseImageSrc(course.image);
}

export function resolveManagedCourseThumbnail(course: ManagedCourse): string {
  return resolveCourseListThumbnail(course);
}

/**
 * Extra public paths to try when a private /api/media/serve cover 401s or 404s.
 * Many older uploads were stored privately; newer ones live in /uploads/covers.
 */
export function catalogCoverFallbackUrls(stored: string): string[] {
  const s = stored.trim().split("?")[0] ?? "";
  if (!s) return [];
  const out: string[] = [s];
  const serve = s.match(/\/api\/media\/serve\/([^/]+)$/);
  const admin = s.match(/\/uploads\/admin\/([^/]+)$/);
  const encoded = serve?.[1] || admin?.[1];
  if (encoded) {
    try {
      const base = decodeURIComponent(encoded);
      if (base && !base.includes("..") && !base.includes("/")) {
        out.push(`/uploads/covers/${base}`);
        out.push(`/uploads/admin/${base}`);
      }
    } catch {
      /* ignore */
    }
  }
  return [...new Set(out)];
}
