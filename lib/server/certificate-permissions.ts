import type { CertificateProgramRef } from "@/lib/certificate-program-resolve";
import { resolveCertificateGeneratorApiUrl } from "@/lib/server/certificate-generator-api";

export type CertificatePermissionSettings = {
  enabled: boolean;
  provider: "builtin" | "api";
  showInLearnerDashboard: boolean;
  autoVisibleWhenReady: boolean;
  requireAdminApproval: boolean;
  certificateGeneratorApiUrl: string | null;
};

export function resolveCertificatePermissions(
  program: CertificateProgramRef,
): CertificatePermissionSettings {
  const cfg = program.certificateConfig ?? {};
  const hero = program.hero ?? {};
  const enabled = cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no";
  const requireAdminApproval = cfg.requireAdminApproval === true;
  const apiUrl =
    cfg.certificateGeneratorApiUrl?.trim() ||
    process.env.CERTIFICATE_GENERATOR_API_URL?.trim() ||
    resolveCertificateGeneratorApiUrl();
  return {
    enabled,
    provider: cfg.provider === "builtin" ? "builtin" : "api",
    showInLearnerDashboard: cfg.showInLearnerDashboard !== false,
    autoVisibleWhenReady: !requireAdminApproval && cfg.autoVisibleWhenReady !== false,
    requireAdminApproval,
    certificateGeneratorApiUrl: apiUrl,
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
