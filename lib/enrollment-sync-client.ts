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

/** Push all local enrollments for this learner to MySQL (admin Students tab source of truth). */
export async function syncEnrollmentsToServer(
  learnerEmail?: string,
): Promise<{ ok: boolean; recorded?: number; skipped?: number; message?: string }> {
  const email = normalizeLearnerEmail(learnerEmail ?? getLearnerEmail() ?? "");
  if (!email) return { ok: false, message: "Not signed in" };

  const courses = collectLocalEnrollmentsForSync(email);
  if (courses.length === 0) return { ok: true, recorded: 0, skipped: 0 };

  try {
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerEmail: email, courses }),
    });
    const data = await readJsonResponse(res, {} as {
      ok?: boolean;
      recorded?: number;
      skipped?: number;
      message?: string;
    });
    if (!res.ok || !data.ok) {
      return { ok: false, message: data.message ?? "Could not save enrollments" };
    }
    return { ok: true, recorded: data.recorded ?? 0, skipped: data.skipped ?? 0 };
  } catch {
    return { ok: false, message: "Network error saving enrollments" };
  }
}
