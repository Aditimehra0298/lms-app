import { NextResponse } from "next/server";
import { assertMainAdmin, adminEmailFromRequest } from "@/lib/server/admin-api-auth";
import {
  adminUpdateCertificateManual,
  setCertificateVisibility,
} from "@/lib/server/n8n-certificate-service";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set(["ready", "failed", "pending", "revoked"]);

/**
 * Admin certificate update — requires verified admin session + CSRF (POC-C-08 / POC-D-14).
 * Never trusts x-admin-email. certificateNumber is immutable after issue.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await assertMainAdmin(request);
  if (denied) return denied;

  const adminEmail = await adminEmailFromRequest(request);
  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  // Reject immutable / forgeable credential fields (POC-D-14).
  if (
    body.certificateNumber !== undefined ||
    body.delegateNumber !== undefined ||
    body.verifyNumber !== undefined ||
    body.identificationNumber !== undefined ||
    body.learnerEmail !== undefined ||
    body.courseSlug !== undefined
  ) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Certificate number and identity fields cannot be changed after issuance. Revoke or re-issue instead.",
      },
      { status: 400 },
    );
  }

  const visibleRaw = body.allowDownload ?? body.visibleToLearner;
  const visibleToLearner = typeof visibleRaw === "boolean" ? visibleRaw : undefined;
  const pdfUrl = typeof body.pdfUrl === "string" ? body.pdfUrl : undefined;
  const statusRaw = typeof body.status === "string" ? body.status.trim().toLowerCase() : undefined;

  if (statusRaw && !ALLOWED_STATUS.has(statusRaw)) {
    return NextResponse.json(
      { ok: false, message: "Invalid status. Allowed: ready, pending, failed, revoked." },
      { status: 400 },
    );
  }

  const status = statusRaw as "ready" | "failed" | "pending" | "revoked" | undefined;

  try {
    if (status !== undefined || pdfUrl !== undefined) {
      const result = await adminUpdateCertificateManual({
        certificateId: id,
        pdfUrl,
        status,
        visibleToLearner:
          status === "revoked" ? false : visibleToLearner,
        updatedByEmail: adminEmail ?? undefined,
      });
      if (!result.ok) return NextResponse.json(result, { status: 400 });
      return NextResponse.json(result);
    }

    if (typeof visibleToLearner !== "boolean") {
      return NextResponse.json(
        {
          ok: false,
          message: "Send allowDownload / visibleToLearner, and/or status / pdfUrl.",
        },
        { status: 400 },
      );
    }

    const result = await setCertificateVisibility(id, visibleToLearner);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    console.info(
      "[admin/certificates PATCH]",
      JSON.stringify({
        id,
        visibleToLearner,
        by: adminEmail,
        at: new Date().toISOString(),
      }),
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/certificates PATCH]", err);
    return NextResponse.json({ ok: false, message: "Update failed." }, { status: 503 });
  }
}
