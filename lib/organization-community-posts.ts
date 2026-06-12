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

/** Preview posts — employee ↔ organisation conversation until API is wired. */
export function organizationCommunityPostSamples(companyName: string): OrgCommunityPost[] {
  const org = companyName.trim() || "Your organisation";
  return [
    {
      id: "sample-org-1",
      audience: "organization",
      authorName: `${org} Admin`,
      courseTitle: "Food Safety & HACCP Fundamentals",
      courseSlug: "food-safety-masterclass",
      title: "Why we enrolled the team in HACCP",
      body: "We assigned this program so every site lead meets audit-ready standards before Q3 inspections.",
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    },
    {
      id: "sample-emp-1",
      audience: "employee",
      authorName: "Michael Brown",
      authorUserId: "EMP-0003",
      courseTitle: "Food Safety & HACCP Fundamentals",
      courseSlug: "food-safety-masterclass",
      title: "Module 3 was especially practical",
      body: "The case studies map directly to our kitchen workflow — sharing this with the org learning group.",
      rating: 5,
      createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    },
    {
      id: "sample-org-2",
      audience: "organization",
      authorName: `${org} L&D`,
      courseTitle: "Cyber Security Essentials",
      courseSlug: "cyber-security-essentials",
      title: "Company-wide security awareness push",
      body: "Please complete the phishing module this week. Post your takeaways here so leadership can see team progress.",
      createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    },
    {
      id: "sample-emp-2",
      audience: "employee",
      authorName: "Sarah Johnson",
      authorUserId: "EMP-0002",
      courseTitle: "Cyber Security Essentials",
      courseSlug: "cyber-security-essentials",
      title: "Shared our team playbook update",
      body: "After the tutor-led session we updated password policy — attaching learnings for the organisation view.",
      rating: 4,
      createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    },
  ];
}

export function mergeOrgCommunityPosts(
  userPosts: OrgCommunityPost[],
  companyName: string,
): OrgCommunityPost[] {
  const seen = new Set(userPosts.map((p) => p.id));
  const merged = [...userPosts];
  for (const sample of organizationCommunityPostSamples(companyName)) {
    if (!seen.has(sample.id)) merged.push(sample);
  }
  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
