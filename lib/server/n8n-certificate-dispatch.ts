import type { CertificateProgramRef } from "@/lib/certificate-program-resolve";
import type { AdminContent } from "@/lib/content-schema";
import type { ResolvedGlobalCertificateAssets } from "@/lib/global-certificate-assets";
import {
  buildN8nCertificateWebhookPayload,
  summarizeN8nCertificatePayload,
  type N8nCertificateSentSummary,
} from "@/lib/server/n8n-certificate-payload";
import type { CourseMysqlRecord } from "@/lib/server/course-mysql-sync";
import type { CertificatePermissionSettings } from "@/lib/server/certificate-permissions";
import type { RegistrationLookupResult } from "@/lib/server/registration-lookup";
import {
  certificatePdfServePath,
  isValidArchivedCertificatePdf,
  N8N_ARCHIVED_PDF_MIN_BYTES,
  persistCertificatePdf,
} from "@/lib/server/certificate-pdf-store";
import { buildN8nWebhookHeaders, n8nWebhookAuthHint } from "@/lib/server/n8n-webhook-auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_N8N_CERTIFICATE_WEBHOOK_URL =
  "https://damnart-ai-guladab.n8n-wsk.com/webhook/certificate";

export function resolveN8nCertificateWebhookUrl(): string | null {
  const fromEnv = process.env.N8N_CERTIFICATE_WEBHOOK_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_N8N_CERTIFICATE_WEBHOOK_URL;
}

/** PDF URL from n8n Respond to Webhook (plain text or JSON). */
export function parseN8nWebhookPdfUrl(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of ["pdfUrl", "pdf_url", "url"]) {
      const value = json[key];
      if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
        return value.trim();
      }
    }
  } catch {
    const match = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
    if (match) return match[0];
  }
  return null;
}

/** POST course_completed payload to n8n certificate webhook (on download / generate). */
export async function dispatchCertificateToN8n(input: {
  row: {
    id: string;
    certificateNumber: string;
    delegateNumber: string | null;
    verifyNumber: number | null;
    learnerEmail: string;
    courseSlug: string;
    courseTitle: string;
    issuedAt: Date;
    scorePercent: number | null;
  };
  course: CertificateProgramRef;
  courseRow: CourseMysqlRecord;
  registration: RegistrationLookupResult;
  perms: CertificatePermissionSettings;
  assets: ResolvedGlobalCertificateAssets;
  displayName: string;
  scorePercent?: number | null;
  content: AdminContent;
  layout?: {
    nameTopPercent: number;
    numberTopPercent: number;
    dateTopPercent: number;
  };
}): Promise<
  | { ok: true; pdfUrl?: string; sent: N8nCertificateSentSummary; message: string; async: boolean }
  | { ok: false; message: string }
> {
  const webhookUrl = resolveN8nCertificateWebhookUrl();
  if (!webhookUrl) {
    return {
      ok: false,
      message: "n8n certificate webhook is not configured. Set N8N_CERTIFICATE_WEBHOOK_URL in .env.local.",
    };
  }

  let payload;
  try {
    payload = buildN8nCertificateWebhookPayload({
      row: input.row,
      course: input.course,
      courseRow: input.courseRow,
      registration: input.registration,
      perms: input.perms,
      assets: input.assets,
      displayName: input.displayName,
      scorePercent: input.scorePercent,
      content: input.content,
      layout: input.layout,
    });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Could not build n8n certificate payload.";
    return { ok: false, message: msg };
  }

  const sent = summarizeN8nCertificatePayload(payload);

  console.info("[certificate] POST n8n webhook", webhookUrl, {
    event: payload.event,
    certificateId: payload.certificateId,
    courseName: payload.courseName,
    callbackUrl: payload.callbackUrl,
    email: payload.email,
    learnerName: payload.learnerName,
    learner: {
      email: payload.learner.email,
      name: payload.learner.name,
      accountType: payload.learner.accountType,
      identificationNumber: payload.learner.identificationNumber,
      registrationCode: payload.learner.registrationCode,
      countryCode: payload.learner.countryCode,
      countryName: payload.learner.countryName,
    },
  });

  await prisma.lmsCertificate.update({
    where: { id: input.row.id },
    data: {
      status: "pending",
      issuedVia: "n8n",
      templateImage: input.assets.templateImage,
      badgeImage: input.assets.badgeImage,
    },
  });

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: buildN8nWebhookHeaders(),
      body: JSON.stringify(payload),
    });
    const responseBody = await res.text();
    console.info("[certificate] n8n webhook response", res.status, responseBody.slice(0, 240));

    if (!res.ok) {
      const authHint = res.status === 401 || res.status === 403 ? n8nWebhookAuthHint() : "";
      await prisma.lmsCertificate.update({
        where: { id: input.row.id },
        data: { status: "failed" },
      });
      return {
        ok: false,
        message: `n8n certificate webhook returned ${res.status}. ${responseBody.slice(0, 160) || authHint}`,
      };
    }

    const remotePdfUrl = parseN8nWebhookPdfUrl(responseBody);
    if (!remotePdfUrl) {
      return {
        ok: true,
        sent,
        async: true,
        message:
          "Certificate request sent to n8n. The PDF will be saved when the workflow calls your callback URL.",
      };
    }

    const id = input.row.id.trim();
    let archived: string | null = null;
    if (await isValidArchivedCertificatePdf(id, { minBytes: N8N_ARCHIVED_PDF_MIN_BYTES })) {
      archived = certificatePdfServePath(id);
    } else {
      const persisted = await persistCertificatePdf({
        certificateId: id,
        remoteUrl: remotePdfUrl,
      });
      if (persisted.ok) archived = persisted.storedUrl;
    }

    if (!archived) {
      await prisma.lmsCertificate.update({
        where: { id: input.row.id },
        data: { status: "failed", pdfUrl: null },
      });
      return {
        ok: false,
        message: "n8n returned a PDF URL but the LMS could not save it.",
      };
    }

    const visible =
      input.perms.autoVisibleWhenReady !== false && !input.perms.requireAdminApproval;

    await prisma.lmsCertificate.update({
      where: { id: input.row.id },
      data: {
        status: "ready",
        pdfUrl: archived,
        issuedVia: "n8n",
        visibleToLearner: visible,
      },
    });

    return {
      ok: true,
      pdfUrl: archived,
      sent,
      async: false,
      message: "Certificate generated via n8n.",
    };
  } catch (err) {
    await prisma.lmsCertificate.update({
      where: { id: input.row.id },
      data: { status: "failed" },
    });
    const msg = err instanceof Error ? err.message : "n8n certificate webhook request failed";
    return { ok: false, message: msg };
  }
}
