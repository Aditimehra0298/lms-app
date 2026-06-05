"use client";

import { useState } from "react";
import type { CourseFinalExam, ManagedCourse } from "@/lib/content-schema";
import { patchCertificateConfig } from "@/lib/course-certificate-config";
import { AdminPanelSection, adminToggleRow } from "@/components/admin/AdminCourseTabShell";
import AdminCertificateFileUpload from "@/components/admin/AdminCertificateFileUpload";

type Props = {
  draft: ManagedCourse;
  setDraft: React.Dispatch<React.SetStateAction<ManagedCourse>>;
  finalExam?: CourseFinalExam;
  onGoContent: () => void;
};

function updateHero(
  draft: ManagedCourse,
  patch: Partial<NonNullable<ManagedCourse["hero"]>>,
): ManagedCourse {
  return { ...draft, hero: { ...(draft.hero ?? {}), ...patch } };
}

async function uploadAdminFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url;
}

/** Per-course certificate on/off and course badge — template/transcript stay global. */
export default function AdminCourseCertificateSettings({
  draft,
  setDraft,
  finalExam,
  onGoContent,
}: Props) {
  const hero = draft.hero ?? {};
  const cfg = draft.certificateConfig ?? {};
  const certEnabled = cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no";
  const passScore = finalExam?.passingScorePercent;
  const [uploadingBadge, setUploadingBadge] = useState(false);
  const [badgeError, setBadgeError] = useState("");

  const onBadgeUpload = async (file: File) => {
    setBadgeError("");
    setUploadingBadge(true);
    try {
      const url = await uploadAdminFile(file);
      setDraft((d) => patchCertificateConfig(d, { badgeImage: url }));
    } catch (e) {
      setBadgeError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingBadge(false);
    }
  };

  return (
    <AdminPanelSection title="Certificate for this course" step={3}>
      <p className="mb-3 text-[11px] text-violet-200/90">
        Certificate <strong className="text-violet-100">background and transcript</strong> are shared across
        courses (Admin → Certificates). Upload a <strong className="text-violet-100">course badge</strong> here —
        it is the <strong className="text-violet-100">same for every learner</strong> on this course. Only the
        issued certificate PDF changes per person (name, number, date).
      </p>
      <label className={adminToggleRow}>
        <span>
          <span className="font-medium text-white">Issue a certificate when the learner passes the final exam</span>
          <span className="mt-0.5 block text-[10px] text-gray-500">
            Personalized certificate PDF; badge image below stays fixed for this course
          </span>
        </span>
        <input
          type="checkbox"
          checked={certEnabled}
          onChange={(e) => {
            const on = e.target.checked;
            setDraft((d) =>
              patchCertificateConfig(updateHero(d, { certificate: on ? "Yes" : "No" }), { enabled: on }),
            );
          }}
          className="accent-amber-500"
        />
      </label>
      {certEnabled ? (
        <>
          <p className="mt-3 text-xs text-gray-400">
            Final exam required.
            {passScore != null ? (
              <>
                {" "}
                Pass score: <strong className="text-gray-200">{passScore}%</strong>.
              </>
            ) : (
              <> Set pass score in Content.</>
            )}
            <button
              type="button"
              onClick={onGoContent}
              className="ml-2 rounded-lg bg-violet-600/20 px-2.5 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-600/30"
            >
              Open Content
            </button>
          </p>
          <div className="mt-4 max-w-md">
            <AdminCertificateFileUpload
              label="Course badge"
              hint="Circular badge for this course only (e.g. Cyber Security certified). All learners see the same badge; certificates stay personalized."
              uploaded={Boolean(cfg.badgeImage?.trim())}
              previewUrl={cfg.badgeImage}
              accept="image/jpeg,image/png,image/webp,image/gif"
              kind="image"
              previewShape="circle"
              uploading={uploadingBadge}
              error={badgeError}
              onUpload={onBadgeUpload}
            />
            {cfg.badgeImage?.trim() ? (
              <button
                type="button"
                onClick={() => setDraft((d) => patchCertificateConfig(d, { badgeImage: undefined }))}
                className="mt-2 text-[11px] text-gray-500 underline hover:text-gray-300"
              >
                Remove course badge (use global default)
              </button>
            ) : (
              <p className="mt-2 text-[10px] text-gray-500">
                No course badge set — falls back to the global badge under Users &amp; Access → Certificates.
              </p>
            )}
          </div>
        </>
      ) : null}
    </AdminPanelSection>
  );
}
