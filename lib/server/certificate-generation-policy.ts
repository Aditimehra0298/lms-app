import type { CertificatePermissionSettings } from "@/lib/server/certificate-permissions";
import type { AdminContent } from "@/lib/content-schema";
import {
  resolveCertificateAssetsForSlug,
  type ResolvedGlobalCertificateAssets,
} from "@/lib/global-certificate-assets";
import { resolveN8nCertificateWebhookUrl } from "@/lib/server/n8n-certificate-dispatch";
import { isPrivateOrLocalBaseUrl, n8nCallbackBaseUrl } from "@/lib/server/certificate-app-url";
import { N8N_ARCHIVED_PDF_MIN_BYTES } from "@/lib/server/certificate-pdf-store";

/** n8n certificate webhook configured. */
export function isN8nCertificateProviderConfigured(): boolean {
  return Boolean(resolveN8nCertificateWebhookUrl());
}

/** External certificate generation via n8n (not builtin LMS overlay). */
export function isCertificateApiProvider(perms: CertificatePermissionSettings): boolean {
  if (perms.provider === "builtin") return false;
  return isN8nCertificateProviderConfigured();
}

/** @deprecated Use isN8nCertificateProviderConfigured */
export function isN8nCertificateProvider(perms: CertificatePermissionSettings): boolean {
  return isN8nCertificateProviderConfigured() && perms.provider !== "builtin";
}

/**
 * Plain-text / overlay PDF only when n8n cannot run (not configured, or local dev
 * where n8n Cloud cannot callback). Production always waits for n8n unless
 * CERTIFICATE_LOCAL_FALLBACK=true.
 */
export function mayUseLocalCertificateFallback(n8nConfigured: boolean): boolean {
  const override = process.env.CERTIFICATE_LOCAL_FALLBACK?.trim().toLowerCase();
  if (override === "false") return false;
  if (!n8nConfigured) return true;
  // Live LMS must use n8n — never lock in the plain-text placeholder PDF.
  if (process.env.NODE_ENV === "production") return false;
  if (override === "true") return true;
  return isPrivateOrLocalBaseUrl(n8nCallbackBaseUrl());
}

export function isManualCertificateIssuedVia(issuedVia: string): boolean {
  return issuedVia === "manual";
}

/** Tiny local-fallback PDFs must not count as a finished n8n certificate. */
export function officialCertificatePdfMinBytes(issuedVia: string): number {
  return issuedVia === "manual" ? 128 : N8N_ARCHIVED_PDF_MIN_BYTES;
}

export type CourseCertificateAssets = ResolvedGlobalCertificateAssets & {
  supplementaryDocs: { title: string; url: string }[];
};

export function resolveCourseCertificateAssets(
  content: AdminContent,
  courseSlug: string,
): CourseCertificateAssets {
  return resolveCertificateAssetsForSlug(content, courseSlug);
}

export function courseCertificateAssetsReady(assets: CourseCertificateAssets): boolean {
  return Boolean(assets.templateImage?.trim() && assets.badgeImage?.trim() && assets.transcriptFile?.trim());
}

export const COURSE_CERTIFICATE_ASSETS_MISSING_MESSAGE =
  "Upload certificate sample, badge, and transcript for this course (Course settings → Certificate), or set global defaults under Users & Access → Certificates.";

/** issuedVia values that indicate a full multi-page PDF from n8n (or legacy api rows). */
export function isGeneratorIssuedVia(issuedVia: string): boolean {
  return issuedVia === "api" || issuedVia === "n8n";
}
