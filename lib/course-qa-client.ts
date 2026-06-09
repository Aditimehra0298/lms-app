import { getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";

export function getLearnerDisplayName(): string {
  if (typeof window === "undefined") return "Learner";
  const name = window.localStorage.getItem("sft_learner_name")?.trim();
  if (name) return name;
  const email = getLearnerEmail();
  if (!email) return "Learner";
  const local = email.split("@")[0] ?? "Learner";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isEnrolledInCourse(courseSlug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("sft_purchased_courses");
    if (!raw) return false;
    const list = JSON.parse(raw) as Array<{ slug?: string }>;
    if (!Array.isArray(list)) return false;
    return list.some((c) => c.slug?.trim() === courseSlug);
  } catch {
    return false;
  }
}

export function canParticipateInCourseQA(courseSlug: string): boolean {
  return isLearnerLoggedIn() && isEnrolledInCourse(courseSlug);
}

export function qaApiHeaders(): Record<string, string> {
  const email = getLearnerEmail();
  const name = getLearnerDisplayName();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (email) headers["x-learner-email"] = email;
  if (name) headers["x-learner-name"] = name;
  return headers;
}

/** Multipart uploads — omit Content-Type so the browser sets the boundary. */
export function learnerUploadHeaders(): Record<string, string> {
  const email = getLearnerEmail();
  const name = getLearnerDisplayName();
  const headers: Record<string, string> = {};
  if (email) headers["x-learner-email"] = email;
  if (name) headers["x-learner-name"] = name;
  return headers;
}
