import { promises as fs } from "node:fs";
import path from "node:path";
import type { ManagedCourse } from "@/lib/content-schema";
import { applyStandardCoursePricing } from "@/lib/standard-course-pricing";
import { clearDeletedCourseSlugs } from "@/lib/server/deleted-course-tombstones";

export const CEH_SLUG = "courses-certfied-ethical-hacking-and-penitration-testing";

function isCehSlug(slug: string | undefined | null): boolean {
  return String(slug ?? "").trim() === CEH_SLUG;
}

function overlayToCourse(overlay: Record<string, unknown>, live?: ManagedCourse | null): ManagedCourse {
  const landing = (overlay.course && typeof overlay.course === "object" ? overlay.course : {}) as Partial<ManagedCourse>;
  const curriculum = Array.isArray(overlay.curriculum)
    ? overlay.curriculum
    : live?.curriculum;
  const base: ManagedCourse = {
    slug: CEH_SLUG,
    title: landing.title?.trim() || live?.title || "Certified Ethical Hacking and Penetration Testing",
    subtitle: landing.subtitle ?? live?.subtitle ?? "",
    category: "cyber-security",
    level: landing.level || live?.level || "Intermediate",
    duration: landing.duration || live?.duration || "22h 51m",
    rating: live?.rating || "4.6",
    learners: live?.learners || "0",
    price: live?.price || landing.price || "$49.00",
    oldPrice: live?.oldPrice || landing.oldPrice || "$79.00",
    image: landing.image || live?.image || "/uploads/covers/ceh-ethical-hacking-poster.png",
    published: true,
    learningFormat: "self-paced",
    instructorName: landing.instructorName || live?.instructorName || "SFT Expert Team",
    pageBadge: landing.pageBadge || live?.pageBadge || "BESTSELLER",
    highlights: landing.highlights ?? live?.highlights ?? [],
    faqs: landing.faqs ?? live?.faqs ?? [],
    trainerRole: landing.trainerRole || live?.trainerRole,
    trainerExperience: landing.trainerExperience || live?.trainerExperience,
    trainerBio: landing.trainerBio || live?.trainerBio,
    trainerCertifications: landing.trainerCertifications ?? live?.trainerCertifications,
    trainerWorkedWith: landing.trainerWorkedWith ?? live?.trainerWorkedWith,
    instructorSection: landing.instructorSection ?? live?.instructorSection,
    hero: landing.hero ?? live?.hero,
    pageContent: landing.pageContent ?? live?.pageContent,
    seo: landing.seo ?? live?.seo,
    regionalPrices: landing.regionalPrices ?? live?.regionalPrices,
    basePrice: landing.basePrice || live?.basePrice,
    curriculum: (curriculum as ManagedCourse["curriculum"]) ?? live?.curriculum,
    certificateConfig: live?.certificateConfig ?? landing.certificateConfig,
    courseIdentificationNumber: live?.courseIdentificationNumber,
  };
  return applyStandardCoursePricing({
    ...live,
    ...base,
    slug: CEH_SLUG,
    category: "cyber-security",
    published: true,
    learningFormat: "self-paced",
    curriculum: live?.curriculum?.length ? live.curriculum : base.curriculum,
  });
}

async function readJsonIfExists(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Put CEH back if a previous delete/tombstone removed it from the catalog. */
export async function ensureCehCourse(courses: ManagedCourse[]): Promise<{
  courses: ManagedCourse[];
  added: boolean;
}> {
  await clearDeletedCourseSlugs([CEH_SLUG]);
  const list = Array.isArray(courses) ? [...courses] : [];
  const idx = list.findIndex((c) => isCehSlug(c.slug));
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      slug: CEH_SLUG,
      title: list[idx].title?.trim() || "Certified Ethical Hacking and Penetration Testing",
      category: list[idx].category?.trim() || "cyber-security",
      published: true,
      learningFormat: list[idx].learningFormat || "self-paced",
    };
    return { courses: list, added: false };
  }

  const root = path.join(process.cwd(), "data");
  const overlay = (await readJsonIfExists(path.join(root, "ceh-landing-overlay.json"))) as
    | Record<string, unknown>
    | null;
  const liveRaw = await readJsonIfExists(path.join(root, "ceh-live-course.json"));
  const live =
    liveRaw && typeof liveRaw === "object" ? (liveRaw as ManagedCourse) : null;
  if (!overlay && !live) {
    return { courses: list, added: false };
  }
  const restored = overlayToCourse(overlay ?? {}, live);
  return { courses: [...list, restored], added: true };
}

export function withoutCehDeletedSlugs(slugs: Iterable<string> | undefined): string[] {
  return [...new Set([...(slugs ?? [])].map((s) => s.trim()).filter((s) => s && s !== CEH_SLUG))];
}
