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
  const provider = raw.provider === "builtin" || raw.provider === "n8n" ? raw.provider : undefined;
  const out: ManagedCourseCertificateConfig = {
    enabled: raw.enabled !== false,
    provider,
    n8nWebhookUrl: raw.n8nWebhookUrl?.trim(),
    showInLearnerDashboard: raw.showInLearnerDashboard !== false,
    autoVisibleWhenReady: raw.autoVisibleWhenReady !== false,
    requireAdminApproval: raw.requireAdminApproval === true,
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
