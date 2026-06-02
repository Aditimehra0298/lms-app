import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CourseReviewsStoreFile, StoredCourseReview } from "@/lib/course-reviews-types";

const storePath = path.join(process.cwd(), "data", "course-reviews.json");

async function ensureStoreFile(): Promise<void> {
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    const empty: CourseReviewsStoreFile = { reviews: [] };
    await fs.writeFile(storePath, JSON.stringify(empty, null, 2), "utf8");
  }
}

export async function readCourseReviewsStore(): Promise<CourseReviewsStoreFile> {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");
  try {
    const parsed = JSON.parse(raw) as CourseReviewsStoreFile;
    return { reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [] };
  } catch {
    return { reviews: [] };
  }
}

async function writeStore(data: CourseReviewsStoreFile): Promise<void> {
  await ensureStoreFile();
  await fs.writeFile(storePath, JSON.stringify(data, null, 2), "utf8");
}

export async function listReviewsForCourse(
  courseSlug: string,
  viewerEmail?: string | null,
): Promise<StoredCourseReview[]> {
  const store = await readCourseReviewsStore();
  const email = viewerEmail?.trim().toLowerCase() || "";
  return store.reviews
    .filter((r) => {
      if (r.courseSlug !== courseSlug) return false;
      if (r.status === "approved") return true;
      return email.length > 0 && r.authorEmail.toLowerCase() === email;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createCourseReview(input: {
  courseSlug: string;
  authorEmail: string;
  authorName: string;
  rating: number;
  body: string;
}): Promise<StoredCourseReview> {
  const store = await readCourseReviewsStore();
  const row: StoredCourseReview = {
    id: randomUUID(),
    courseSlug: input.courseSlug,
    authorEmail: input.authorEmail.trim().toLowerCase(),
    authorName: input.authorName.trim() || "Learner",
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    body: input.body.trim(),
    status: "approved",
    helpful: 0,
    createdAt: new Date().toISOString(),
  };
  store.reviews.unshift(row);
  await writeStore(store);
  return row;
}

export async function listRecentReviewsAcrossCourses(
  courseSlugs: string[],
  limit = 20,
): Promise<StoredCourseReview[]> {
  const set = new Set(courseSlugs.map((s) => s.trim()).filter(Boolean));
  const store = await readCourseReviewsStore();
  return store.reviews
    .filter((r) => set.has(r.courseSlug) && r.status === "approved")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
