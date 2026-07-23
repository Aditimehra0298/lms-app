"use client";

import type { Dispatch, SetStateAction } from "react";
import { Wrench } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import AdminCourseLearningToolsEditor from "@/components/admin/AdminCourseLearningToolsEditor";
import AdminCourseTabShell, {
  AdminCourseSelectPrompt,
  AdminPanelSection,
} from "@/components/admin/AdminCourseTabShell";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/35";

type Props = {
  draft: ManagedCourse;
  setDraft: Dispatch<SetStateAction<ManagedCourse>>;
  canEdit: boolean;
  saving: boolean;
  onSave: () => void;
  onGoCourseInfo: () => void;
};

export default function AdminCourseLearningToolsPanel({
  draft,
  setDraft,
  canEdit,
  saving,
  onSave,
  onGoCourseInfo,
}: Props) {
  if (!canEdit) {
    return <AdminCourseSelectPrompt tabName="Learning Tools" onGoCourseInfo={onGoCourseInfo} />;
  }

  return (
    <AdminCourseTabShell
      courseTitle={draft.title}
      tabTitle="Learning Tools"
      description="Upload course-wide materials learners see in My Learning — E-Workbook, Transcript, PPT, Podcast, and Additional Resources. Same for every module."
      icon={<Wrench className="h-6 w-6 text-amber-300" aria-hidden />}
      onSave={onSave}
      saving={saving}
      saveLabel="Save learning tools"
      aside={
        <AdminPanelSection title="Quick guide">
          <ul className="space-y-2 text-[11px] leading-relaxed text-gray-400">
            <li>
              These tools apply to the <strong className="text-gray-300">whole course</strong>, not one lesson.
            </li>
            <li>
              Learners open them under <strong className="text-gray-300">LEARNING TOOLS</strong> on the player page.
            </li>
            <li>Upload a file or paste a URL, then click Save learning tools.</li>
          </ul>
        </AdminPanelSection>
      }
    >
      <AdminPanelSection title="Labels" step={1}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] text-gray-500">Section title</span>
            <input
              value={draft.learningSection?.learningToolsTitle ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  learningSection: {
                    ...(d.learningSection ?? {}),
                    learningToolsTitle: e.target.value,
                  },
                }))
              }
              className={fieldClass}
              placeholder="Course Learning tools"
            />
          </label>
          <label className="block">
            <span className="text-[10px] text-gray-500">Hint under title</span>
            <input
              value={draft.learningSection?.learningToolsHint ?? ""}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  learningSection: {
                    ...(d.learningSection ?? {}),
                    learningToolsHint: e.target.value,
                  },
                }))
              }
              className={fieldClass}
              placeholder="Course materials — same for every module"
            />
          </label>
        </div>
      </AdminPanelSection>

      <AdminPanelSection title="Files & links" step={2}>
        <AdminCourseLearningToolsEditor draft={draft} setDraft={setDraft} fieldClass={fieldClass} />
      </AdminPanelSection>
    </AdminCourseTabShell>
  );
}
