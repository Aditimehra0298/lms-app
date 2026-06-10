"use client";

import { useState } from "react";
import type { ManagedCourseCertificateConfig } from "@/lib/certificate-program-config";
import { AdminPanelSection, adminToggleRow } from "@/components/admin/AdminCourseTabShell";
import AdminCertificateFileUpload from "@/components/admin/AdminCertificateFileUpload";

async function uploadAdminFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url;
}

type UploadField = "templateImage" | "badgeImage" | "transcriptFile";

type Props = {
  step?: number;
  programLabel?: string;
  certificateEnabled: boolean;
  onCertificateEnabledChange: (enabled: boolean) => void;
  config: ManagedCourseCertificateConfig;
  onPatch: (patch: Partial<ManagedCourseCertificateConfig>) => void;
  finalExamPassScore?: number;
  onGoContent?: () => void;
};

export function AdminProgramCertificateAssetsEditor({
  step = 3,
  programLabel = "course",
  certificateEnabled,
  onCertificateEnabledChange,
  config,
  onPatch,
  finalExamPassScore,
  onGoContent,
}: Props) {
  const [uploading, setUploading] = useState<Partial<Record<UploadField, boolean>>>({});
  const [uploadError, setUploadError] = useState<Partial<Record<UploadField, string>>>({});

  const runUpload = async (field: UploadField, file: File) => {
    setUploadError((e) => ({ ...e, [field]: undefined }));
    setUploading((u) => ({ ...u, [field]: true }));
    try {
      const url = await uploadAdminFile(file);
      onPatch({ [field]: url });
    } catch (err) {
      setUploadError((e) => ({
        ...e,
        [field]: err instanceof Error ? err.message : "Upload failed",
      }));
    } finally {
      setUploading((u) => ({ ...u, [field]: false }));
    }
  };

  return (
    <AdminPanelSection title={`Certificate, badge & transcript for this ${programLabel}`} step={step}>
      <p className="mb-3 text-[11px] text-violet-200/90">
        Upload a <strong className="text-violet-100">unique sample</strong> for this {programLabel}: certificate
        background, transcript, and badge. Each {programLabel} can look different. Global defaults under{" "}
        <strong className="text-violet-100">Users &amp; Access → Certificates</strong> apply only when a field is
        left empty here. Issued certificates still personalize name, number, and date per learner.
      </p>

      <label className={adminToggleRow}>
        <span>
          <span className="font-medium text-white">Issue certificate when learner completes this {programLabel}</span>
          <span className="mt-0.5 block text-[10px] text-gray-500">
            Self-paced: pass final exam. Tutor-led: when the program is marked complete.
          </span>
        </span>
        <input
          type="checkbox"
          checked={certificateEnabled}
          onChange={(e) => onCertificateEnabledChange(e.target.checked)}
          className="accent-amber-500"
        />
      </label>

      {certificateEnabled ? (
        <>
          {finalExamPassScore != null || onGoContent ? (
            <p className="mt-3 text-xs text-gray-400">
              {finalExamPassScore != null ? (
                <>
                  Final exam pass score: <strong className="text-gray-200">{finalExamPassScore}%</strong>.
                </>
              ) : (
                <>Set pass score in Content for self-paced courses.</>
              )}
              {onGoContent ? (
                <button
                  type="button"
                  onClick={onGoContent}
                  className="ml-2 rounded-lg bg-violet-600/20 px-2.5 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-600/30"
                >
                  Open Content
                </button>
              ) : null}
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <AdminCertificateFileUpload
              label="Certificate sample"
              hint="Background image for this program's certificate (JPG/PNG)."
              uploaded={Boolean(config.templateImage?.trim())}
              previewUrl={config.templateImage}
              accept="image/jpeg,image/png,image/webp,image/gif"
              kind="image"
              uploading={!!uploading.templateImage}
              error={uploadError.templateImage}
              onUpload={(file) => runUpload("templateImage", file)}
            />
            <AdminCertificateFileUpload
              label="Course badge"
              hint="Same badge for every learner on this program."
              uploaded={Boolean(config.badgeImage?.trim())}
              previewUrl={config.badgeImage}
              accept="image/jpeg,image/png,image/webp,image/gif"
              kind="image"
              previewShape="circle"
              uploading={!!uploading.badgeImage}
              error={uploadError.badgeImage}
              onUpload={(file) => runUpload("badgeImage", file)}
            />
            <AdminCertificateFileUpload
              label="Transcript sample"
              hint="Transcript PDF or image paired with the certificate."
              uploaded={Boolean(config.transcriptFile?.trim())}
              previewUrl={config.transcriptFile}
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
              kind="transcript"
              uploading={!!uploading.transcriptFile}
              error={uploadError.transcriptFile}
              onUpload={(file) => runUpload("transcriptFile", file)}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
            {config.templateImage?.trim() ? (
              <button
                type="button"
                onClick={() => onPatch({ templateImage: undefined })}
                className="text-gray-500 underline hover:text-gray-300"
              >
                Clear certificate sample (use global default)
              </button>
            ) : null}
            {config.badgeImage?.trim() ? (
              <button
                type="button"
                onClick={() => onPatch({ badgeImage: undefined })}
                className="text-gray-500 underline hover:text-gray-300"
              >
                Clear badge (use global default)
              </button>
            ) : null}
            {config.transcriptFile?.trim() ? (
              <button
                type="button"
                onClick={() => onPatch({ transcriptFile: undefined })}
                className="text-gray-500 underline hover:text-gray-300"
              >
                Clear transcript (use global default)
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </AdminPanelSection>
  );
}
