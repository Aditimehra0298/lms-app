import { NextResponse } from "next/server";
import { assertMainAdmin } from "@/lib/server/admin-api-auth";
import { prisma } from "@/lib/prisma";
import { ensureProgressForReadyCertificate } from "@/lib/server/learner-course-progress-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * One-shot: for every ready certificate in MySQL, write 100% module progress
 * so learner dashboards match Admin → Students “Completed”.
 */
export async function POST(request: Request) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  try {
    const certs = await prisma.lmsCertificate.findMany({
      where: { status: "ready" },
      select: { learnerEmail: true, courseSlug: true, scorePercent: true, learnerName: true },
      orderBy: { issuedAt: "desc" },
    });

    const seen = new Set<string>();
    let healed = 0;
    const samples: { email: string; name: string | null; slug: string }[] = [];

    for (const cert of certs) {
      const email = cert.learnerEmail.trim().toLowerCase();
      const slug = cert.courseSlug.trim();
      if (!email || !slug) continue;
      const key = `${email}::${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);

      await ensureProgressForReadyCertificate({
        learnerEmail: email,
        courseSlug: slug,
        scorePercent: cert.scorePercent,
      });
      healed += 1;
      if (samples.length < 25) {
        samples.push({ email, name: cert.learnerName, slug });
      }
    }

    return NextResponse.json({
      ok: true,
      healed,
      totalReadyCertificates: certs.length,
      samples,
      message: `Healed progress for ${healed} learner/course pairs from ready certificates.`,
    });
  } catch (err) {
    console.error("[api/admin/progress/heal-certificates]", err);
    return NextResponse.json({ ok: false, message: "Heal failed." }, { status: 503 });
  }
}
