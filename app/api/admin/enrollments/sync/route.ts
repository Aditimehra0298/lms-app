import { NextResponse } from "next/server";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { recordPurchasesForLearner } from "@/lib/server/record-purchase";

export const dynamic = "force-dynamic";

type EnrollmentRow = {
  courseSlug?: string;
  learnerEmail?: string;
  learnerName?: string;
};

/**
 * Import enrollment rows into MySQL (e.g. legacy browser log on this admin machine).
 * Body: { enrollments: EnrollmentRow[] }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { enrollments?: EnrollmentRow[] };
    const rows = Array.isArray(body.enrollments) ? body.enrollments : [];

    let recorded = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const email = normalizeLearnerEmail(row.learnerEmail ?? "");
      const slug = String(row.courseSlug ?? "").trim().toLowerCase();
      if (!email || !slug) continue;

      const result = await recordPurchasesForLearner({
        learnerEmail: email,
        courses: [{ slug, title: row.learnerName?.trim() || slug }],
      });

      if (!result.ok) {
        errors.push(`${email}@${slug}: ${result.message}`);
        continue;
      }
      recorded += result.recorded;
      skipped += result.skipped;
    }

    return NextResponse.json({
      ok: true,
      recorded,
      skipped,
      processed: rows.length,
      errors: errors.length ? errors.slice(0, 20) : undefined,
    });
  } catch (err) {
    console.error("[admin/enrollments/sync]", err);
    return NextResponse.json({ ok: false, message: "Sync failed" }, { status: 503 });
  }
}
