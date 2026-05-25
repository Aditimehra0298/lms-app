import type { CourseQAItem } from "@/lib/course-qa-section";
import type { StoredCourseAnswer, StoredCourseQuestion } from "@/lib/course-qa-types";

const AVATAR_TONES: CourseQAItem["avatarTone"][] = ["emerald", "rose", "sky", "violet", "amber"];

function hashTone(seed: string): CourseQAItem["avatarTone"] {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i);
  return AVATAR_TONES[n % AVATAR_TONES.length]!;
}

export function formatDaysAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Recently";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function visibleAnswers(
  q: StoredCourseQuestion,
  viewerEmail?: string | null,
): StoredCourseAnswer[] {
  const email = viewerEmail?.trim().toLowerCase() || "";
  return q.answers.filter(
    (a) =>
      a.status === "approved" ||
      (email.length > 0 && a.authorEmail.toLowerCase() === email),
  );
}

export function questionToCourseQAItem(
  q: StoredCourseQuestion,
  viewerEmail?: string | null,
): CourseQAItem {
  const answers = visibleAnswers(q, viewerEmail);
  const official = answers.find((a) => a.isOfficial && a.status === "approved");
  const communityCount = answers.filter((a) => !a.isOfficial).length;

  return {
    id: q.id,
    authorEmail: q.authorEmail,
    name: q.authorName,
    daysAgo: formatDaysAgo(q.createdAt),
    module: q.module,
    question: q.question,
    answerCount: communityCount + (official ? 1 : 0),
    helpful: q.helpful,
    answered: answers.some((a) => a.status === "approved"),
    avatarTone: hashTone(q.authorEmail),
    status: q.status,
    officialAnswer: official
      ? { author: official.authorName, body: official.body }
      : undefined,
    communityAnswers: answers
      .filter((a) => !a.isOfficial)
      .map((a) => ({
        id: a.id,
        name: a.authorName,
        body: a.body,
        daysAgo: formatDaysAgo(a.createdAt),
        status: a.status,
      })),
  };
}
