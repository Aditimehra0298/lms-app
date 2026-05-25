import { AUTH_KEYS, isLearnerLoggedIn } from "@/lib/learner-session-client";

export function isAdminRole(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_KEYS.role) === "admin";
}

export function isAdminSession(): boolean {
  return isLearnerLoggedIn() && isAdminRole();
}
