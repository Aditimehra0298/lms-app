import type { CertificateGeneratorSentSummary } from "@/lib/server/certificate-generator-payload";
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

/** Generate certificate via direct API (course templates from admin). */
export async function generateCertificateViaApi(
  certificateId: string,
  email: string,
): Promise<TriggerCertificateResult> {
  const res = await fetch(
    `/api/certificates/${encodeURIComponent(certificateId.trim())}/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
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

/** Fallback: overlay text on course template inside LMS (pdf-lib). */
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
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        forceRegenerate: options?.forceRegenerate === true,
      }),
    },
  );
  return readJsonResponse(res, {});
}
