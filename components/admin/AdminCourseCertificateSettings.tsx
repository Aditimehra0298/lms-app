"use client";

import type { CourseFinalExam, ManagedCourse } from "@/lib/content-schema";
import { patchCertificateConfig } from "@/lib/course-certificate-config";
import { AdminPanelSection, adminToggleRow } from "@/components/admin/AdminCourseTabShell";

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

/** Per-course certificate on/off only — design is global (Users & Access → Certificates). */
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

  return (
    <AdminPanelSection title="Certificate for this course" step={3}>
      <p className="mb-3 text-[11px] text-violet-200/90">
        Certificate <strong className="text-violet-100">design is the same for every course</strong>. Upload or
        change templates under <strong>Users &amp; Access → Certificates</strong> only.
      </p>
      <label className={adminToggleRow}>
        <span>
          <span className="font-medium text-white">Issue a certificate when the learner passes the final exam</span>
          <span className="mt-0.5 block text-[10px] text-gray-500">
            Uses the shared template; only this learner&apos;s name, email, phone, and numbers change
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
      ) : null}
    </AdminPanelSection>
  );
}
