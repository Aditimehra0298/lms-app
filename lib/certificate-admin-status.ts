import type { ManagedCourseCertificateConfig } from "@/lib/certificate-program-config";

export type CertificateUploadStatus = {
  enabled: boolean;
  uploadedCount: number;
  complete: boolean;
  partial: boolean;
  label: string;
};

export function getCertificateUploadStatus(
  cfg?: ManagedCourseCertificateConfig,
  opts?: { heroCertificate?: string },
): CertificateUploadStatus {
  const heroOff = (opts?.heroCertificate ?? "").trim().toLowerCase() === "no";
  const enabled = cfg?.enabled !== false && !heroOff;
  const uploadedCount = [
    cfg?.templateImage?.trim(),
    cfg?.badgeImage?.trim(),
    cfg?.transcriptFile?.trim(),
  ].filter(Boolean).length;
  const complete = uploadedCount === 3;
  const partial = uploadedCount > 0 && uploadedCount < 3;

  let label = "Uses global";
  if (!enabled) label = "Off";
  else if (complete) label = "Ready";
  else if (partial) label = `${uploadedCount}/3`;

  return { enabled, uploadedCount, complete, partial, label };
}
