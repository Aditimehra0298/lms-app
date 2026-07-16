"use client";

import { useSyncExternalStore } from "react";
import MyLearningDashboardNav from "@/components/MyLearningDashboardNav";
import { isLearnerLoggedIn, subscribeLearnerAuth } from "@/lib/learner-session-client";

export default function MyLearningLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = useSyncExternalStore(
    subscribeLearnerAuth,
    () => isLearnerLoggedIn(),
    () => false,
  );

  if (!loggedIn) {
    return <div className="my-learning-page">{children}</div>;
  }

  return (
    <div className="my-learning-page">
      <MyLearningDashboardNav />
      {children}
    </div>
  );
}
