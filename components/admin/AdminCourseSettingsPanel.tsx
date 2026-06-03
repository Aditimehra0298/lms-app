"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import type { CourseFinalExam, ManagedCourse } from "@/lib/content-schema";
import AdminCourseCertificateSettings from "@/components/admin/AdminCourseCertificateSettings";
import AdminCourseTabShell, {
  AdminCourseSelectPrompt,
  AdminPanelSection,
  adminToggleRow,
} from "@/components/admin/AdminCourseTabShell";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/35";

type Props = {
  draft: ManagedCourse;
  setDraft: React.Dispatch<React.SetStateAction<ManagedCourse>>;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onGoCourseInfo: () => void;
  onGoContent?: () => void;
  finalExam?: CourseFinalExam;
};

function patchSettings(
  draft: ManagedCourse,
  patch: Partial<NonNullable<ManagedCourse["settings"]>>,
): ManagedCourse["settings"] {
  return { ...(draft.settings ?? {}), ...patch };
}

export default function AdminCourseSettingsPanel({
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
    return <AdminCourseSelectPrompt tabName="Settings" onGoCourseInfo={onGoCourseInfo} />;
  }

  const s = draft.settings ?? {};

  return (
    <AdminCourseTabShell
      courseTitle={draft.title}
      tabTitle="Course settings"
      description="Control who sees this course, whether learners can enroll, and what appears on the public course page. Changes apply after you save."
      icon={<Settings className="h-6 w-6 text-violet-300" aria-hidden />}
      onSave={onSave}
      saving={saving}
      saveLabel="Save settings"
      aside={
        <AdminPanelSection title="Quick guide">
          <ul className="space-y-2 text-[11px] leading-relaxed text-gray-400">
            <li>
              <strong className="text-gray-300">Published</strong> — use the Publish tab to go live on the site.
            </li>
            <li>
              <strong className="text-gray-300">Catalog</strong> — off hides the course from browse lists (direct link may still work if published).
            </li>
            <li>
              <strong className="text-gray-300">Enrollment</strong> — off keeps the page visible but blocks new purchases.
            </li>
          </ul>
        </AdminPanelSection>
      }
    >
      <AdminPanelSection title="Visibility & enrollment" step={1}>
        <div className="space-y-2">
          <label className={adminToggleRow}>
            <span>
              <span className="font-medium text-white">Show in course catalog</span>
              <span className="mt-0.5 block text-[10px] text-gray-500">Lists on /courses and home when published</span>
            </span>
            <input
              type="checkbox"
              checked={s.showInCatalog !== false}
              onChange={(e) =>
                setDraft((d) => ({ ...d, settings: patchSettings(d, { showInCatalog: e.target.checked }) }))
              }
              className="accent-violet-500"
            />
          </label>
          <label className={adminToggleRow}>
            <span>
              <span className="font-medium text-white">Enrollment open</span>
              <span className="mt-0.5 block text-[10px] text-gray-500">Learners can add to cart and checkout</span>
            </span>
            <input
              type="checkbox"
              checked={s.enrollmentOpen !== false}
              onChange={(e) =>
                setDraft((d) => ({ ...d, settings: patchSettings(d, { enrollmentOpen: e.target.checked }) }))
              }
              className="accent-emerald-500"
            />
          </label>
          <label className={adminToggleRow}>
            <span>
              <span className="font-medium text-white">Featured course</span>
              <span className="mt-0.5 block text-[10px] text-gray-500">Priority in recommended sections (when wired)</span>
            </span>
            <input
              type="checkbox"
              checked={!!s.featured}
              onChange={(e) =>
                setDraft((d) => ({ ...d, settings: patchSettings(d, { featured: e.target.checked }) }))
              }
              className="accent-amber-500"
            />
          </label>
        </div>
      </AdminPanelSection>

      <AdminPanelSection title="Learner experience" step={2}>
        <label className={adminToggleRow}>
          <span>
            <span className="font-medium text-white">Q&amp;A tab on course page</span>
            <span className="mt-0.5 block text-[10px] text-gray-500">Let learners ask questions before enrolling</span>
          </span>
          <input
            type="checkbox"
            checked={s.allowQa !== false}
            onChange={(e) =>
              setDraft((d) => ({ ...d, settings: patchSettings(d, { allowQa: e.target.checked }) }))
            }
            className="accent-violet-500"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-[11px] text-gray-500">Access period label</span>
          <input
            value={s.accessLabel ?? draft.hero?.access ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setDraft((d) => ({
                ...d,
                settings: patchSettings(d, { accessLabel: v }),
                hero: { ...(d.hero ?? {}), access: v },
              }));
            }}
            placeholder="Lifetime access"
            className={fieldClass}
          />
          <p className="mt-1 text-[10px] text-gray-600">Shown on the course hero and sidebar (e.g. Lifetime, 12 months).</p>
        </label>
      </AdminPanelSection>

      <AdminCourseCertificateSettings
        draft={draft}
        setDraft={setDraft}
        finalExam={finalExam}
        onGoContent={onGoContent ?? onGoCourseInfo}
      />

      <AdminPanelSection title="Related admin areas" step={4}>
        <p className="text-[11px] text-gray-500">
          Certificate templates: <strong className="text-gray-400">Users &amp; Access → Certificates</strong> (one
          design for all courses). Other tabs:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["Content", "Pricing", "SEO", "Publish"] as const).map((tab) => (
            <span
              key={tab}
              className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-gray-400"
            >
              {tab}
            </span>
          ))}
        </div>
        {draft.slug ? (
          <p className="mt-3 text-[11px] text-gray-500">
            Public URL:{" "}
            <Link
              href={`/courses/${draft.slug}`}
              target="_blank"
              className="font-mono text-violet-300 underline hover:text-violet-200"
            >
              /courses/{draft.slug}
            </Link>
          </p>
        ) : null}
      </AdminPanelSection>
    </AdminCourseTabShell>
  );
}
