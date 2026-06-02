import { NextResponse } from "next/server";
import { createCourseReview, listReviewsForCourse } from "@/lib/server/course-reviews-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function learnerFromRequest(request: Request): { email: string; name: string } | null {
  const email =
    request.headers.get("x-learner-email")?.trim().toLowerCase() ||
    new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return null;
  const name =
    request.headers.get("x-learner-name")?.trim() ||
    email.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "Learner";
  return { email, name };
}

function formatDaysAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Recently";
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const courseSlug = slug.trim();
  if (!courseSlug) {
    return NextResponse.json({ ok: false, message: "Missing course" }, { status: 400 });
  }

  const viewer = learnerFromRequest(request);
  const rows = await listReviewsForCourse(courseSlug, viewer?.email);

  return NextResponse.json(
    {
      ok: true,
      reviews: rows.map((r) => ({
        id: r.id,
        name: r.authorName,
        rating: r.rating,
        body: r.body,
        daysAgo: formatDaysAgo(r.createdAt),
        helpful: r.helpful,
        verified: true,
        isMine: viewer?.email ? r.authorEmail === viewer.email : false,
        status: r.status,
      })),
      viewerEmail: viewer?.email ?? null,
    },
    { headers: noStore },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const courseSlug = slug.trim();
  if (!courseSlug) {
    return NextResponse.json({ ok: false, message: "Missing course" }, { status: 400 });
  }

  const learner = learnerFromRequest(request);
  if (!learner) {
    return NextResponse.json(
      { ok: false, message: "Sign in to leave feedback." },
      { status: 401 },
    );
  }

  let body: { rating?: number; review?: string; body?: string };
  try {
    body = (await request.json()) as { rating?: number; review?: string; body?: string };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const rating = Number(body.rating);
  const text = (body.review ?? body.body ?? "").trim();
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, message: "Choose a rating from 1 to 5 stars." }, { status: 400 });
  }
  if (text.length < 20) {
    return NextResponse.json(
      { ok: false, message: "Please write at least 20 characters of feedback." },
      { status: 400 },
    );
  }

  const created = await createCourseReview({
    courseSlug,
    authorEmail: learner.email,
    authorName: learner.name,
    rating,
    body: text,
  });

  return NextResponse.json({
    ok: true,
    review: {
      id: created.id,
      name: created.authorName,
      rating: created.rating,
      body: created.body,
      daysAgo: "Just now",
      helpful: 0,
      verified: true,
      isMine: true,
      status: created.status,
    },
  });
}
