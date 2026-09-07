import type { CertificateGeneratorSentSummary } from "@/lib/server/n8n-certificate-payload";
import { readJsonResponse } from "@/lib/safe-json";

export type { CertificateGeneratorSentSummary };
/** @deprecated */
export type N8nCertificateSentSummary = CertificateGeneratorSentSummary;

export type TriggerCertificateResult = {
  ok?: boolean;
  message?: string;
  apiCalled?: boolean;
  n8nCalled?: boolean;
  generatorSent?: CertificateGeneratorSentSummary;
  n8nSent?: CertificateGeneratorSentSummary;
  certificate?: { id?: string; pdfReady?: boolean; pdfUrl?: string | null };
};

/** Generate certificate via n8n webhook (POST /api/certificates/:id/generate). */
export async function generateCertificateViaApi(
  certificateId: string,
  email: string,
  options?: { forceRegenerate?: boolean },
): Promise<TriggerCertificateResult> {
  const res = await fetch(
    `/api/certificates/${encodeURIComponent(certificateId.trim())}/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        forceRegenerate: options?.forceRegenerate === true,
      }),
    },
  );
  const data = await readJsonResponse(res, {} as TriggerCertificateResult);
  if (!res.ok) {
    return {
      ok: false,
      message: data.message ?? `Certificate generation failed (HTTP ${res.status}).`,
      apiCalled: false,
      n8nCalled: false,
    };
  }
  return data;
}

/** @deprecated Use generateCertificateViaApi */
export const sendCertificateTemplateToN8n = generateCertificateViaApi;

export type GenerateFromTemplateResult = {
  ok?: boolean;
  message?: string;
  downloadUrl?: string;
  templateImage?: string;
};

export type PrepareCertificateResult = {
  ok?: boolean;
  message?: string;
  downloadUrl?: string;
  status?: string;
  cached?: boolean;
  n8nCalled?: boolean;
};

/** Prepare certificate PDF via n8n (first time) or return cached LMS copy. */
export async function prepareLearnerCertificate(
  certificateId: string,
  email: string,
  options?: { forceRegenerate?: boolean },
): Promise<PrepareCertificateResult> {
  const res = await fetch(
    `/api/certificates/${encodeURIComponent(certificateId.trim())}/prepare`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        forceRegenerate: options?.forceRegenerate === true,
      }),
    },
  );
  return readJsonResponse(res, {} as PrepareCertificateResult);
}

/** @deprecated Use prepareLearnerCertificate + fetchSavedCertificatePdf for n8n courses. */
export async function generateCertificateFromTemplate(
  certificateId: string,
  email: string,
  options?: { forceRegenerate?: boolean },
): Promise<GenerateFromTemplateResult> {
  const res = await fetch(
    `/api/certificates/${encodeURIComponent(certificateId.trim())}/generate-from-template`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        forceRegenerate: options?.forceRegenerate === true,
      }),
    },
  );
  return readJsonResponse(res, {});
}
