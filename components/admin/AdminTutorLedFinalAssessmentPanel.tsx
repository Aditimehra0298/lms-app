"use client";

import { useState } from "react";
import { ClipboardList, Upload } from "lucide-react";
import AdminExamImageOptionsBuilder from "@/components/admin/AdminExamImageOptionsBuilder";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import type { TutorLedLearnerSection } from "@/lib/tutor-led-learner-section";

const EXAM_FILE_ACCEPT =
  ".pdf,.doc,.docx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/csv";

const field =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40";

type Props = {
  draft: TutorLedProgramStored;
  setDraft: React.Dispatch<React.SetStateAction<TutorLedProgramStored | null>>;
};

function uploadExamFile(file: File, courseSlug?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    if (courseSlug?.trim()) fd.append("courseSlug", courseSlug.trim());
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { url?: string; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url);
        else reject(new Error(data.error ?? `Upload failed (HTTP ${xhr.status})`));
      } catch {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(fd);
  });
}

export function AdminTutorLedFinalAssessmentPanel({ draft, setDraft }: Props) {
  const ls = draft.learnerSection ?? {};
  const [examSource, setExamSource] = useState<"upload" | "url">(
    ls.examUploadUrl?.trim() ? "url" : "upload",
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (next: Partial<TutorLedLearnerSection>) => {
    setDraft({ ...draft, learnerSection: { ...ls, ...next } });
  };

  const timed = ls.examTimed !== false;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
        <div className="flex items-center gap-2 text-amber-100">
          <ClipboardList className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Final assessment</h3>
        </div>
        <p className="mt-1 text-xs text-amber-100/80">
          Same controls as a self-paced module exam: timer, passing score, and CSV / PDF paper.
          Learners open it from My Learning after the live days are complete. Save the program to keep this.
        </p>
      </div>

      <label className="block">
        <span className="text-[11px] text-gray-500">Assessment title</span>
        <input
          value={ls.finalExamTitle ?? ""}
          onChange={(e) => patch({ finalExamTitle: e.target.value })}
          placeholder="Final Certification Assessment"
          className={field}
        />
      </label>
      <label className="block">
        <span className="text-[11px] text-gray-500">Description shown to the learner</span>
        <textarea
          value={ls.finalExamDescription ?? ""}
          onChange={(e) => patch({ finalExamDescription: e.target.value })}
          rows={3}
          className={field}
          placeholder="Complete the final exam to earn your certificate."
        />
      </label>

      <div className="space-y-3 rounded-xl border border-amber-500/25 bg-[#0d1528] p-4">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-gray-200">
          <span>Timed exam</span>
          <input
            type="checkbox"
            checked={timed}
            onChange={(e) =>
              patch({
                examTimed: e.target.checked,
                ...(e.target.checked ? {} : { examMinutes: undefined }),
              })
            }
            className="accent-amber-500"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-[11px] text-gray-500">Duration (minutes)</span>
            <input
              type="number"
              min={1}
              disabled={!timed}
              value={ls.examMinutes ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                patch({ examMinutes: v === "" ? undefined : Math.max(1, Number(v) || 1) });
              }}
              placeholder="60"
              className={`${field} disabled:opacity-40`}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-gray-500">Passing score (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={ls.examPassingScore ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                patch({
                  examPassingScore:
                    v === "" ? undefined : Math.min(100, Math.max(0, Math.round(Number(v) || 0))),
                });
              }}
              placeholder="70"
              className={field}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-gray-500">Question count (display)</span>
            <input
              type="number"
              min={1}
              value={ls.examQuestions ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                patch({ examQuestions: v === "" ? undefined : Math.max(1, Number(v) || 1) });
              }}
              placeholder="50"
              className={field}
            />
          </label>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0a1120] p-3">
          <p className="mb-2 text-[11px] font-medium text-amber-100">Exam paper / attachment</p>
          <AdminExamImageOptionsBuilder
            courseSlug={draft.slug}
            existingExamUploadUrl={ls.examUploadUrl}
            uploadExamFile={uploadExamFile}
            onExamSaved={(url) => {
              patch({ examUploadUrl: url });
              setExamSource("upload");
              setError(null);
            }}
          />
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <label className="inline-flex cursor-pointer items-center gap-2 text-gray-200">
              <input
                type="radio"
                name={`exam-src-${draft.slug}`}
                checked={examSource === "upload"}
                onChange={() => setExamSource("upload")}
                className="accent-amber-500"
              />
              Upload
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-gray-200">
              <input
                type="radio"
                name={`exam-src-${draft.slug}`}
                checked={examSource === "url"}
                onChange={() => setExamSource("url")}
                className="accent-amber-500"
              />
              URL
            </label>
          </div>
          <div className="mt-2 space-y-2">
            {examSource === "upload" ? (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-400/55 bg-amber-600/20 py-2 text-xs text-amber-50 hover:bg-amber-500/30">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Upload exam file (PDF / Word / CSV)"}
                <input
                  type="file"
                  accept={EXAM_FILE_ACCEPT}
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    setError(null);
                    void uploadExamFile(file, draft.slug)
                      .then((url) => patch({ examUploadUrl: url }))
                      .catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : "Exam upload failed."),
                      )
                      .finally(() => {
                        setUploading(false);
                        e.target.value = "";
                      });
                  }}
                />
              </label>
            ) : (
              <input
                value={ls.examUploadUrl ?? ""}
                onChange={(e) => patch({ examUploadUrl: e.target.value })}
                placeholder="/uploads/admin/final-exam.csv"
                className={field}
              />
            )}
            {ls.examUploadUrl ? (
              <p className="truncate text-[10px] text-gray-400">
                Attached: <span className="text-amber-100">{ls.examUploadUrl}</span>
                <button
                  type="button"
                  onClick={() => patch({ examUploadUrl: "" })}
                  className="ml-2 text-rose-300 hover:text-rose-200"
                >
                  Clear
                </button>
              </p>
            ) : (
              <p className="text-[10px] text-gray-500">No paper yet. Upload a CSV so learners can start the exam.</p>
            )}
            {error ? <p className="text-[10px] text-rose-300">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
