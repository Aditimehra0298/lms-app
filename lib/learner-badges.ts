export type LearnerBadge = {
  id: string;
  courseSlug: string;
  courseTitle: string;
  moduleNumber: number;
  moduleTitle: string;
  badgeImageUrl?: string;
  earnedAt: string;
};

const STORAGE_KEY = "sft_learner_badges";
export const BADGES_UPDATED_EVENT = "sft-badges-updated";

function readAll(): LearnerBadge[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as LearnerBadge[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(badges: LearnerBadge[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(badges));
  window.dispatchEvent(new Event(BADGES_UPDATED_EVENT));
}

export function readLearnerBadges(courseSlug?: string): LearnerBadge[] {
  const all = readAll();
  if (!courseSlug?.trim()) return all;
  return all.filter((b) => b.courseSlug === courseSlug.trim());
}

export function awardModuleBadge(input: {
  courseSlug: string;
  courseTitle: string;
  moduleNumber: number;
  moduleTitle: string;
  badgeImageUrl?: string;
}): LearnerBadge {
  const slug = input.courseSlug.trim();
  const all = readAll();
  const id = `${slug}-module-${input.moduleNumber}`;
  const existing = all.find((b) => b.id === id);
  if (existing) return existing;

  const badge: LearnerBadge = {
    id,
    courseSlug: slug,
    courseTitle: input.courseTitle.trim() || "Course",
    moduleNumber: input.moduleNumber,
    moduleTitle: input.moduleTitle.trim() || `Module ${input.moduleNumber}`,
    badgeImageUrl: input.badgeImageUrl?.trim() || undefined,
    earnedAt: new Date().toISOString(),
  };
  writeAll([badge, ...all]);
  return badge;
}
