"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Loader2, Upload } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import {
  COURSE_LEARNING_TOOL_DEFS,
  type CourseLearningToolKey,
  type CourseLearningTools,
} from "@/lib/course-learning-tools";

type Props = {
  draft: ManagedCourse;
  setDraft: Dispatch<SetStateAction<ManagedCourse>>;
  fieldClass: string;
};

async function uploadAdminFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url;
}

function patchCourseTools(
  setDraft: Dispatch<SetStateAction<ManagedCourse>>,
  patch: Partial<CourseLearningTools>,
) {
  setDraft((d) => ({
    ...d,
    learningSection: {
      ...(d.learningSection ?? {}),
      courseTools: { ...(d.learningSection?.courseTools ?? {}), ...patch },
    },
  }));
}

export default function AdminCourseLearningToolsEditor({ draft, setDraft, fieldClass }: Props) {
  const tools = draft.learningSection?.courseTools ?? {};
  const [uploading, setUploading] = useState<CourseLearningToolKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onUpload = async (key: CourseLearningToolKey, file: File) => {
    const def = COURSE_LEARNING_TOOL_DEFS.find((t) => t.key === key);
    if (!def) return;
    setUploading(key);
    setError(null);
    try {
      const url = await uploadAdminFile(file);
      patchCourseTools(setDraft, { [def.field]: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3">
      <div>
        <p className="text-sm font-semibold text-amber-100">Course learning tools</p>
        <p className="mt-0.5 text-[10px] text-gray-500">
          Same for the <strong className="text-gray-300">whole course</strong> — not per module. Learners see:
          E-Workbook, Transcript, PPT, Podcast, Additional Resources.
        </p>
      </div>
      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-100">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {COURSE_LEARNING_TOOL_DEFS.map((tool) => {
          const Icon = tool.icon;
          const value = tools[tool.field] ?? "";
          const busy = uploading === tool.key;
          return (
            <div key={tool.key} className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-amber-200" aria-hidden />
                <span className="text-xs font-semibold text-white">{tool.label}</span>
              </div>
              <p className="mt-1 text-[10px] text-gray-500">{tool.hint}</p>
              <input
                value={value}
                onChange={(e) => {
                  const next = e.target.value;
                  if (tool.key === "webhook") {
                    const trimmed = next.trim();
                    // Auto-add https:// when user pastes a bare domain (after they finish a space/blur is better — keep raw while typing)
                    patchCourseTools(setDraft, { [tool.field]: next });
                    return;
                  }
                  patchCourseTools(setDraft, { [tool.field]: next });
                }}
                onBlur={(e) => {
                  if (tool.key !== "webhook") return;
                  const raw = e.target.value.trim();
                  if (!raw) return;
                  let next = raw;
                  if (!/^https?:\/\//i.test(next) && !next.startsWith("/")) {
                    if (/^\/\//.test(next)) next = `https:${next}`;
                    else if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(next)) next = `https://${next}`;
                  }
                  if (next !== raw) {
                    patchCourseTools(setDraft, { [tool.field]: next });
                  }
                }}
                className={`${fieldClass} mt-2 font-mono text-[11px]`}
                placeholder={
                  tool.key === "webhook" ? "https://… or upload a file below" : "/api/media/serve/…"
                }
              />
              {tool.key === "webhook" ? (
                <p className="mt-1.5 text-[10px] text-gray-500">
                  Paste a link or upload a file. Learners see this as{" "}
                  <strong className="text-gray-300">Additional Resources</strong> — they can Open or Download.
                </p>
              ) : null}
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-violet-400/35 bg-violet-500/[0.07] px-3 py-2 text-[11px] font-semibold text-violet-100 hover:bg-violet-500/15">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {busy ? "Uploading…" : "Upload file"}
                  <input
                    type="file"
                    className="hidden"
                    accept={tool.accept}
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void onUpload(tool.key, f);
                    }}
                  />
                </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
