"use client";

import { Award } from "lucide-react";
import type { CourseFinalExam, ManagedCourse } from "@/lib/content-schema";
import { patchCertificateConfig } from "@/lib/course-certificate-config";
import AdminCourseCertificateApprovals from "@/components/admin/AdminCourseCertificateApprovals";
import AdminCertificateTemplatesEditor from "@/components/admin/AdminCertificateTemplatesEditor";
import AdminCourseTabShell, {
  AdminCourseSelectPrompt,
  AdminPanelSection,
  adminToggleRow,
} from "@/components/admin/AdminCourseTabShell";

type Props = {
  draft: ManagedCourse;
  setDraft: React.Dispatch<React.SetStateAction<ManagedCourse>>;
  workspaceCourseSlug: string;
  finalExam: CourseFinalExam;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onGoCourseInfo: () => void;
  onGoCoreSection: () => void;
};

function updateHero(
  draft: ManagedCourse,
  patch: Partial<NonNullable<ManagedCourse["hero"]>>,
): ManagedCourse {
  return { ...draft, hero: { ...(draft.hero ?? {}), ...patch } };
}

export default function AdminCourseCertificatesPanel({
  draft,
  setDraft,
  workspaceCourseSlug,
  finalExam,
  canEdit,
  saving,
  onSave,
  onGoCourseInfo,
  onGoCoreSection,
}: Props) {
  if (!canEdit) {
    return <AdminCourseSelectPrompt tabName="Certificates" onGoCourseInfo={onGoCourseInfo} />;
  }

  const hero = draft.hero ?? {};
  const cfg = draft.certificateConfig ?? {};
  const courseSlug = workspaceCourseSlug || draft.slug;
  const certEnabled = cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no";
  const passScore = finalExam.passingScorePercent;

  return (
    <AdminCourseTabShell
      courseTitle={draft.title}
      tabTitle="Certificates"
      description="Upload certificate design, badge, and transcript — then turn certificates on for this course."
      icon={<Award className="h-6 w-6 text-amber-300" aria-hidden />}
      onSave={onSave}
      saving={saving}
      saveLabel="Save course setting"
    >
      <AdminPanelSection title="Certificate design, badge & transcript (all courses)" step={1}>
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          Upload all <strong>3 files</strong> below. They apply to every course. When all 3 are uploaded, they
          save automatically. You can also use the left menu: <strong>Course Management → Certificates</strong>.
        </div>
        <AdminCertificateTemplatesEditor compact />
      </AdminPanelSection>

      <AdminPanelSection title="This course" step={2}>
        <label className={adminToggleRow}>
          <span>
            <span className="font-medium text-white">Give learners a certificate when they pass</span>
            <span className="mt-0.5 block text-[10px] text-gray-500">
              Course name, duration, mode, and learner details are filled automatically
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
        <p className="mt-3 text-[11px] text-gray-500">
          <strong className="text-gray-400">Changes per learner:</strong> candidate name, course name, duration,
          mode, issue date, SFT delegate number, certificate number, transcript grade &amp; training program.
        </p>
      </AdminPanelSection>

      {certEnabled ? (
        <AdminPanelSection title="Issued certificates for this course" step={3}>
          <AdminCourseCertificateApprovals courseSlug={courseSlug} />
        </AdminPanelSection>
      ) : null}

      <AdminPanelSection title="Final exam" step={certEnabled ? 4 : 3}>
        <p className="text-xs text-gray-400">
          Learners must pass the final exam to receive a certificate.
          {passScore != null ? (
            <>
              {" "}
              Pass score: <strong className="text-gray-200">{passScore}%</strong>.
            </>
          ) : (
            <> Pass score is not set yet.</>
          )}
        </p>
        <button
          type="button"
          onClick={onGoCoreSection}
          className="mt-3 rounded-lg bg-violet-600/20 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-600/30"
        >
          Set up exam in Core Section
        </button>
      </AdminPanelSection>
    </AdminCourseTabShell>
  );
}
