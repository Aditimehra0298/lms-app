"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  active: boolean;
  className?: string;
  children?: ReactNode;
};

/** Header “My Learning” link — golden rays when active (dashboard). */
export default function MyLearningHeaderLink({
  active,
  className = "",
  children = "My Learning",
}: Props) {
  return (
    <Link
      href="/my-learning?tab=dashboard"
      aria-current={active ? "page" : undefined}
      title={active ? "Your dashboard" : "Go to your dashboard"}
      className={`relative overflow-visible border-b-2 py-2 transition-colors ${
        active
          ? "my-learning-dashboard-tab z-10 border-amber-300 text-amber-50"
          : "border-transparent text-amber-200/90 hover:border-amber-400/50 hover:text-amber-300"
      } ${className}`}
    >
      {active ? (
        <>
          <span className="my-learning-dashboard-rays pointer-events-none absolute inset-0 -z-10" aria-hidden />
          <span className="my-learning-dashboard-glow pointer-events-none absolute inset-0 -z-10" aria-hidden />
        </>
      ) : null}
      <span className="relative z-10">{children}</span>
    </Link>
  );
}
