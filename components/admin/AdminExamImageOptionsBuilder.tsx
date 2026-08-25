"use client";

import { useCallback, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import {
  serializeExamCsv,
  type ExamOption,
  type ParsedExamQuestion,
} from "@/lib/exam-csv-parse";
import { uploadAdminImageFile } from "@/lib/admin-upload-image";

type Props = {
  courseSlug?: string;
  /** Current exam CSV URL — loaded so your question series is kept. */
  existingExamUploadUrl?: string;
  onExamSaved: (examUploadUrl: string) => void;
  uploadExamFile: (file: File, courseSlug?: string) => Promise<string>;
};

type DraftOption = ExamOption & { id: string };
type DraftQuestion = {
  id: string;
  question: string;
  questionImageUrl?: string;
  options: DraftOption[];
  correctIndex: number;
};

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function blankOption(): DraftOption {
  return { id: newId(), text: "", imageUrl: undefined };
}

function blankQuestion(): DraftQuestion {
  return {
    id: newId(),
    question: "",
    questionImageUrl: undefined,
    options: [blankOption(), blankOption(), blankOption(), blankOption()],
    correctIndex: 0,
  };
}

function toDraft(questions: ParsedExamQuestion[]): DraftQuestion[] {
  return questions.map((q) => ({
    id: newId(),
    question: q.question,
    questionImageUrl: q.questionImageUrl,
    correctIndex: q.correctIndex,
    options: q.options.map((o) => ({
      id: newId(),
      text: o.text ?? "",
      imageUrl: o.imageUrl,
    })),
  }));
}

export default function AdminExamImageOptionsBuilder({
  courseSlug,
  existingExamUploadUrl,
  onExamSaved,
  uploadExamFile,
}: Props) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [loadedFromExisting, setLoadedFromExisting] = useState(false);

  const openBuilder = useCallback(async () => {
    setOpen(true);
    setError(null);
    setOkMessage(null);
    setLoadedFromExisting(false);

    const url = existingExamUploadUrl?.trim();
    if (!url) {
      setQuestions([blankQuestion()]);
      return;
    }

    setLoadingExisting(true);
    try {
      const res = await fetch(
        `/api/admin/exam-questions?url=${encodeURIComponent(url)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        questions?: ParsedExamQuestion[];
        message?: string;
      };
      if (data.ok && data.questions && data.questions.length > 0) {
        setQuestions(toDraft(data.questions));
        setLoadedFromExisting(true);
        setOkMessage(
          `Loaded all ${data.questions.length} existing question(s). Images are optional — add only on 2–3 if you want.`,
        );
      } else {
        setQuestions([blankQuestion()]);
        setError(
          data.message ??
            "Could not load the current quiz CSV. You can still build a new one — your old file stays until you save.",
        );
      }
    } catch {
      setQuestions([blankQuestion()]);
      setError("Could not load the current quiz. Your existing file is unchanged until you save.");
    } finally {
      setLoadingExisting(false);
    }
  }, [existingExamUploadUrl]);

  const updateQuestion = (qid: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
  };

  const updateOption = (qid: string, oid: string, patch: Partial<DraftOption>) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id !== qid
          ? q
          : {
              ...q,
              options: q.options.map((o) => (o.id === oid ? { ...o, ...patch } : o)),
            },
      ),
    );
  };

  const uploadImage = async (key: string, file: File, apply: (url: string) => void) => {
    setUploadingKey(key);
    setError(null);
    try {
      const url = await uploadAdminImageFile(file);
      apply(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingKey(null);
    }
  };

  const saveAsExamCsv = async () => {
    setError(null);
    setOkMessage(null);

    const parsed: ParsedExamQuestion[] = [];
    for (const q of questions) {
      const stem = q.question.trim();
      if (!stem) {
        setError("Each question needs question text.");
        return;
      }
      const options = q.options
        .map((o) => ({ text: o.text.trim(), imageUrl: o.imageUrl?.trim() || undefined }))
        .filter((o) => o.text || o.imageUrl);
      if (options.length < 2) {
        setError("Each question needs at least 2 options (text is enough — images optional).");
        return;
      }
      if (q.correctIndex < 0 || q.correctIndex >= options.length) {
        setError("Pick a valid correct option for each question.");
        return;
      }
      parsed.push({
        question: stem,
        questionImageUrl: q.questionImageUrl?.trim() || undefined,
        options,
        correctIndex: q.correctIndex,
      });
    }

    if (parsed.length === 0) {
      setError("Add at least one question.");
      return;
    }

    setSaving(true);
    try {
      const csv = serializeExamCsv(parsed);
      const file = new File([csv], `exam-image-options-${Date.now()}.csv`, {
        type: "text/csv",
      });
      const url = await uploadExamFile(file, courseSlug);
      onExamSaved(url);
      setOkMessage(
        `Saved all ${parsed.length} question(s). Text questions stay as they are; images only where you added them.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save exam CSV.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => void openBuilder()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-400/45 bg-sky-500/15 py-2 text-xs font-medium text-sky-50 hover:bg-sky-500/25"
      >
        <ImagePlus className="h-3.5 w-3.5" />
        {existingExamUploadUrl?.trim()
          ? "Add optional images to this quiz"
          : "Build quiz (images optional)"}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-sky-400/30 bg-[#071018] p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold text-sky-100">
            Quiz images — optional, not required
          </p>
          <p className="mt-0.5 text-[10px] text-gray-400">
            Your full question series is kept. Skip image on most questions; add images only on
            the 2–3 you want. Text-only options are fine.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-gray-400 hover:text-gray-200"
        >
          Close
        </button>
      </div>

      {loadingExisting ? (
        <p className="inline-flex items-center gap-2 text-[11px] text-sky-200">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading your existing questions…
        </p>
      ) : null}

      {!loadingExisting && loadedFromExisting ? (
        <p className="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-2 py-1.5 text-[10px] text-emerald-100">
          Existing quiz loaded — {questions.length} question(s). Leave images empty where you
          don’t need them.
        </p>
      ) : null}

      {!loadingExisting
        ? questions.map((q, qi) => (
            <div key={q.id} className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-gray-200">Question {qi + 1}</p>
                {questions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                    className="inline-flex items-center gap-1 text-[10px] text-rose-300 hover:text-rose-200"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                ) : null}
              </div>

              <textarea
                value={q.question}
                onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                rows={2}
                placeholder="Question text…"
                className="w-full resize-y rounded-md border border-white/10 bg-black/40 px-2.5 py-2 text-xs outline-none focus:border-sky-500/40"
              />

              <div className="flex flex-wrap items-center gap-2">
                {q.questionImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.questionImageUrl}
                    alt=""
                    className="h-14 w-auto max-w-[140px] rounded border border-white/10 object-contain"
                  />
                ) : null}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-gray-200 hover:bg-white/10">
                  <Upload className="h-3 w-3" />
                  {uploadingKey === `${q.id}-qimg` ? "Uploading…" : "Question image (optional)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!!uploadingKey}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      void uploadImage(`${q.id}-qimg`, f, (url) =>
                        updateQuestion(q.id, { questionImageUrl: url }),
                      );
                    }}
                  />
                </label>
                {q.questionImageUrl ? (
                  <button
                    type="button"
                    onClick={() => updateQuestion(q.id, { questionImageUrl: undefined })}
                    className="text-[10px] text-rose-300"
                  >
                    Clear image
                  </button>
                ) : null}
              </div>

              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const letter = String.fromCharCode(65 + oi);
                  return (
                    <div
                      key={opt.id}
                      className="rounded-md border border-white/10 bg-[#0a1220] p-2"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-1.5 text-[10px] text-gray-300">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctIndex === oi}
                            onChange={() => updateQuestion(q.id, { correctIndex: oi })}
                            className="accent-emerald-500"
                          />
                          Option {letter} (correct)
                        </label>
                        {q.options.length > 2 ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateQuestion(q.id, {
                                options: q.options.filter((o) => o.id !== opt.id),
                                correctIndex:
                                  q.correctIndex === oi
                                    ? 0
                                    : q.correctIndex > oi
                                      ? q.correctIndex - 1
                                      : q.correctIndex,
                              })
                            }
                            className="text-[10px] text-rose-300"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                      <input
                        value={opt.text}
                        onChange={(e) => updateOption(q.id, opt.id, { text: e.target.value })}
                        placeholder={`Option ${letter} text`}
                        className="mb-1.5 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {opt.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={opt.imageUrl}
                            alt=""
                            className="h-16 w-auto max-w-[160px] rounded border border-white/10 object-contain"
                          />
                        ) : null}
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-sky-400/35 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-100 hover:bg-sky-500/20">
                          <ImagePlus className="h-3 w-3" />
                          {uploadingKey === `${q.id}-${opt.id}`
                            ? "Uploading…"
                            : "Image (optional)"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={!!uploadingKey}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f) return;
                              void uploadImage(`${q.id}-${opt.id}`, f, (url) =>
                                updateOption(q.id, opt.id, { imageUrl: url }),
                              );
                            }}
                          />
                        </label>
                        {opt.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => updateOption(q.id, opt.id, { imageUrl: undefined })}
                            className="text-[10px] text-rose-300"
                          >
                            Clear image
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {q.options.length < 6 ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(q.id, { options: [...q.options, blankOption()] })
                    }
                    className="inline-flex items-center gap-1 text-[10px] text-sky-200 hover:text-sky-100"
                  >
                    <Plus className="h-3 w-3" />
                    Add option
                  </button>
                ) : null}
              </div>
            </div>
          ))
        : null}

      {!loadingExisting ? (
        <button
          type="button"
          onClick={() => setQuestions((prev) => [...prev, blankQuestion()])}
          className="inline-flex items-center gap-1 text-[11px] text-sky-200 hover:text-sky-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Add question
        </button>
      ) : null}

      {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
      {okMessage ? <p className="text-[11px] text-emerald-300">{okMessage}</p> : null}

      {!loadingExisting ? (
        <button
          type="button"
          disabled={saving || !!uploadingKey}
          onClick={() => void saveAsExamCsv()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/45 bg-emerald-500/20 py-2 text-xs font-semibold text-emerald-50 hover:bg-emerald-500/30 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save quiz (keeps all questions)"}
        </button>
      ) : null}
    </div>
  );
}
