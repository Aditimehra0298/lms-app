"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import { getCurriculumForCourse } from "@/lib/course-detail-template";
import { qaApiHeaders } from "@/lib/course-qa-client";

type Props = {
  open: boolean;
  course: ManagedCourse;
  onClose: () => void;
  onSubmitted: (message: string) => void;
};

export default function AskQuestionModal({ open, course, onClose, onSubmitted }: Props) {
  const [module, setModule] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const moduleOptions = useMemo(() => {
    const mods = getCurriculumForCourse(
      course.slug,
      course.category,
      course.title,
      course.curriculum,
    );
    const labels = mods.map((m, i) => m.title?.trim() || `Module ${i + 1}`);
    return ["General", ...labels];
  }, [course]);

  useEffect(() => {
    if (!open) return;
    setModule(moduleOptions[0] ?? "General");
    setQuestion("");
    setError(null);
  }, [open, moduleOptions]);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.slug)}/qa`, {
        method: "POST",
        headers: qaApiHeaders(),
        body: JSON.stringify({ module, question }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not submit your question.");
        return;
      }
      onSubmitted(data.message ?? "Question submitted for review.");
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="ask-question-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="ask-question-title" className="text-lg font-bold text-white">
              Ask a question
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Questions are reviewed by our team before they appear for others to answer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block text-xs font-semibold text-zinc-400">
          Module
          <select
            value={module}
            onChange={(e) => setModule(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
          >
            {moduleOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-xs font-semibold text-zinc-400">
          Your question
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={5}
            placeholder="What would you like help with?"
            className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/50"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || question.trim().length < 10}
            onClick={() => void submit()}
            className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      </div>
    </div>
  );
}
