"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  MessageCircle,
  Search,
  Shield,
  Star,
  ThumbsUp,
} from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import type { CourseQAItem } from "@/lib/course-qa-section";
import QATabSidebar from "@/components/QATabSidebar";
import { resolveQACopy } from "@/lib/course-qa-section";
import { formatSimpleRichTextBlock } from "@/lib/simple-rich-text";
import AskQuestionModal from "@/components/AskQuestionModal";
import {
  canParticipateInCourseQA,
  qaApiHeaders,
} from "@/lib/course-qa-client";
import { getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";

type QaFilter = "all" | "answered" | "unanswered" | "mine";
type SortKey = "latest" | "popular";

const card = "rounded-xl border border-white/10 bg-[#141414]";

const avatarBg: Record<CourseQAItem["avatarTone"], string> = {
  emerald: "bg-emerald-600/50 text-emerald-100",
  rose: "bg-rose-600/50 text-rose-100",
  sky: "bg-sky-600/50 text-sky-100",
  violet: "bg-violet-600/50 text-violet-100",
  amber: "bg-amber-600/50 text-amber-100",
};

type Props = {
  course: ManagedCourse;
  onRequireEnroll: () => void;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function QuestionCard({
  item,
  expanded,
  canAnswer,
  onToggle,
  onReply,
}: {
  item: CourseQAItem;
  expanded: boolean;
  canAnswer: boolean;
  onToggle: () => void;
  onReply: (body: string) => Promise<void>;
}) {
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const answerLabel =
    item.answerCount === 1 ? "1 Answer" : `${item.answerCount} Answers`;

  const submitReply = async () => {
    setReplyError(null);
    setPosting(true);
    try {
      await onReply(reply);
      setReply("");
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Could not post reply.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <article className={`${card} overflow-hidden`}>
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ${avatarBg[item.avatarTone]}`}
            >
              {initials(item.name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">
                <span className="font-medium text-zinc-300">{item.name}</span>
                <span className="mx-1.5">·</span>
                {item.daysAgo}
              </p>
              {item.status === "pending" ? (
                <span className="mt-2 inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                  Pending review
                </span>
              ) : null}
              <span className="mt-2 inline-block rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-200">
                {item.module}
              </span>
              <p className="mt-3 text-base font-semibold leading-snug text-white">{item.question}</p>
            </div>
          </div>
          {item.status === "approved" ? (
            <button
              type="button"
              onClick={onToggle}
              className="shrink-0 rounded-lg border border-violet-500/50 px-4 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/10"
            >
              {expanded ? "Hide Answers" : "View Answers"}
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 text-violet-400" aria-hidden />
            {answerLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-violet-400">
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
            {item.helpful}
          </span>
          <button type="button" className="inline-flex items-center gap-1.5 transition hover:text-zinc-300">
            <Star className="h-3.5 w-3.5" aria-hidden />
            Follow
          </button>
        </div>
      </div>

      {expanded && item.status === "approved" ? (
        <div className="border-t border-white/10 bg-[#0f0f12] px-5 py-4 space-y-4">
          {item.officialAnswer ? (
            <div className="flex gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-600/40">
                <Shield className="h-4 w-4 text-violet-200" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {item.officialAnswer.author}
                  </span>
                  <span className="rounded-md border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
                    Official Answer
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {item.officialAnswer.body}
                </p>
              </div>
            </div>
          ) : null}

          {(item.communityAnswers ?? []).map((a) => (
            <div key={a.id} className="flex gap-3 border-t border-white/5 pt-4 first:border-0 first:pt-0">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-700/50 text-[10px] font-bold text-zinc-200">
                {initials(a.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-500">
                  <span className="font-medium text-zinc-300">{a.name}</span>
                  <span className="mx-1.5">·</span>
                  {a.daysAgo}
                  {a.status === "pending" ? (
                    <span className="ml-2 text-amber-400">· Pending review</span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-zinc-400">{a.body}</p>
              </div>
            </div>
          ))}

          {canAnswer ? (
            <div className="border-t border-white/5 pt-4">
              <label className="sr-only" htmlFor={`reply-${item.id}`}>
                Post a reply
              </label>
              <textarea
                id={`reply-${item.id}`}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Post a reply…"
                className="w-full resize-none rounded-lg border border-white/10 bg-[#141414] px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-500/40"
              />
              {replyError ? <p className="mt-2 text-xs text-rose-400">{replyError}</p> : null}
              <button
                type="button"
                disabled={posting || reply.trim().length < 3}
                onClick={() => void submitReply()}
                className="mt-3 rounded-lg bg-violet-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {posting ? "Submitting…" : "Post Reply"}
              </button>
              <p className="mt-2 text-[11px] text-zinc-600">
                Replies are reviewed before they appear for everyone.
              </p>
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-500">
              Enroll in this course to post answers for the community.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

export default function SelfPacedQASection({ course, onRequireEnroll }: Props) {
  const qaCopy = useMemo(() => resolveQACopy(course), [course]);
  const [items, setItems] = useState<CourseQAItem[]>([]);
  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QaFilter>("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canParticipate = canParticipateInCourseQA(course.slug);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const email = getLearnerEmail();
      const qs = email ? `?email=${encodeURIComponent(email)}` : "";
      const res = await fetch(`/api/courses/${encodeURIComponent(course.slug)}/qa${qs}`, {
        cache: "no-store",
        headers: qaApiHeaders(),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        questions?: CourseQAItem[];
        viewerEmail?: string | null;
      };
      if (data.ok && Array.isArray(data.questions)) {
        setItems(data.questions);
        setViewerEmail(data.viewerEmail ?? email);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [course.slug]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const handleAskClick = () => {
    if (!isLearnerLoggedIn()) {
      onRequireEnroll();
      return;
    }
    if (!canParticipate) {
      onRequireEnroll();
      return;
    }
    setAskOpen(true);
  };

  const postReply = async (questionId: string, body: string) => {
    const res = await fetch(
      `/api/courses/${encodeURIComponent(course.slug)}/qa/${encodeURIComponent(questionId)}/answers`,
      {
        method: "POST",
        headers: qaApiHeaders(),
        body: JSON.stringify({ body }),
      },
    );
    const data = (await res.json()) as { ok?: boolean; message?: string; question?: CourseQAItem };
    if (!res.ok || !data.ok) {
      throw new Error(data.message ?? "Could not post answer.");
    }
    if (data.question) {
      setItems((prev) => prev.map((q) => (q.id === questionId ? data.question! : q)));
    }
    setToast(data.message ?? "Answer submitted for review.");
  };

  const filtered = useMemo(() => {
    let list = [...items];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.module.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q),
      );
    }
    if (filter === "answered") list = list.filter((i) => i.answered);
    if (filter === "unanswered") list = list.filter((i) => !i.answered);
    if (filter === "mine" && viewerEmail) {
      const mine = viewerEmail.toLowerCase();
      list = list.filter((i) => i.authorEmail?.toLowerCase() === mine);
    }
    if (sort === "popular") list.sort((a, b) => b.helpful - a.helpful);
    return list;
  }, [items, query, filter, sort, viewerEmail]);

  return (
    <div
      id="sp-qa"
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="min-w-0 space-y-6">
        {toast ? (
          <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
            {toast}
          </p>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">{qaCopy.title}</h2>
            <p className="mt-2 text-sm text-zinc-500">{formatSimpleRichTextBlock(qaCopy.subtitle)}</p>
          </div>
          <button
            type="button"
            onClick={handleAskClick}
            className="shrink-0 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.35)] transition hover:bg-violet-500"
          >
            {qaCopy.askButtonLabel}
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={qaCopy.searchPlaceholder}
            className="w-full rounded-xl border border-white/10 bg-[#141414] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/40"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "all" as const, label: "All Questions" },
                { key: "answered" as const, label: "Answered" },
                { key: "unanswered" as const, label: "Unanswered" },
                { key: "mine" as const, label: "My Questions" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === key
                    ? "border-violet-500 bg-violet-500/15 text-violet-200"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative shrink-0">
            <span className="sr-only">Sort questions</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none rounded-lg border border-white/15 bg-[#141414] py-2 pl-3 pr-9 text-xs font-medium text-zinc-200 outline-none focus:border-violet-500/50"
            >
              <option value="latest">Latest</option>
              <option value="popular">Most Popular</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          </label>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p className={`${card} px-4 py-8 text-center text-sm text-zinc-500`}>Loading Q&amp;A…</p>
          ) : filtered.length === 0 ? (
            <p className={`${card} px-4 py-8 text-center text-sm text-zinc-500`}>
              {filter === "mine"
                ? isLearnerLoggedIn()
                  ? "You have not asked any questions yet."
                  : "Sign in and enroll to see your questions here."
                : "No questions yet. Be the first to ask — your question will be reviewed before others can answer."}
            </p>
          ) : (
            filtered.map((item) => (
              <QuestionCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                canAnswer={canParticipate}
                onToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
                onReply={(body) => postReply(item.id, body)}
              />
            ))
          )}
        </div>
      </div>

      <QATabSidebar course={course} />

      <AskQuestionModal
        open={askOpen}
        course={course}
        onClose={() => setAskOpen(false)}
        onSubmitted={(message) => {
          setToast(message);
          void loadQuestions();
        }}
      />
    </div>
  );
}
