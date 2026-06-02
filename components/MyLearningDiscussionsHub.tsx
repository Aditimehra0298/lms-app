"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { CourseQAItem } from "@/lib/course-qa-section";
import { getLearnerDisplayName, qaApiHeaders } from "@/lib/course-qa-client";
import { getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";
import { readJsonResponse } from "@/lib/safe-json";

type Props = {
  enrolledSlugs: string[];
  courseTitles: Record<string, string>;
  focusCourseSlug?: string | null;
};

type ThreadRow = CourseQAItem & { courseSlug: string; courseTitle: string };

export function MyLearningDiscussionsHub({
  enrolledSlugs,
  courseTitles,
  focusCourseSlug,
}: Props) {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const slugs = useMemo(
    () => Array.from(new Set(enrolledSlugs.map((s) => s.trim()).filter(Boolean))),
    [enrolledSlugs],
  );

  const load = useCallback(async () => {
    if (!slugs.length) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const email = getLearnerEmail();
    const headers = qaApiHeaders();
    const merged: ThreadRow[] = [];

    await Promise.all(
      slugs.map(async (slug) => {
        try {
          const qs = email ? `?email=${encodeURIComponent(email)}` : "";
          const res = await fetch(`/api/courses/${encodeURIComponent(slug)}/qa${qs}`, {
            cache: "no-store",
            headers,
          });
          const data = await readJsonResponse(res, {} as { ok?: boolean; questions?: CourseQAItem[] });
          if (!res.ok || !Array.isArray(data.questions)) return;
          for (const q of data.questions) {
            merged.push({
              ...q,
              courseSlug: slug,
              courseTitle: courseTitles[slug] ?? slug,
            });
          }
        } catch {
          /* skip course */
        }
      }),
    );

    merged.sort((a, b) => {
      const ta = a.daysAgo.includes("day") ? 1 : 0;
      const tb = b.daysAgo.includes("day") ? 1 : 0;
      return tb - ta;
    });

    setThreads(merged);
    setLoading(false);
  }, [slugs, courseTitles]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = focusCourseSlug
    ? threads.filter((t) => t.courseSlug === focusCourseSlug)
    : threads;

  if (!isLearnerLoggedIn()) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-gray-400">
        <Link href="/account?mode=login" className="text-amber-200 underline">
          Sign in
        </Link>{" "}
        to join course discussions.
      </p>
    );
  }

  if (!slugs.length) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-gray-400">
        Enroll in a course to ask questions and help other learners in Q&amp;A.
        <Link href="/courses" className="mt-4 block text-amber-200">
          Browse courses
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {focusCourseSlug ? (
        <p className="text-sm text-gray-300">
          Showing Q&amp;A for{" "}
          <span className="font-semibold text-white">
            {courseTitles[focusCourseSlug] ?? focusCourseSlug}
          </span>
          .{" "}
          <Link href="/my-learning?tab=community" className="text-amber-200">
            View all courses
          </Link>
        </p>
      ) : (
        <p className="text-sm text-gray-300">
          Questions from your enrolled courses. Reply on the course page — others see answers after admin
          approval.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading discussions…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center text-sm text-gray-400">
          No questions yet. Open a course and use the Q&amp;A tab to start a thread.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((t) => (
            <li
              key={`${t.courseSlug}-${t.id}`}
              className="rounded-xl border border-white/10 bg-black/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-amber-200">{t.courseTitle}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{t.question}</p>
                </div>
                <span className="text-[10px] text-gray-500">{t.daysAgo}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {t.name} · {t.answerCount === 1 ? "1 answer" : `${t.answerCount} answers`}
                {t.status === "pending" ? " · awaiting approval" : ""}
              </p>
              <Link
                href={`/courses/${encodeURIComponent(t.courseSlug)}#qa`}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 hover:text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {t.answerCount > 0 ? "View thread & reply" : "Answer this question"}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-500">
        Signed in as {getLearnerDisplayName()}. New questions may be reviewed before they appear for everyone.
      </p>
    </div>
  );
}
