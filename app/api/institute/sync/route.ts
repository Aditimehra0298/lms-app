import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextStudentUid } from "@/lib/server/council-access";
import { normalizeLearnerEmail } from "@/lib/learner-email";
import { buildCertificateQrVerifyUrl } from "@/lib/certificate-verify-url";
import { appBaseUrl } from "@/lib/server/certificate-app-url";

export const dynamic = "force-dynamic";

/**
 * Institute app → Admin LMS sync (same sft_lms DB).
 * Auth: header x-institute-key = INSTITUTE_SYNC_KEY (env), plus organizationId or org email.
 *
 * POST body examples:
 * { action: "upsert-student", organizationId, student: { uid?, name, email, phone, photoUrl, batch, grade, courseSlug, courseTitle } }
 * { action: "upsert-certificate", organizationId, certificate: { certificateNumber, learnerEmail, learnerName, courseSlug, courseTitle, pdfUrl, identificationNumber?, scorePercent? } }
 * { action: "upsert-video-status", studentUid, title, status, videoUrl?, courseSlug? }
 * { action: "video-access-request", name, organisation, email, location, organizationId? }
 */
export async function POST(request: Request) {
  const key = request.headers.get("x-institute-key")?.trim() || "";
  const expected = process.env.INSTITUTE_SYNC_KEY?.trim() || "";
  if (!expected || key !== expected) {
    return NextResponse.json({ ok: false, message: "Invalid institute sync key." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();

  try {
    if (action === "upsert-student") {
      const organizationId = String(body.organizationId ?? "").trim();
      if (!organizationId) {
        return NextResponse.json({ ok: false, message: "organizationId required" }, { status: 400 });
      }
      const org = await prisma.lmsOrganization.findUnique({ where: { id: organizationId } });
      if (!org) return NextResponse.json({ ok: false, message: "Unknown organization" }, { status: 404 });

      const s = (body.student || {}) as Record<string, unknown>;
      const name = String(s.name ?? "").trim();
      const email = normalizeLearnerEmail(String(s.email ?? ""));
      if (!name) return NextResponse.json({ ok: false, message: "student.name required" }, { status: 400 });

      let userId: string | null = null;
      if (email) {
        const user = await prisma.lmsUser.findUnique({ where: { email } });
        userId = user?.id ?? null;
      }

      const uid = String(s.uid ?? "").trim() || nextStudentUid((await prisma.lmsStudent.count()) + 101);
      const student = await prisma.lmsStudent.upsert({
        where: { uid },
        create: {
          uid,
          name,
          email: email || null,
          phone: String(s.phone ?? "").trim() || null,
          photoUrl: String(s.photoUrl ?? "").trim() || null,
          batch: String(s.batch ?? "").trim() || null,
          grade: String(s.grade ?? "").trim() || null,
          courseSlug: String(s.courseSlug ?? "").trim() || null,
          courseTitle: String(s.courseTitle ?? "").trim() || null,
          organizationId,
          userId,
          status: String(s.status ?? "active").trim() || "active",
        },
        update: {
          name,
          email: email || null,
          phone: String(s.phone ?? "").trim() || null,
          photoUrl: String(s.photoUrl ?? "").trim() || null,
          batch: String(s.batch ?? "").trim() || null,
          grade: String(s.grade ?? "").trim() || null,
          courseSlug: String(s.courseSlug ?? "").trim() || null,
          courseTitle: String(s.courseTitle ?? "").trim() || null,
          organizationId,
          userId,
          status: String(s.status ?? "active").trim() || "active",
        },
      });
      return NextResponse.json({ ok: true, student });
    }

    if (action === "upsert-certificate") {
      const organizationId = String(body.organizationId ?? "").trim() || null;
      const c = (body.certificate || {}) as Record<string, unknown>;
      const certificateNumber = String(c.certificateNumber ?? "").trim();
      const learnerEmail = normalizeLearnerEmail(String(c.learnerEmail ?? ""));
      const courseSlug = String(c.courseSlug ?? "").trim();
      const courseTitle = String(c.courseTitle ?? "").trim() || courseSlug;
      if (!certificateNumber || !learnerEmail || !courseSlug) {
        return NextResponse.json(
          { ok: false, message: "certificateNumber, learnerEmail, courseSlug required" },
          { status: 400 },
        );
      }

      const user = await prisma.lmsUser.findUnique({ where: { email: learnerEmail } });
      const course = await prisma.lmsCourse.findUnique({ where: { slug: courseSlug } });
      const identificationNumber =
        Number(c.identificationNumber) ||
        user?.identificationNumber ||
        (await prisma.lmsCertificate.count()) + 101;

      const verifyUrl = buildCertificateQrVerifyUrl(appBaseUrl(), { certificateNumber });
      const row = await prisma.lmsCertificate.upsert({
        where: { certificateNumber },
        create: {
          certificateNumber,
          learnerEmail,
          learnerName: String(c.learnerName ?? "").trim() || user?.name || learnerEmail,
          courseSlug,
          courseTitle,
          courseId: course?.id ?? null,
          userId: user?.id ?? null,
          organizationId,
          holderType: organizationId ? "organisation" : "individual",
          identificationNumber,
          scorePercent: c.scorePercent != null ? Number(c.scorePercent) : null,
          pdfUrl: String(c.pdfUrl ?? "").trim() || null,
          status: String(c.status ?? "ready").trim() || "ready",
          visibleToLearner: true,
          issuedVia: "institute-sync",
        },
        update: {
          learnerName: String(c.learnerName ?? "").trim() || user?.name || learnerEmail,
          courseTitle,
          pdfUrl: String(c.pdfUrl ?? "").trim() || null,
          status: String(c.status ?? "ready").trim() || "ready",
          organizationId,
          scorePercent: c.scorePercent != null ? Number(c.scorePercent) : undefined,
        },
      });
      return NextResponse.json({ ok: true, certificate: row, verifyUrl });
    }

    if (action === "upsert-video-status") {
      const studentUid = String(body.studentUid ?? "").trim();
      const title = String(body.title ?? "").trim();
      const status = String(body.status ?? "missing").trim();
      if (!studentUid || !title) {
        return NextResponse.json({ ok: false, message: "studentUid and title required" }, { status: 400 });
      }
      if (!["uploaded", "missing", "approved"].includes(status)) {
        return NextResponse.json({ ok: false, message: "status must be uploaded|missing|approved" }, { status: 400 });
      }
      const student = await prisma.lmsStudent.findUnique({ where: { uid: studentUid } });
      if (!student) return NextResponse.json({ ok: false, message: "Student not found" }, { status: 404 });

      const existing = await prisma.studentTrainingVideo.findFirst({
        where: { studentId: student.id, title },
      });
      const row = existing
        ? await prisma.studentTrainingVideo.update({
            where: { id: existing.id },
            data: {
              status,
              videoUrl: String(body.videoUrl ?? "").trim() || null,
              courseSlug: String(body.courseSlug ?? "").trim() || null,
            },
          })
        : await prisma.studentTrainingVideo.create({
            data: {
              studentId: student.id,
              title,
              status,
              videoUrl: String(body.videoUrl ?? "").trim() || null,
              courseSlug: String(body.courseSlug ?? "").trim() || null,
            },
          });
      return NextResponse.json({ ok: true, video: row });
    }

    if (action === "video-access-request") {
      const name = String(body.name ?? "").trim();
      const organisation = String(body.organisation ?? body.organization ?? "").trim();
      const email = normalizeLearnerEmail(String(body.email ?? ""));
      const location = String(body.location ?? "").trim();
      if (!name || !organisation || !email || !location) {
        return NextResponse.json(
          { ok: false, message: "name, organisation, email, location required" },
          { status: 400 },
        );
      }
      const organizationId = String(body.organizationId ?? "").trim() || null;
      const row = await prisma.videoAccessRequest.create({
        data: { name, organisation, email, location, organizationId, status: "new" },
      });
      return NextResponse.json({ ok: true, request: row });
    }

    return NextResponse.json({ ok: false, message: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[institute/sync]", err);
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
