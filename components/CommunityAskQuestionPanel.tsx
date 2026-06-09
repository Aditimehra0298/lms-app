"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { qaApiHeaders } from "@/lib/course-qa-client";
import { readJsonResponse } from "@/lib/safe-json";

type Props = {
  slugs: string[];
  courseTitles: Record<string, string>;
  focusCourseSlug?: string | null;
  onSubmitted?: () => void;
};

const fieldLabel =
  "text-[10px] font-medium uppercase tracking-wide text-zinc-500";
const fieldInput =
  "mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 disabled:opacity-60";

export function CommunityAskQuestionPanel({
  slugs,
  courseTitles,
  focusCourseSlug,
  onSubmitted,
}: Props) {
  const initialSlug = useMemo(() => {
    if (focusCourseSlug && slugs.includes(focusCourseSlug)) return focusCourseSlug;
    return slugs[0] ?? "";
  }, [slugs, focusCourseSlug]);

  const [qaCourse, setQaCourse] = useState(initialSlug);
  const [module, setModule] = useState("General");
  const [moduleOptions, setModuleOptions] = useState<string[]>(["General"]);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingModules, setLoadingModules] = useState(false);

  useEffect(() => {
    if (initialSlug) setQaCourse(initialSlug);
  }, [initialSlug]);

  const loadModules = useCallback(async (slug: string) => {
    if (!slug) {
      setModuleOptions(["General"]);
      setModule("General");
      return;
    }
    setLoadingModules(true);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = await readJsonResponse(
        res,
        {} as { curriculum?: Array<{ title?: string }> | null },
      );
      const labels =
        data.curriculum?.map((m, i) => m.title?.trim() || `Module ${i + 1}`) ?? [];
      const options = ["General", ...labels];
      setModuleOptions(options);
      setModule(options[0] ?? "General");
    } catch {
      setModuleOptions(["General"]);
      setModule("General");
    } finally {
      setLoadingModules(false);
    }
  }, []);

  useEffect(() => {
    void loadModules(qaCourse);
  }, [qaCourse, loadModules]);

  const submit = async () => {
    setMessage(null);
    if (!qaCourse) {
      setMessage("Select a course.");
      return;
    }
    if (question.trim().length < 10) {
      setMessage("Write at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(qaCourse)}/qa`, {
        method: "POST",
        headers: qaApiHeaders(),
        body: JSON.stringify({ module, question: question.trim() }),
      });
      const data = await readJsonResponse(res, {} as { ok?: boolean; message?: string });
      if (!res.ok || !data.ok) {
        setMessage(data.message ?? "Could not submit your question.");
        return;
      }
      setQuestion("");
      setMessage(data.message ?? "Submitted — visible after review.");
      onSubmitted?.();
    } catch {
      setMessage("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!slugs.length) {
    return (
      <p className="text-sm text-zinc-500">Enroll in a course to ask questions.</p>
    );
  }

  const courseField = (
    <label className="block min-w-0">
      <span className={fieldLabel}>Course</span>
      <select
        value={qaCourse}
        onChange={(e) => setQaCourse(e.target.value)}
        disabled={submitting}
        className={fieldInput}
      >
        {slugs.map((slug) => (
          <option key={slug} value={slug}>
            {courseTitles[slug] ?? slug}
          </option>
        ))}
      </select>
    </label>
  );

  const moduleField = (
    <label className="block min-w-0">
      <span className={fieldLabel}>Module / topic</span>
      <select
        value={module}
        onChange={(e) => setModule(e.target.value)}
        disabled={loadingModules || submitting}
        className={fieldInput}
      >
        {moduleOptions.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );

  const questionField = (
    <label className="block min-w-0">
      <span className={fieldLabel}>Your question</span>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={3}
        placeholder="What would you like help with?"
        disabled={submitting}
        className={`${fieldInput} resize-none rounded-xl py-2.5`}
      />
    </label>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 flex-1 text-[11px] text-zinc-500">
        {message ? (
          <span className="text-violet-200">{message}</span>
        ) : (
          "Reviewed before posting · trainers & peers can reply"
        )}
      </p>
      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting || question.trim().length < 10}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-60"
      >
        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
        {submitting ? "Submitting…" : "Submit Question"}
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {courseField}
        {moduleField}
      </div>
      {questionField}
      <div className="pt-0.5">{footer}</div>
    </div>
  );
}
