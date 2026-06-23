import type { CertificatePermissionSettings } from "@/lib/server/certificate-permissions";
import type { AdminContent } from "@/lib/content-schema";
import {
  resolveCertificateAssetsForSlug,
  type ResolvedGlobalCertificateAssets,
} from "@/lib/global-certificate-assets";
import { resolveN8nCertificateWebhookUrl } from "@/lib/server/n8n-certificate-dispatch";

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

/** Local PDF overlay when n8n is unavailable (dev / offline). */
export function mayUseLocalCertificateFallback(n8nConfigured: boolean): boolean {
  const override = process.env.CERTIFICATE_LOCAL_FALLBACK?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;
  return !n8nConfigured;
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
