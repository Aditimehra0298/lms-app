import type { ManagedCourse } from "@/lib/content-schema";

/**
 * Shared stock images that were historically forced onto every course when a real
 * cover was missing. Prefer empty / "No image" over showing these for every card.
 */
const GENERIC_PLACEHOLDERS = new Set([
  "",
  "/course-food-safety.png",
  "/course-food-safety.jpg",
  "/p1.png",
  "/p2.png",
  "/p3.png",
  "/p4.jpg",
  "/p4.png",
  "/p5.png",
  "/p6.png",
  "/p7.png",
  "/p8.png",
  "/q.png",
]);

export function isGenericCoursePlaceholder(src: string | undefined | null): boolean {
  const s = (src ?? "").trim().split("?")[0] ?? "";
  if (!s) return true;
  if (GENERIC_PLACEHOLDERS.has(s)) return true;
  if (/^\/p\d+\.(png|jpe?g|webp|gif)$/i.test(s)) return true;
  return false;
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

/** Admin-uploaded cover (not a shared category stock file). */
export function isUniqueCourseCover(src: string | undefined | null): boolean {
  const s = resolveCourseImageSrc(src);
  if (!s || isGenericCoursePlaceholder(s)) return false;
  const pathOnly = s.split("?")[0] ?? s;
  return (
    pathOnly.startsWith("/uploads/covers/") ||
    pathOnly.startsWith("/api/covers/") ||
    pathOnly.startsWith("/api/media/serve/") ||
    pathOnly.startsWith("/uploads/admin/") ||
    pathOnly.startsWith("/storage/private/") ||
    /^https?:\/\//i.test(s) ||
    s.startsWith("data:")
  );
}

export function pickUniqueCourseCover(
  ...candidates: Array<string | undefined | null>
): string {
  for (const raw of candidates) {
    if (isUniqueCourseCover(raw)) return resolveCourseImageSrc(raw);
  }
  return "";
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
 * Prefer that course's own uploaded cover — never a shared stock default.
 */
export function resolveCourseListThumbnail(course: ThumbSource | null | undefined): string {
  if (!course) return "";
  const unique = pickUniqueCourseCover(
    course.image,
    course.hero?.previewImage,
    course.hero?.backgroundImage,
    course.hero?.certificatePreviewImage,
    course.certificateConfig?.badgeImage,
    course.certificateConfig?.templateImage,
  );
  if (unique) return unique;
  // Do not fall back to /p2.png etc. — that made every course look the same on the LMS.
  return "";
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
  const coversApi = s.match(/\/api\/covers\/([^/]+)$/);
  const admin = s.match(/\/uploads\/admin\/([^/]+)$/);
  const publicCover = s.match(/\/uploads\/covers\/([^/]+)$/);
  const encoded = serve?.[1] || coversApi?.[1] || admin?.[1] || publicCover?.[1];
  if (encoded) {
    try {
      const base = decodeURIComponent(encoded);
      if (base && !base.includes("..") && !base.includes("/")) {
        out.push(`/api/covers/${encodeURIComponent(base)}`);
        out.push(`/uploads/covers/${base}`);
        out.push(`/uploads/admin/${base}`);
      }
    } catch {
      /* ignore */
    }
  }
  return [...new Set(out)];
}
