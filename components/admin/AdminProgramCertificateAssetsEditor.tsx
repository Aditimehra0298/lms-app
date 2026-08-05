"use client";

import { useEffect, useState } from "react";
import type { ManagedCourseCertificateConfig } from "@/lib/certificate-program-config";
import { AdminPanelSection, adminToggleRow } from "@/components/admin/AdminCourseTabShell";
import AdminCertificateFileUpload from "@/components/admin/AdminCertificateFileUpload";
import { CertificateTemplatePreview } from "@/components/CertificateTemplatePreview";
import { resolveCertificateTemplateLayout } from "@/lib/certificate-template-layout";
import { resolveProtectedMediaUrl } from "@/lib/media-client";

async function uploadAdminFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const isImage = /^image\//i.test(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  const endpoint = isImage ? "/api/admin/upload-cover" : "/api/admin/upload";
  const res = await fetch(endpoint, { method: "POST", body: fd });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url;
}

type UploadField = "templateImage" | "badgeImage" | "transcriptFile";

type Props = {
  step?: number;
  programLabel?: string;
  programTitle?: string;
  certificateEnabled: boolean;
  onCertificateEnabledChange: (enabled: boolean) => void;
  config: ManagedCourseCertificateConfig;
  onPatch: (patch: Partial<ManagedCourseCertificateConfig>) => void;
  finalExamPassScore?: number;
  onGoContent?: () => void;
};

function LayoutSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-[11px] text-gray-300">
      <span className="mb-1 flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-amber-200">{value}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500"
      />
    </label>
  );
}

export function AdminProgramCertificateAssetsEditor({
  step = 3,
  programLabel = "course",
  programTitle = "Sample Course Title",
  certificateEnabled,
  onCertificateEnabledChange,
  config,
  onPatch,
  finalExamPassScore,
  onGoContent,
}: Props) {
  const [uploading, setUploading] = useState<Partial<Record<UploadField, boolean>>>({});
  const [uploadError, setUploadError] = useState<Partial<Record<UploadField, string>>>({});
  const [resolvedTemplate, setResolvedTemplate] = useState("");
  const [resolvedBadge, setResolvedBadge] = useState("");

  const layout = resolveCertificateTemplateLayout(config);

  useEffect(() => {
    const template = config.templateImage?.trim() ?? "";
    if (!template) {
      setResolvedTemplate("");
      return;
    }
    void resolveProtectedMediaUrl(template, { scope: "admin" }).then(setResolvedTemplate);
  }, [config.templateImage]);

  useEffect(() => {
    const badge = config.badgeImage?.trim() ?? "";
    if (!badge) {
      setResolvedBadge("");
      return;
    }
    void resolveProtectedMediaUrl(badge, { scope: "admin" }).then(setResolvedBadge);
  }, [config.badgeImage]);

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
        background, transcript, and badge. Learner name, certificate number, and issue date are placed on your
        template when they generate the PDF. Use the position sliders below to align text with your design.
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

          {config.templateImage?.trim() && resolvedTemplate ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
              <h4 className="text-sm font-semibold text-white">Adjust text on certificate</h4>
              <p className="mt-1 text-[11px] text-gray-400">
                Move the sliders until the sample text sits on your template blanks. Save the {programLabel} to
                apply — learners must click <strong className="text-gray-300">Generate certificate</strong> again
                to refresh an existing PDF.
              </p>

              <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,280px)_1fr]">
                <div className="space-y-4">
                  <LayoutSlider
                    label="Learner name (from top)"
                    value={layout.nameTopPercent}
                    onChange={(nameTopPercent) => onPatch({ nameTopPercent })}
                  />
                  <LayoutSlider
                    label="Certificate number (from top)"
                    value={layout.numberTopPercent}
                    onChange={(numberTopPercent) => onPatch({ numberTopPercent })}
                  />
                  <LayoutSlider
                    label="Issue date block (from top)"
                    value={layout.dateTopPercent}
                    onChange={(dateTopPercent) => onPatch({ dateTopPercent })}
                  />

                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <label className="flex items-center gap-2 text-[11px] text-gray-300">
                      <input
                        type="checkbox"
                        checked={layout.overlayCourseTitle}
                        onChange={(e) => onPatch({ overlayCourseTitle: e.target.checked })}
                        className="accent-amber-500"
                      />
                      Show course title on certificate
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-gray-300">
                      <input
                        type="checkbox"
                        checked={layout.overlayScore}
                        onChange={(e) => onPatch({ overlayScore: e.target.checked })}
                        className="accent-amber-500"
                      />
                      Show final grade / score
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-gray-300">
                      <input
                        type="checkbox"
                        checked={layout.overlayBadge}
                        onChange={(e) => onPatch({ overlayBadge: e.target.checked })}
                        className="accent-amber-500"
                      />
                      Show badge on certificate
                    </label>
                  </div>
                </div>

                <div className="min-w-0">
                  <CertificateTemplatePreview
                    templateImage={resolvedTemplate}
                    badgeImage={resolvedBadge || undefined}
                    learnerName="Sample Learner"
                    certificateNumber="SFT-2026-00001"
                    courseTitle={programTitle}
                    issuedAt={new Date().toISOString()}
                    scorePercent={92}
                    layout={config}
                    className="rounded-lg border border-white/10 shadow-lg"
                  />
                </div>
              </div>
            </div>
          ) : null}

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
