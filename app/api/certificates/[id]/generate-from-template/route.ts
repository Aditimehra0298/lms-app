import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCertificateOwnerOrAdmin } from "@/lib/server/certificate-access";
import { generateCertificateFromCourseTemplate } from "@/lib/server/local-certificate-fallback";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/** Overlay learner details on the course's uploaded certificate template and save PDF. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, message: "Missing certificate id" }, { status: 400 });
  }

  const row = await prisma.lmsCertificate.findUnique({
    where: { id: id.trim() },
    select: { learnerEmail: true },
  });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Certificate not found." }, { status: 404 });
  }

  const denied = assertCertificateOwnerOrAdmin(request, row.learnerEmail);
  if (denied) return denied;

  let body: { forceRegenerate?: boolean } = {};
  try {
    body = (await request.json()) as { forceRegenerate?: boolean };
  } catch {
    /* empty body ok */
  }

  try {
    const result = await generateCertificateFromCourseTemplate({
      certificateId: id.trim(),
      learnerEmail: row.learnerEmail.trim().toLowerCase(),
      forceRegenerate: body.forceRegenerate === true,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[certificates/generate-from-template]", err);
    return NextResponse.json(
      { ok: false, message: "Could not generate from template.", detail },
      { status: 503 },
    );
  }
}
