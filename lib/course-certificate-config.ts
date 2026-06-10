import type { ManagedCourseCertificateConfig } from "@/lib/certificate-program-config";
import type { ManagedCourse } from "@/lib/content-schema";

export type { ManagedCourseCertificateConfig };

export function sanitizeCertificateConfig(
  raw: ManagedCourseCertificateConfig | undefined,
): ManagedCourseCertificateConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const docs = Array.isArray(raw.supplementaryDocs)
    ? raw.supplementaryDocs
        .filter((d) => d && typeof d === "object" && d.title?.trim() && d.url?.trim())
        .map((d) => ({ title: d.title.trim(), url: d.url.trim() }))
    : [];
  /** One global n8n workflow (env URL) — admin never configures provider per course. */
  const provider: ManagedCourseCertificateConfig["provider"] = "n8n";
  const out: ManagedCourseCertificateConfig = {
    enabled: raw.enabled !== false,
    provider,
    showInLearnerDashboard: raw.showInLearnerDashboard !== false,
    autoVisibleWhenReady: raw.autoVisibleWhenReady === true,
    requireAdminApproval: raw.requireAdminApproval !== false,
    title: raw.title?.trim(),
    templateImage: raw.templateImage?.trim() || undefined,
    badgeImage: raw.badgeImage?.trim() || undefined,
    transcriptFile: raw.transcriptFile?.trim() || undefined,
    nameTopPercent: clampPercent(raw.nameTopPercent),
    numberTopPercent: clampPercent(raw.numberTopPercent),
    dateTopPercent: clampPercent(raw.dateTopPercent),
    supplementaryDocs: docs.length > 0 ? docs : undefined,
  };
  return Object.keys(out).some((k) => out[k as keyof ManagedCourseCertificateConfig] !== undefined)
    ? out
    : undefined;
}

function clampPercent(n: number | undefined): number | undefined {
  if (n == null || !Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function patchCertificateConfig(
  draft: ManagedCourse,
  patch: Partial<ManagedCourseCertificateConfig>,
): ManagedCourse {
  const merged = { ...(draft.certificateConfig ?? {}), ...patch };
  return {
    ...draft,
    certificateConfig: sanitizeCertificateConfig(merged) ?? merged,
  };
}

export function patchProgramCertificateConfig<T extends { certificateConfig?: ManagedCourseCertificateConfig }>(
  draft: T,
  patch: Partial<ManagedCourseCertificateConfig>,
): T {
  const merged = { ...(draft.certificateConfig ?? {}), ...patch };
  return {
    ...draft,
    certificateConfig: sanitizeCertificateConfig(merged) ?? merged,
  };
}
