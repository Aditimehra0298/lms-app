import type { CertificateProgramRef } from "@/lib/certificate-program-resolve";
import { resolveN8nCertificateWebhookUrl } from "@/lib/server/n8n-certificate-dispatch";

export type CertificatePermissionSettings = {
  enabled: boolean;
  provider: "builtin" | "n8n";
  showInLearnerDashboard: boolean;
  autoVisibleWhenReady: boolean;
  requireAdminApproval: boolean;
  n8nCertificateWebhookUrl: string | null;
};

export function resolveCertificatePermissions(
  program: CertificateProgramRef,
): CertificatePermissionSettings {
  const cfg = program.certificateConfig ?? {};
  const hero = program.hero ?? {};
  const enabled = cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no";
  const requireAdminApproval = cfg.requireAdminApproval === true;
  const n8nUrl = resolveN8nCertificateWebhookUrl();
  const provider = cfg.provider === "builtin" ? "builtin" : "n8n";
  return {
    enabled,
    provider,
    showInLearnerDashboard: cfg.showInLearnerDashboard !== false,
    autoVisibleWhenReady: !requireAdminApproval && cfg.autoVisibleWhenReady !== false,
    requireAdminApproval,
    n8nCertificateWebhookUrl: n8nUrl,
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
