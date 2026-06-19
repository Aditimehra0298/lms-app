import {
  buildCertificateGeneratorApiPayload,
  parseCertificateGeneratorPdfUrl,
  summarizeCertificateGeneratorPayload,
  type CertificateGeneratorSentSummary,
} from "@/lib/server/certificate-generator-payload";
import type { CertificateProgramRef } from "@/lib/certificate-program-resolve";
import type { ResolvedGlobalCertificateAssets } from "@/lib/global-certificate-assets";
import type { RegistrationLookupResult } from "@/lib/server/registration-lookup";
import {
  certificatePdfServePath,
  isValidArchivedCertificatePdf,
  persistCertificatePdf,
} from "@/lib/server/certificate-pdf-store";
import { prisma } from "@/lib/prisma";

const DEFAULT_GENERATOR_API_URL = "https://certificate-generation-navy.vercel.app";

export type { CertificateGeneratorSentSummary };

export function resolveCertificateGeneratorApiUrl(): string | null {
  const fromEnv = process.env.CERTIFICATE_GENERATOR_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_GENERATOR_API_URL;
}

/** POST learner + course templates to the certificate generator API; archive returned PDF on LMS. */
export async function dispatchCertificateToGeneratorApi(input: {
  row: {
    id: string;
    certificateNumber: string;
    delegateNumber: string | null;
    learnerEmail: string;
    courseSlug: string;
    courseTitle: string;
    issuedAt: Date;
    scorePercent: number | null;
  };
  course: CertificateProgramRef;
  registration: RegistrationLookupResult;
  assets: ResolvedGlobalCertificateAssets;
  displayName: string;
  scorePercent?: number | null;
  autoVisibleWhenReady?: boolean;
}): Promise<
  | { ok: true; pdfUrl: string; sent: CertificateGeneratorSentSummary; message: string }
  | { ok: false; message: string }
> {
  const apiBase = resolveCertificateGeneratorApiUrl();
  if (!apiBase) {
    return {
      ok: false,
      message:
        "Certificate generator API is not configured. Set CERTIFICATE_GENERATOR_API_URL in .env.local.",
    };
  }

  const built = await buildCertificateGeneratorApiPayload({
    row: input.row,
    course: input.course,
    assets: input.assets,
    displayName: input.displayName,
    registrationDelegateCode: input.registration.registrationCode,
    scorePercent: input.scorePercent,
  });
  if ("ok" in built && built.ok === false) {
    return built;
  }

  const payload = built as Exclude<typeof built, { ok: false }>;
  const sent = summarizeCertificateGeneratorPayload(payload);
  const endpoint = `${apiBase}/generate-certificate`;

  console.info("[certificate] POST generator API", endpoint, {
    certificateId: payload.certificateId,
    candidateName: payload.candidateName,
    courseName: payload.courseName,
    certificateTemplate: sent.certificateTemplate.slice(0, 100),
    transcriptTemplate: sent.transcriptTemplate.slice(0, 100),
  });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const responseBody = await res.text();
    console.info("[certificate] generator API response", res.status, responseBody.slice(0, 240));

    if (!res.ok) {
      let detail = responseBody.slice(0, 200);
      try {
        const errJson = JSON.parse(responseBody) as { error?: string };
        if (errJson.error) detail = errJson.error;
      } catch {
        /* use raw */
      }
      await prisma.lmsCertificate.update({
        where: { id: input.row.id },
        data: { status: "failed" },
      });
      return {
        ok: false,
        message: `Certificate generator returned ${res.status}. ${detail || "Check API logs."}`,
      };
    }

    const pdfUrl = parseCertificateGeneratorPdfUrl(responseBody);
    if (!pdfUrl) {
      await prisma.lmsCertificate.update({
        where: { id: input.row.id },
        data: { status: "failed" },
      });
      return {
        ok: false,
        message: "Certificate generator did not return a pdfUrl.",
      };
    }

    const archived = await (async () => {
      const id = input.row.id.trim();
      if (await isValidArchivedCertificatePdf(id)) {
        return certificatePdfServePath(id);
      }
      const persisted = await persistCertificatePdf({
        certificateId: id,
        remoteUrl: pdfUrl,
      });
      if (!persisted.ok) return null;
      return persisted.storedUrl;
    })();

    if (!archived) {
      await prisma.lmsCertificate.update({
        where: { id: input.row.id },
        data: { status: "failed", pdfUrl },
      });
      return {
        ok: false,
        message: "Certificate PDF was generated but could not be saved on LMS.",
      };
    }

    await prisma.lmsCertificate.update({
      where: { id: input.row.id },
      data: {
        status: "ready",
        pdfUrl: archived,
        issuedVia: "api",
        templateImage: input.assets.templateImage,
        badgeImage: input.assets.badgeImage,
        visibleToLearner: input.autoVisibleWhenReady !== false,
      },
    });

    return {
      ok: true,
      pdfUrl: archived,
      sent,
      message: "Certificate generated using your course templates.",
    };
  } catch (err) {
    await prisma.lmsCertificate.update({
      where: { id: input.row.id },
      data: { status: "failed" },
    });
    const msg = err instanceof Error ? err.message : "Certificate generator request failed";
    return { ok: false, message: msg };
  }
}
