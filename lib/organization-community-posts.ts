/** Team community posts — employees and organisation admin share views (localStorage demo). */

export const ORG_COMMUNITY_POSTS_EVENT = "sft_org_community_posts_updated";

export type OrgCommunityAudience = "employee" | "organization";

export type OrgCommunityPost = {
  id: string;
  audience: OrgCommunityAudience;
  authorName: string;
  authorUserId?: string;
  courseTitle: string;
  courseSlug: string;
  title: string;
  body: string;
  rating?: number;
  createdAt: string;
};

const STORAGE_KEY = "sft_org_community_posts";

function newId(): string {
  return `ocp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ORG_COMMUNITY_POSTS_EVENT));
}

export function readOrgCommunityPosts(): OrgCommunityPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrgCommunityPost[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p.title?.trim() && p.body?.trim());
  } catch {
    return [];
  }
}

function writePosts(rows: OrgCommunityPost[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  emit();
}

export function addOrgCommunityPost(input: {
  audience: OrgCommunityAudience;
  authorName: string;
  authorUserId?: string;
  courseTitle: string;
  courseSlug: string;
  title: string;
  body: string;
  rating?: number;
}): OrgCommunityPost {
  const row: OrgCommunityPost = {
    id: newId(),
    audience: input.audience,
    authorName: input.authorName.trim(),
    authorUserId: input.authorUserId?.trim(),
    courseTitle: input.courseTitle.trim(),
    courseSlug: input.courseSlug.trim(),
    title: input.title.trim(),
    body: input.body.trim(),
    rating: input.rating,
    createdAt: new Date().toISOString(),
  };
  writePosts([row, ...readOrgCommunityPosts()].slice(0, 40));
  return row;
}

export function formatOrgPostTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Recently";
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** No demo posts — community shows only real learner/org submissions. */
export function organizationCommunityPostSamples(_companyName: string): OrgCommunityPost[] {
  return [];
}

export function mergeOrgCommunityPosts(
  userPosts: OrgCommunityPost[],
  _companyName: string,
): OrgCommunityPost[] {
  return [...userPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
