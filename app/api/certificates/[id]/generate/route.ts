import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCertificateOwnerOrAdmin } from "@/lib/server/certificate-access";
import { triggerCertificateGeneration } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

/** POST learner + course data to n8n certificate webhook. */
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
    const result = await triggerCertificateGeneration({
      certificateId: id.trim(),
      learnerEmail: row.learnerEmail.trim().toLowerCase(),
      forceRegenerate: body.forceRegenerate === true,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[certificates/generate]", err);
    return NextResponse.json(
      { ok: false, message: "Could not generate certificate." },
      { status: 503 },
    );
  }
}
