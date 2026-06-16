"use client";

import type { CourseFinalExam, ManagedCourse } from "@/lib/content-schema";
import { patchCertificateConfig } from "@/lib/course-certificate-config";
import { AdminProgramCertificateAssetsEditor } from "@/components/admin/AdminProgramCertificateAssetsEditor";

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

export default function AdminCourseCertificateSettings({
  draft,
  setDraft,
  finalExam,
  onGoContent,
}: Props) {
  const hero = draft.hero ?? {};
  const cfg = draft.certificateConfig ?? {};
  const certEnabled = cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no";

  return (
    <AdminProgramCertificateAssetsEditor
      programLabel="course"
      programTitle={draft.title}
      certificateEnabled={certEnabled}
      onCertificateEnabledChange={(on) => {
        setDraft((d) =>
          patchCertificateConfig(updateHero(d, { certificate: on ? "Yes" : "No" }), { enabled: on }),
        );
      }}
      config={cfg}
      onPatch={(patch) => setDraft((d) => patchCertificateConfig(d, patch))}
      finalExamPassScore={finalExam?.passingScorePercent}
      onGoContent={onGoContent}
    />
  );
}
