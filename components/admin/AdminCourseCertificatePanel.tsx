"use client";

import { Award } from "lucide-react";
import type { CourseFinalExam, ManagedCourse } from "@/lib/content-schema";
import { getCertificateUploadStatus } from "@/lib/certificate-admin-status";
import AdminCourseCertificateSettings from "@/components/admin/AdminCourseCertificateSettings";
import AdminCourseTabShell, {
  AdminCourseSelectPrompt,
  AdminPanelSection,
} from "@/components/admin/AdminCourseTabShell";

type Props = {
  draft: ManagedCourse;
  setDraft: React.Dispatch<React.SetStateAction<ManagedCourse>>;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onGoCourseInfo: () => void;
  onGoContent: () => void;
  finalExam?: CourseFinalExam;
};

export default function AdminCourseCertificatePanel({
  draft,
  setDraft,
  canEdit,
  saving,
  onSave,
  onGoCourseInfo,
  onGoContent,
  finalExam,
}: Props) {
  if (!canEdit) {
    return <AdminCourseSelectPrompt tabName="Certificate" onGoCourseInfo={onGoCourseInfo} />;
  }

  const status = getCertificateUploadStatus(draft.certificateConfig, {
    heroCertificate: draft.hero?.certificate,
  });

  return (
    <AdminCourseTabShell
      courseTitle={draft.title}
      tabTitle="Certificate, badge & transcript"
      description="Upload a unique certificate sample, badge, and transcript for this course. Empty fields fall back to global defaults under Users & Access → Certificates."
      icon={<Award className="h-6 w-6 text-amber-300" aria-hidden />}
      onSave={onSave}
      saving={saving}
      saveLabel="Save certificate"
      aside={
        <AdminPanelSection title="Status">
          <p className="text-[11px] text-gray-400">
            Issuing:{" "}
            <strong className={status.enabled ? "text-emerald-300" : "text-gray-500"}>
              {status.enabled ? "On" : "Off"}
            </strong>
          </p>
          <p className="mt-2 text-[11px] text-gray-400">
            Uploads:{" "}
            <strong
              className={
                status.complete ? "text-emerald-300" : status.partial ? "text-amber-200" : "text-gray-400"
              }
            >
              {status.label}
            </strong>
          </p>
          <p className="mt-3 text-[10px] leading-relaxed text-gray-500">
            Same workflow as <strong className="text-gray-400">Tutor Led → Certificate</strong>. Learner name, number,
            and date are still personalized per person.
          </p>
        </AdminPanelSection>
      }
    >
      <AdminCourseCertificateSettings
        draft={draft}
        setDraft={setDraft}
        finalExam={finalExam}
        onGoContent={onGoContent}
      />
    </AdminCourseTabShell>
  );
}
