"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, MessageSquare, X } from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { StoredCourseAnswer, StoredCourseQuestion } from "@/lib/course-qa-types";

type PendingAnswerRow = { question: StoredCourseQuestion; answer: StoredCourseAnswer };

export default function AdminCourseQAModeration() {
  const [pendingQuestions, setPendingQuestions] = useState<StoredCourseQuestion[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswerRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [officialDraft, setOfficialDraft] = useState<Record<string, string>>({});

  const adminHeaders = useCallback((): Record<string, string> => {
    const email = getLearnerEmail();
    return {
      "Content-Type": "application/json",
      ...(email ? { "x-admin-email": email } : {}),
    };
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const email = getLearnerEmail();
      const qs = email ? `?email=${encodeURIComponent(email)}` : "";
      const res = await fetch(`/api/admin/course-qa${qs}`, {
        cache: "no-store",
        headers: adminHeaders(),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        pendingQuestions?: StoredCourseQuestion[];
        pendingAnswers?: PendingAnswerRow[];
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setLoadError(data.message ?? "Could not load Q&A queue.");
        return;
      }
      setPendingQuestions(data.pendingQuestions ?? []);
      setPendingAnswers(data.pendingAnswers ?? []);
    } catch {
      setLoadError("Network error while loading Q&A moderation.");
    }
  }, [adminHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (payload: Record<string, string | undefined>) => {
    const res = await fetch("/api/admin/course-qa", {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (!res.ok || !data.ok) throw new Error(data.message ?? "Update failed");
  };

  const moderateQuestion = async (questionId: string, action: "approve" | "reject") => {
    setBusyId(questionId);
    try {
      await patch({ type: "question", questionId, action });
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const moderateAnswer = async (
    questionId: string,
    answerId: string,
    action: "approve" | "reject",
  ) => {
    setBusyId(answerId);
    try {
      await patch({ type: "answer", questionId, answerId, action });
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const postOfficial = async (questionId: string) => {
    const text = officialDraft[questionId]?.trim() ?? "";
    if (text.length < 3) return;
    setBusyId(`official-${questionId}`);
    try {
      await patch({ type: "official", questionId, officialBody: text });
      setOfficialDraft((d) => ({ ...d, [questionId]: "" }));
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not post official answer");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Course Q&amp;A moderation</h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          The Q&amp;A tab uses the same layout on every self-paced course. Learner questions and
          community answers are held here until you approve them — then others can see and respond.
        </p>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {loadError}
        </p>
      ) : null}

      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <MessageSquare className="h-4 w-4 text-violet-400" />
          Pending questions ({pendingQuestions.length})
        </h3>
        {pendingQuestions.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No questions waiting for review.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendingQuestions.map((q) => (
              <li
                key={q.id}
                className="rounded-xl border border-white/10 bg-[#141414] p-4"
              >
                <p className="text-xs text-violet-300">{q.courseSlug}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {q.authorName} · {q.module}
                </p>
                <p className="mt-2 text-sm font-medium text-white">{q.question}</p>
                <textarea
                  value={officialDraft[q.id] ?? ""}
                  onChange={(e) =>
                    setOfficialDraft((d) => ({ ...d, [q.id]: e.target.value }))
                  }
                  rows={2}
                  placeholder="Optional official answer (SFT Expert Team)…"
                  className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-violet-500/40"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === q.id}
                    onClick={() => void moderateQuestion(q.id, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === q.id}
                    onClick={() => void moderateQuestion(q.id, "reject")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                  {(officialDraft[q.id]?.trim().length ?? 0) >= 3 ? (
                    <button
                      type="button"
                      disabled={busyId === `official-${q.id}`}
                      onClick={() => void postOfficial(q.id)}
                      className="rounded-lg border border-violet-500/50 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/10 disabled:opacity-50"
                    >
                      Post official answer
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-bold text-white">
          Pending answers ({pendingAnswers.length})
        </h3>
        {pendingAnswers.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No answers waiting for review.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendingAnswers.map(({ question, answer }) => (
              <li
                key={answer.id}
                className="rounded-xl border border-white/10 bg-[#141414] p-4"
              >
                <p className="text-xs text-violet-300">{question.courseSlug}</p>
                <p className="mt-1 text-xs text-zinc-500">Re: {question.question}</p>
                <p className="mt-2 text-sm text-zinc-300">
                  <span className="font-semibold text-white">{answer.authorName}:</span>{" "}
                  {answer.body}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === answer.id}
                    onClick={() => void moderateAnswer(question.id, answer.id, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === answer.id}
                    onClick={() => void moderateAnswer(question.id, answer.id, "reject")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
