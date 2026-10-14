import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertCertificateOwnerOrAdmin,
  assertCertificateReleasedToLearner,
  isMainAdminRequest,
} from "@/lib/server/certificate-access";
import { ensureCertificatePdfReady } from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Trigger n8n if needed, then return LMS PDF download path. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, message: "Missing certificate id" }, { status: 400 });
  }

  const row = await prisma.lmsCertificate.findUnique({
    where: { id: id.trim() },
    select: { learnerEmail: true, status: true, visibleToLearner: true },
  });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Certificate not found." }, { status: 404 });
  }

  const denied = assertCertificateOwnerOrAdmin(request, row.learnerEmail);
  if (denied) return denied;
  const notReleased = assertCertificateReleasedToLearner(request, row);
  if (notReleased) return notReleased;
  const isAdmin = isMainAdminRequest(request);

  let body: { forceRegenerate?: boolean; triggerN8n?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* empty body ok */
  }

  try {
    const result = await ensureCertificatePdfReady({
      certificateId: id.trim(),
      learnerEmail: row.learnerEmail.trim().toLowerCase(),
      forceRegenerate: isAdmin && body.forceRegenerate === true,
      triggerN8n: isAdmin && body.triggerN8n === true,
    });
    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.status === "awaiting_approval" ? 403 : 409,
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[certificates/prepare]", err);
    return NextResponse.json({ ok: false, message: "Could not prepare certificate." }, { status: 503 });
  }
}
