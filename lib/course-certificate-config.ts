import type { ManagedCourse, ManagedCourseCertificateConfig } from "@/lib/content-schema";

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
    templateImage: raw.templateImage?.trim(),
    badgeImage: raw.badgeImage?.trim(),
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
  return {
    ...draft,
    certificateConfig: { ...(draft.certificateConfig ?? {}), ...patch },
  };
}
