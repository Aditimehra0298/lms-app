export type MyLearningNavItem = {
  label: string;
  href: string;
  /** Shown when this is the learner dashboard home tab */
  isDashboardHome?: boolean;
  match?: { tab?: string | string[]; pathPrefix?: string; coursePlayer?: boolean };
};

export const MY_LEARNING_SIDEBAR_NAV: MyLearningNavItem[] = [
  {
    label: "🎓 My Learning",
    href: "/my-learning?tab=dashboard",
    isDashboardHome: true,
    match: { tab: ["dashboard", "overview"], coursePlayer: true },
  },
  { label: "📚 Courses", href: "/courses", match: { pathPrefix: "/courses" } },
  {
    label: "📖 My Courses",
    href: "/my-learning?tab=learning",
    match: { tab: ["learning", "progress"] },
  },
  {
    label: "🎥 Tutor Led",
    href: "/my-learning?tab=live",
    match: { tab: ["live", "events"], pathPrefix: "/tutor-led" },
  },
  {
    label: "📅 Calendar",
    href: "/my-learning/calendar",
    match: { pathPrefix: "/my-learning/calendar", tab: "calendar" },
  },
  { label: "📝 Assignments", href: "/my-learning?tab=assignments", match: { tab: "assignments" } },
  { label: "💬 Community", href: "/my-learning?tab=community", match: { tab: "community" } },
  { label: "💳 Subscriptions", href: "/my-learning?tab=subscriptions", match: { tab: "subscriptions" } },
  { label: "📜 Certificate Records", href: "/my-learning?tab=certificates", match: { tab: "certificates" } },
  { label: "🏆 Achievements", href: "/my-learning?tab=achievements", match: { tab: "achievements" } },
];

export function isMyLearningNavActive(
  item: MyLearningNavItem,
  pathname: string,
  tab: string | null,
): boolean {
  const m = item.match;
  if (!m) return false;

  if (m.coursePlayer && pathname.startsWith("/my-learning/course")) {
    return Boolean(item.isDashboardHome);
  }

  if (m.pathPrefix && pathname.startsWith(m.pathPrefix)) {
    if (m.pathPrefix === "/my-learning/calendar") return true;
    if (m.pathPrefix === "/courses") return true;
    if (m.pathPrefix === "/tutor-led") return true;
    return false;
  }

  if (m.tab && pathname.startsWith("/my-learning") && !pathname.startsWith("/my-learning/course")) {
    const tabs = Array.isArray(m.tab) ? m.tab : [m.tab];
    const current = tab ?? "dashboard";
    return tabs.includes(current);
  }

  return false;
}
