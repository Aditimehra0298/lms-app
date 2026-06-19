"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { readLearnerProfileFromStorage, isOrganisationLearner } from "@/lib/auth-profile";
import {
  MY_LEARNING_ORG_NAV,
  MY_LEARNING_SIDEBAR_NAV,
  isMyLearningNavActive,
} from "@/lib/my-learning-nav";
import { useSyncExternalStore } from "react";
import { subscribeLearnerAuth } from "@/lib/learner-session-client";

/** Horizontal dashboard nav — replaces Home/About/Contact on My Learning (not a sidebar). */
export default function MyLearningDashboardNav() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const isOrg = useSyncExternalStore(
    subscribeLearnerAuth,
    () => isOrganisationLearner(readLearnerProfileFromStorage()),
    () => false,
  );
  const navItems = isOrg ? MY_LEARNING_ORG_NAV : MY_LEARNING_SIDEBAR_NAV;

  return (
    <div className="border-b border-white/10 bg-[#0a0f1a]">
      <nav
        className="mx-auto flex w-full max-w-[1760px] items-center gap-1 overflow-x-auto px-4 py-2 text-[13px] font-bold xl:px-6"
        aria-label={isOrg ? "Organization dashboard" : "Learner dashboard"}
      >
        {navItems.map((item) => {
          const active = isMyLearningNavActive(item, pathname, tab);
          const isHome = active && item.isDashboardHome;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={isHome ? "Your dashboard" : undefined}
              className={`relative shrink-0 overflow-visible rounded-t-md border-b-2 px-3 py-2.5 whitespace-nowrap transition-colors ${
                isHome
                  ? "my-learning-dashboard-tab z-10 border-amber-300 text-amber-50"
                  : active
                    ? "border-amber-400 bg-amber-500/10 text-amber-200"
                    : "border-transparent text-gray-400 hover:border-amber-400/40 hover:bg-white/5 hover:text-amber-300"
              }`}
            >
              {isHome ? (
                <>
                  <span className="my-learning-dashboard-rays pointer-events-none absolute inset-0 -z-10" aria-hidden />
                  <span className="my-learning-dashboard-glow pointer-events-none absolute inset-0 -z-10" aria-hidden />
                </>
              ) : null}
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
