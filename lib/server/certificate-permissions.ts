import type { ManagedCourse, ManagedCourseCertificateConfig } from "@/lib/content-schema";

export type CertificatePermissionSettings = {
  enabled: boolean;
  provider: "builtin" | "n8n";
  showInLearnerDashboard: boolean;
  autoVisibleWhenReady: boolean;
  requireAdminApproval: boolean;
  n8nWebhookUrl: string | null;
};

export function resolveCertificatePermissions(
  course: ManagedCourse,
): CertificatePermissionSettings {
  const cfg = course.certificateConfig ?? {};
  const hero = course.hero ?? {};
  const enabled = cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no";
  const requireAdminApproval = cfg.requireAdminApproval === true;
  return {
    enabled,
    provider: cfg.provider === "builtin" ? "builtin" : "n8n",
    showInLearnerDashboard: cfg.showInLearnerDashboard !== false,
    autoVisibleWhenReady: !requireAdminApproval && cfg.autoVisibleWhenReady !== false,
    requireAdminApproval,
    n8nWebhookUrl: cfg.n8nWebhookUrl?.trim() || process.env.N8N_CERTIFICATE_WEBHOOK_URL?.trim() || null,
  };
}

export function shouldShowOnLearnerDashboard(
  perms: CertificatePermissionSettings,
  row: { status: string; visibleToLearner: boolean },
): boolean {
  if (!perms.showInLearnerDashboard) return false;
  if (row.status === "ready" && row.visibleToLearner) return true;
  if (row.status === "pending") return true;
  return false;
}
