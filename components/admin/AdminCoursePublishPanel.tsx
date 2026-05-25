"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Globe, Rocket } from "lucide-react";
import type { CourseCurriculumModule, ManagedCourse } from "@/lib/content-schema";
import { publishChecklist, publishReady } from "@/lib/course-workspace-panels";
import AdminCourseTabShell, {
  AdminCourseSelectPrompt,
  AdminPanelSection,
} from "@/components/admin/AdminCourseTabShell";

type Props = {
  draft: ManagedCourse;
  setDraft: React.Dispatch<React.SetStateAction<ManagedCourse>>;
  modules: CourseCurriculumModule[];
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onGoCourseInfo: () => void;
};

export default function AdminCoursePublishPanel({
  draft,
  setDraft,
  modules,
  canEdit,
  saving,
  onSave,
  onGoCourseInfo,
}: Props) {
  if (!canEdit) {
    return <AdminCourseSelectPrompt tabName="Publish" onGoCourseInfo={onGoCourseInfo} />;
  }

  const checks = publishChecklist(draft, modules);
  const ready = publishReady(checks);
  const publicUrl = draft.slug?.trim() ? `/courses/${draft.slug.trim()}` : null;

  return (
    <AdminCourseTabShell
      courseTitle={draft.title}
      tabTitle="Publish course"
      description="Review the checklist, then turn on Published to make this self-paced course visible on the website. Save after changing status."
      icon={<Rocket className="h-6 w-6 text-emerald-300" aria-hidden />}
      onSave={onSave}
      saving={saving}
      saveLabel={draft.published ? "Save & keep live" : "Save draft"}
      aside={
        <AdminPanelSection title="Status">
          <div
            className={`rounded-xl border px-4 py-4 text-center ${
              draft.published
                ? "border-emerald-500/35 bg-emerald-500/10"
                : "border-amber-500/35 bg-amber-500/10"
            }`}
          >
            <p className={`text-lg font-bold ${draft.published ? "text-emerald-200" : "text-amber-200"}`}>
              {draft.published ? "Live on site" : "Draft — hidden"}
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              {draft.published
                ? "Learners can find this course when catalog settings allow."
                : "Not visible in the public catalog until you publish."}
            </p>
          </div>
          {publicUrl && draft.published ? (
            <Link
              href={publicUrl}
              target="_blank"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
            >
              <Globe className="h-4 w-4" aria-hidden />
              View live course page
            </Link>
          ) : null}
        </AdminPanelSection>
      }
    >
      <AdminPanelSection title="Go live" step={1}>
        <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-4">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))}
            className="mt-1 h-5 w-5 shrink-0 rounded accent-emerald-500"
          />
          <span>
            <span className="text-sm font-semibold text-white">Published on website</span>
            <span className="mt-1 block text-xs leading-relaxed text-gray-400">
              When checked, the course appears in the catalog (if Settings → Show in catalog is on). Uncheck to hide
              without deleting content.
            </span>
          </span>
        </label>
      </AdminPanelSection>

      <AdminPanelSection title="Pre-publish checklist" step={2}>
        <p className="mb-3 text-[11px] text-gray-500">
          {ready
            ? "All required items look good. You can publish safely."
            : "Complete the items below before going live."}
        </p>
        <ul className="space-y-2">
          {checks.map((item) => (
            <li
              key={item.id}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                item.ok
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-100/90"
                  : "border-white/10 bg-black/20 text-gray-400"
              }`}
            >
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-600" aria-hidden />
              )}
              <span>
                <span className="font-medium text-gray-200">{item.label}</span>
                {!item.ok && item.hint ? (
                  <span className="mt-0.5 block text-[10px] text-gray-500">{item.hint}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </AdminPanelSection>

      <AdminPanelSection title="After publishing" step={3}>
        <ul className="list-inside list-disc space-y-1 text-[11px] text-gray-500">
          <li>Test checkout while logged in as a learner (Students tab lists enrollments).</li>
          <li>Set regional prices on the Pricing tab.</li>
          <li>Review SEO preview on the SEO tab.</li>
        </ul>
      </AdminPanelSection>
    </AdminCourseTabShell>
  );
}
