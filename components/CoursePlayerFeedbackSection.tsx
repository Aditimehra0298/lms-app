"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Star } from "lucide-react";
import { getLearnerDisplayName, qaApiHeaders } from "@/lib/course-qa-client";
import { getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";
import { readJsonResponse } from "@/lib/safe-json";

type ReviewRow = {
  id: string;
  name: string;
  rating: number;
  body: string;
  daysAgo: string;
  isMine?: boolean;
};

type Props = {
  courseSlug: string;
  courseTitle: string;
  activeModuleTitle?: string;
};

export function CoursePlayerFeedbackSection({ courseSlug, courseTitle, activeModuleTitle }: Props) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loggedIn = isLearnerLoggedIn();
  const qaHref = `/courses/${encodeURIComponent(courseSlug)}#qa`;
  const communityHref = `/my-learning?tab=community&course=${encodeURIComponent(courseSlug)}`;

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const email = getLearnerEmail();
      const qs = email ? `?email=${encodeURIComponent(email)}` : "";
      const res = await fetch(`/api/courses/${encodeURIComponent(courseSlug)}/reviews${qs}`, {
        cache: "no-store",
        headers: qaApiHeaders(),
      });
      const data = await readJsonResponse(res, {} as { ok?: boolean; reviews?: ReviewRow[] });
      if (res.ok && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [courseSlug]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const submitReview = async () => {
    setError(null);
    setSuccess(null);
    if (!loggedIn) {
      setError("Sign in to leave feedback.");
      return;
    }
    if (rating < 1) {
      setError("Select a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseSlug)}/reviews`, {
        method: "POST",
        headers: qaApiHeaders(),
        body: JSON.stringify({ rating, review: body }),
      });
      const data = await readJsonResponse(res, {} as { ok?: boolean; message?: string });
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not save feedback.");
        return;
      }
      setBody("");
      setRating(0);
      setSuccess("Thanks — your review is visible to other learners.");
      await loadReviews();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayStars = hoverRating || rating;

  return (
    <article className="rounded-xl border border-white/10 bg-[#0c1324] p-3">
      <p className="text-sm font-semibold text-violet-100">Your feedback</p>
      <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
        Rate this course and share what helped you. Other learners can read reviews and reply in the Q&amp;A
        dashboard.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={communityHref}
          className="inline-flex items-center gap-1.5 rounded-md border border-violet-300/35 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-100"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          Q&amp;A dashboard
        </Link>
        <Link
          href={qaHref}
          className="rounded-md border border-white/15 bg-black/25 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
        >
          Ask &amp; answer on course page
        </Link>
      </div>

      {loggedIn ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] font-medium text-gray-300">
            Posting as {getLearnerDisplayName()}
            {activeModuleTitle ? ` · ${activeModuleTitle}` : ""}
          </p>
          <div
            className="mt-2 flex justify-center gap-1"
            role="group"
            aria-label="Your rating"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
                className="rounded p-0.5"
                aria-label={`${n} stars`}
              >
                <Star
                  className={`h-6 w-6 ${
                    n <= displayStars ? "fill-amber-400 text-amber-400" : "text-gray-600"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={`How is ${courseTitle} helping you so far?`}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-[#060b17] px-3 py-2 text-xs text-white placeholder:text-gray-500"
          />
          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
          {success ? <p className="mt-2 text-xs text-emerald-300">{success}</p> : null}
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitReview()}
            className="mt-2 w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-black disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Submit review"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-400">
          <Link href="/account?mode=login" className="text-amber-200 underline">
            Sign in
          </Link>{" "}
          to leave feedback.
        </p>
      )}

      <div className="mt-4 border-t border-white/10 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Learner reviews</p>
        {loading ? (
          <p className="mt-2 text-xs text-gray-500">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500">No reviews yet — be the first to share feedback.</p>
        ) : (
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {reviews.slice(0, 5).map((r) => (
              <li key={r.id} className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white">
                    {r.name}
                    {r.isMine ? (
                      <span className="ml-1.5 font-normal text-violet-300">(you)</span>
                    ) : null}
                  </p>
                  <p className="shrink-0 text-[10px] text-gray-500">{r.daysAgo}</p>
                </div>
                <p className="mt-0.5 text-[10px] text-amber-200">
                  {"★".repeat(r.rating)}
                  <span className="text-gray-600">{"★".repeat(5 - r.rating)}</span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400 line-clamp-3">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
        {reviews.length > 5 ? (
          <Link href={qaHref} className="mt-2 inline-block text-[11px] font-semibold text-amber-200">
            View all on course page →
          </Link>
        ) : null}
      </div>
    </article>
  );
}
