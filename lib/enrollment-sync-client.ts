import { getLearnerEmail } from "@/lib/learner-session-client";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { readEnrollments } from "@/lib/enrollment-storage";
import { readJsonResponse, safeJsonParse } from "@/lib/safe-json";

type CourseRow = { slug: string; title: string };

function readPurchasedCoursesFromStorage(): CourseRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("sft_purchased_courses");
    const parsed = safeJsonParse(raw, [] as Array<{ slug?: string; title?: string }>);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((c) => ({
        slug: String(c.slug ?? "").trim().toLowerCase(),
        title: String(c.title ?? "").trim(),
      }))
      .filter((c) => c.slug);
  } catch {
    return [];
  }
}

/** Collect every enrollment source on this device for one learner. */
export function collectLocalEnrollmentsForSync(learnerEmail?: string): CourseRow[] {
  const email = normalizeLearnerEmail(learnerEmail ?? getLearnerEmail() ?? "");
  const bySlug = new Map<string, string>();

  for (const row of readEnrollments()) {
    const rowEmail = normalizeLearnerEmail(row.learnerEmail ?? "");
    if (email && rowEmail && rowEmail !== email) continue;
    const slug = row.courseSlug.trim().toLowerCase();
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, slug);
  }

  for (const row of readPurchasedCoursesFromStorage()) {
    const prev = bySlug.get(row.slug);
    if (!prev) bySlug.set(row.slug, row.title || row.slug);
    else if (row.title && prev === row.slug) bySlug.set(row.slug, row.title);
  }

  return Array.from(bySlug.entries()).map(([slug, title]) => ({
    slug,
    title: title || slug,
  }));
}

/** Pull enrollments from MySQL into localStorage so My Learning reflects server records. */
export async function syncEnrollmentsFromServer(
  learnerEmail?: string,
): Promise<{ ok: boolean; added?: number; message?: string }> {
  const email = normalizeLearnerEmail(learnerEmail ?? getLearnerEmail() ?? "");
  if (!email) return { ok: false, message: "Not signed in" };

  try {
    const res = await fetch(`/api/purchases`, {
      cache: "no-store",
      credentials: "include",
    });
    const data = await readJsonResponse(res, {} as {
      ok?: boolean;
      courses?: Array<{ slug?: string; title?: string }>;
      message?: string;
    });
    if (!res.ok || !data.ok) {
      return { ok: false, message: data.message ?? "Could not load enrollments" };
    }

    const serverCourses = (Array.isArray(data.courses) ? data.courses : [])
      .map((c) => ({
        slug: String(c.slug ?? "").trim().toLowerCase(),
        title: String(c.title ?? "").trim(),
      }))
      .filter((c) => c.slug);

    let tutorLedSlugs = new Set<string>();
    try {
      const tlRes = await fetch("/api/tutor-led/programs", { cache: "no-store" });
      const tlData = await readJsonResponse(tlRes, {} as { programs?: Array<{ slug?: string }> });
      if (Array.isArray(tlData.programs)) {
        tutorLedSlugs = new Set(
          tlData.programs
            .map((p) => String(p.slug ?? "").trim().toLowerCase())
            .filter(Boolean),
        );
      }
    } catch {
      /* optional */
    }

    const { mergeServerEnrollmentsIntoStorage } = await import("@/lib/learner-course-progress");
    // Always replace from MySQL — do not keep leftover browser enrollments.
    const added = mergeServerEnrollmentsIntoStorage(serverCourses, tutorLedSlugs, { replace: true });

    try {
      const { ENROLLMENTS_STORAGE_KEY, ENROLLMENTS_UPDATED_EVENT, readEnrollments } = await import(
        "@/lib/enrollment-storage"
      );
      const serverSlugSet = new Set(serverCourses.map((c) => c.slug));
      const kept = readEnrollments().filter((row) => {
        const rowEmail = normalizeLearnerEmail(row.learnerEmail ?? "");
        if (rowEmail && rowEmail !== email) return true;
        return serverSlugSet.has(String(row.courseSlug ?? "").trim().toLowerCase());
      });
      window.localStorage.setItem(ENROLLMENTS_STORAGE_KEY, JSON.stringify(kept));
      window.dispatchEvent(new Event(ENROLLMENTS_UPDATED_EVENT));
    } catch {
      /* optional legacy key */
    }

    return { ok: true, added };
  } catch {
    return { ok: false, message: "Network error loading enrollments" };
  }
}

/**
 * Local → server enrollment push is disabled (POC-C-06 payment bypass).
 * Keep the name for callers; only refresh localStorage from verified server purchases.
 */
export async function syncEnrollmentsToServer(
  learnerEmail?: string,
): Promise<{ ok: boolean; recorded?: number; skipped?: number; message?: string; added?: number }> {
  const pull = await syncEnrollmentsFromServer(learnerEmail);
  if (!pull.ok) {
    return { ok: false, message: pull.message ?? "Could not refresh enrollments" };
  }
  return { ok: true, recorded: 0, skipped: 0, added: pull.added ?? 0 };
}
