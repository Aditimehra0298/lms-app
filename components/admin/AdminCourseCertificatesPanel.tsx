"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Award, ExternalLink, Plus, Trash2 } from "lucide-react";
import type { CourseFinalExam, ManagedCourse } from "@/lib/content-schema";
import { patchCertificateConfig } from "@/lib/course-certificate-config";
import { describeRegistrationIdStorage } from "@/lib/registration-ids";
import AdminCourseCertificateApprovals from "@/components/admin/AdminCourseCertificateApprovals";
import AdminCourseTabShell, {
  AdminCourseSelectPrompt,
  AdminPanelSection,
  adminToggleRow,
} from "@/components/admin/AdminCourseTabShell";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-violet-500/35";

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
  const certEnabled = cfg.enabled !== false && (hero.certificate ?? "").trim().toLowerCase() !== "no";
  const provider = cfg.provider === "builtin" ? "builtin" : "n8n";
  const showDashboard = cfg.showInLearnerDashboard !== false;
  const requireApproval = cfg.requireAdminApproval === true;
  const autoVisible = !requireApproval && cfg.autoVisibleWhenReady !== false;
  const [mysqlCourseId, setMysqlCourseId] = useState<number | null>(null);

  useEffect(() => {
    const slug = workspaceCourseSlug || draft.slug;
    if (!slug) return;
    void fetch(`/api/courses/db?slug=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { ok?: boolean; course?: { courseIdentificationNumber?: number } }) => {
        if (data.ok && data.course?.courseIdentificationNumber != null) {
          setMysqlCourseId(data.course.courseIdentificationNumber);
        }
      })
      .catch(() => undefined);
  }, [workspaceCourseSlug, draft.slug]);
  const passScore = finalExam.passingScorePercent;
  const hasExam = Boolean(finalExam.examUploadUrl || finalExam.timedExam || passScore != null);
  const docs = cfg.supplementaryDocs ?? [];
  const template =
    cfg.templateImage?.trim() ||
    hero.certificatePreviewImage?.trim() ||
    "/certificates/haccp-certificate-template.jpg";

  const addDoc = () => {
    setDraft((d) =>
      patchCertificateConfig(d, {
        supplementaryDocs: [...(d.certificateConfig?.supplementaryDocs ?? []), { title: "Document", url: "" }],
      }),
    );
  };

  const updateDoc = (index: number, patch: { title?: string; url?: string }) => {
    setDraft((d) => {
      const next = [...(d.certificateConfig?.supplementaryDocs ?? [])];
      next[index] = { ...next[index], ...patch };
      return patchCertificateConfig(d, { supplementaryDocs: next });
    });
  };

  const removeDoc = (index: number) => {
    setDraft((d) =>
      patchCertificateConfig(d, {
        supplementaryDocs: (d.certificateConfig?.supplementaryDocs ?? []).filter((_, i) => i !== index),
      }),
    );
  };

  return (
    <AdminCourseTabShell
      courseTitle={draft.title}
      tabTitle="Certificate generation"
      description="Generate certificates via n8n (recommended) or built-in template. Control learner dashboard visibility and admin approval here."
      icon={<Award className="h-6 w-6 text-amber-300" aria-hidden />}
      onSave={onSave}
      saving={saving}
      saveLabel="Save certificate settings"
      aside={
        <AdminPanelSection title="MySQL IDs (course + learner)">
          <p className="text-[11px] text-gray-400">
            <strong className="text-gray-300">Course ID:</strong>{" "}
            {mysqlCourseId != null ? (
              <code className="text-amber-300">{mysqlCourseId}</code>
            ) : (
              <span className="text-gray-600">Save course in Admin to sync → lms_course</span>
            )}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{describeRegistrationIdStorage()}</p>
          <p className="mt-2 text-[11px] text-gray-500">
            n8n gets <code className="text-violet-300">course</code> + <code className="text-violet-300">registration</code> objects. See{" "}
            <code className="text-violet-300">docs/N8N_CERTIFICATE_STEPS.md</code> and{" "}
            <code className="text-violet-300">docs/COURSES_MYSQL.md</code>.
          </p>
          <a
            href="/certificates/verify"
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-[11px] font-medium text-violet-300 underline hover:text-violet-200"
          >
            Public verification page →
          </a>
        </AdminPanelSection>
      }
    >
      <AdminPanelSection title="Enable certificates & n8n" step={1}>
        <label className={adminToggleRow}>
          <span>
            <span className="font-medium text-white">Issue certificates for this course</span>
            <span className="mt-0.5 block text-[10px] text-gray-500">Triggers after learner passes exam</span>
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
        <label className={`${adminToggleRow} mt-3`}>
          <span>
            <span className="font-medium text-white">Provider: n8n workflow</span>
            <span className="mt-0.5 block text-[10px] text-gray-500">Off = built-in LMS template</span>
          </span>
          <input
            type="checkbox"
            checked={provider === "n8n"}
            onChange={(e) =>
              setDraft((d) =>
                patchCertificateConfig(d, { provider: e.target.checked ? "n8n" : "builtin" }),
              )
            }
            className="accent-violet-500"
          />
        </label>
        {provider === "n8n" ? (
          <label className="mt-3 block">
            <span className="text-[11px] text-gray-500">n8n webhook URL (optional — or use .env N8N_CERTIFICATE_WEBHOOK_URL)</span>
            <input
              value={cfg.n8nWebhookUrl ?? ""}
              onChange={(e) => setDraft((d) => patchCertificateConfig(d, { n8nWebhookUrl: e.target.value }))}
              placeholder="https://your-n8n.com/webhook/lms-certificate"
              className={`${fieldClass} font-mono text-[11px]`}
            />
          </label>
        ) : null}
      </AdminPanelSection>

      <AdminPanelSection title="Learner dashboard permissions" step={2}>
        <label className={adminToggleRow}>
          <span>
            <span className="font-medium text-white">Show on learner dashboard</span>
            <span className="mt-0.5 block text-[10px] text-gray-500">My Learning → Certificates tab</span>
          </span>
          <input
            type="checkbox"
            checked={showDashboard}
            onChange={(e) =>
              setDraft((d) => patchCertificateConfig(d, { showInLearnerDashboard: e.target.checked }))
            }
            className="accent-amber-500"
          />
        </label>
        <label className={`${adminToggleRow} mt-3`}>
          <span>
            <span className="font-medium text-white">Require admin approval before learners see PDF</span>
            <span className="mt-0.5 block text-[10px] text-gray-500">You approve in the list below after n8n finishes</span>
          </span>
          <input
            type="checkbox"
            checked={requireApproval}
            onChange={(e) =>
              setDraft((d) => patchCertificateConfig(d, { requireAdminApproval: e.target.checked }))
            }
            className="accent-rose-500"
          />
        </label>
        {!requireApproval ? (
          <label className={`${adminToggleRow} mt-3`}>
            <span>
              <span className="font-medium text-white">Auto-show when n8n marks ready</span>
            </span>
            <input
              type="checkbox"
              checked={autoVisible}
              onChange={(e) =>
                setDraft((d) => patchCertificateConfig(d, { autoVisibleWhenReady: e.target.checked }))
              }
              className="accent-emerald-500"
            />
          </label>
        ) : null}
        <AdminCourseCertificateApprovals courseSlug={workspaceCourseSlug || draft.slug} />
      </AdminPanelSection>

      <AdminPanelSection title="Template & badge (built-in only)" step={3}>
        <label className="block">
          <span className="text-[11px] text-gray-500">Certificate template image (background)</span>
          <input
            value={cfg.templateImage ?? ""}
            onChange={(e) => setDraft((d) => patchCertificateConfig(d, { templateImage: e.target.value }))}
            placeholder="/certificates/haccp-certificate-template.jpg"
            className={`${fieldClass} font-mono text-[12px]`}
          />
          <p className="mt-1 text-[10px] text-gray-600">
            Put your PDF/design export in <code className="text-violet-300">public/certificates/</code> (e.g. HACCP JPG).
          </p>
        </label>
        {template ? (
          <div className="relative mt-3 aspect-[297/210] max-w-md overflow-hidden rounded-lg border border-amber-500/25">
            <Image src={template} alt="Template preview" fill unoptimized className="object-cover" />
          </div>
        ) : null}
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-500">Badge image URL (optional — top-right on certificate)</span>
          <input
            value={cfg.badgeImage ?? ""}
            onChange={(e) => setDraft((d) => patchCertificateConfig(d, { badgeImage: e.target.value }))}
            placeholder="/certificates/sft-badge.png"
            className={fieldClass}
          />
        </label>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-500">Certificate title</span>
          <input
            value={cfg.title ?? hero.certificatePreviewLabel ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setDraft((d) =>
                patchCertificateConfig(updateHero(d, { certificatePreviewLabel: v }), { title: v }),
              );
            }}
            placeholder="Certificate of Attainment"
            className={fieldClass}
          />
        </label>
      </AdminPanelSection>

      <AdminPanelSection title="Text position on template (% from top)" step={4}>
        <p className="mb-3 text-[11px] text-gray-500">Tune where name, certificate number, and date appear on your design.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["nameTopPercent", "Learner name", 42],
              ["numberTopPercent", "Certificate number", 52],
              ["dateTopPercent", "Course / date block", 62],
            ] as const
          ).map(([key, label, defaultVal]) => (
            <label key={key} className="block">
              <span className="text-[11px] text-gray-500">{label}</span>
              <input
                type="number"
                min={0}
                max={100}
                value={cfg[key] ?? defaultVal}
                onChange={(e) =>
                  setDraft((d) =>
                    patchCertificateConfig(d, { [key]: Number(e.target.value) || defaultVal }),
                  )
                }
                className={fieldClass}
              />
            </label>
          ))}
        </div>
      </AdminPanelSection>

      <AdminPanelSection title="Extra documents (downloads with certificate)" step={5}>
        <p className="mb-3 text-[11px] text-gray-500">PDFs or links shown under the certificate (transcript, badge pack, etc.).</p>
        {docs.map((doc, index) => (
          <div key={index} className="mb-2 flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-black/25 p-2">
            <label className="min-w-[120px] flex-1">
              <span className="text-[10px] text-gray-500">Title</span>
              <input
                value={doc.title}
                onChange={(e) => updateDoc(index, { title: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="min-w-[160px] flex-[2]">
              <span className="text-[10px] text-gray-500">URL</span>
              <input
                value={doc.url}
                onChange={(e) => updateDoc(index, { url: e.target.value })}
                className={`${fieldClass} font-mono text-[11px]`}
              />
            </label>
            <button
              type="button"
              onClick={() => removeDoc(index)}
              className="rounded p-2 text-gray-500 hover:bg-rose-500/15 hover:text-rose-300"
              aria-label="Remove document"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addDoc}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add document
        </button>
      </AdminPanelSection>

      <AdminPanelSection title="Final exam (required to earn certificate)" step={6}>
        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-3 text-xs text-gray-300">
          <p>
            <span className="text-gray-500">Pass score:</span>{" "}
            {passScore != null ? `${passScore}%` : "Not set"}
          </p>
          <p className="mt-1">
            <span className="text-gray-500">Exam file:</span> {finalExam.examUploadUrl ? "Uploaded" : "None"}
          </p>
        </div>
        <button
          type="button"
          onClick={onGoCoreSection}
          className="mt-3 inline-flex items-center gap-1 rounded-lg bg-violet-600/20 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-600/30"
        >
          Configure on Core Section
          <ExternalLink className="h-3 w-3" aria-hidden />
        </button>
      </AdminPanelSection>
    </AdminCourseTabShell>
  );
}
