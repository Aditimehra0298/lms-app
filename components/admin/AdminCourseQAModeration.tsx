"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, MessageSquare, RefreshCw, X } from "lucide-react";
import { getLearnerEmail } from "@/lib/learner-session-client";
import type { StoredCourseAnswer, StoredCourseQuestion } from "@/lib/course-qa-types";

type PendingAnswerRow = { question: StoredCourseQuestion; answer: StoredCourseAnswer };

export default function AdminCourseQAModeration() {
  const [pendingQuestions, setPendingQuestions] = useState<StoredCourseQuestion[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<PendingAnswerRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [officialDraft, setOfficialDraft] = useState<Record<string, string>>({});
  const [courseFilter, setCourseFilter] = useState("");

  const adminHeaders = useCallback((): Record<string, string> => {
    const email = getLearnerEmail();
    return {
      "Content-Type": "application/json",
    };
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const courseSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const q of pendingQuestions) slugs.add(q.courseSlug);
    for (const { question } of pendingAnswers) slugs.add(question.courseSlug);
    return [...slugs].sort();
  }, [pendingQuestions, pendingAnswers]);

  const filteredQuestions = useMemo(() => {
    if (!courseFilter) return pendingQuestions;
    return pendingQuestions.filter((q) => q.courseSlug === courseFilter);
  }, [pendingQuestions, courseFilter]);

  const filteredAnswers = useMemo(() => {
    if (!courseFilter) return pendingAnswers;
    return pendingAnswers.filter(({ question }) => question.courseSlug === courseFilter);
  }, [pendingAnswers, courseFilter]);

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

  if (loading && pendingQuestions.length === 0 && pendingAnswers.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-white/10 bg-[#0b1224] px-4 py-16 text-sm text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-violet-400" /> Loading Q&amp;A queue…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1428] via-[#0a101c] to-[#070b14]">
        <div className="border-b border-white/[0.06] bg-violet-500/[0.07] px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-violet-500/20 ring-1 ring-violet-400/30">
                <MessageSquare className="h-6 w-6 text-violet-200" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/90">
                  Self-paced courses
                </p>
                <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Course Q&amp;A moderation</h1>
                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                  Learner questions and community answers stay hidden until you approve them. Post an{" "}
                  <strong className="text-gray-300">official answer</strong> as the SFT Expert Team when needed.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-200">
                {pendingQuestions.length} questions
              </span>
              <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-200">
                {pendingAnswers.length} answers
              </span>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-gray-300 hover:bg-white/5 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <label className="flex items-center gap-2 text-[11px] text-gray-500">
            Filter by course
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white outline-none"
            >
              <option value="">All courses</option>
              {courseSlugs.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/admin?panel=self-paced"
            className="ml-auto text-[11px] font-medium text-violet-300 hover:text-violet-100"
          >
            Manage self-paced courses →
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {loadError}
        </p>
      ) : null}

      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <MessageSquare className="h-4 w-4 text-violet-400" />
          Pending questions ({filteredQuestions.length})
        </h3>
        {filteredQuestions.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-[#0d1528]/50 px-4 py-8 text-center text-sm text-gray-500">
            No questions waiting for review.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {filteredQuestions.map((q) => (
              <li key={q.id} className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
                <p className="font-mono text-xs text-violet-300">{q.courseSlug}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {q.authorName} · {q.module}
                </p>
                <p className="mt-2 text-sm font-medium text-white">{q.question}</p>
                <textarea
                  value={officialDraft[q.id] ?? ""}
                  onChange={(e) => setOfficialDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                  rows={2}
                  placeholder="Optional official answer (SFT Expert Team)…"
                  className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-200 outline-none focus:border-violet-500/40"
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
        <h3 className="text-sm font-bold text-white">Pending answers ({filteredAnswers.length})</h3>
        {filteredAnswers.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-[#0d1528]/50 px-4 py-8 text-center text-sm text-gray-500">
            No answers waiting for review.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {filteredAnswers.map(({ question, answer }) => (
              <li key={answer.id} className="rounded-xl border border-white/10 bg-[#0d1528] p-4">
                <p className="font-mono text-xs text-violet-300">{question.courseSlug}</p>
                <p className="mt-1 text-xs text-gray-500">Re: {question.question}</p>
                <p className="mt-2 text-sm text-gray-300">
                  <span className="font-semibold text-white">{answer.authorName}:</span> {answer.body}
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
