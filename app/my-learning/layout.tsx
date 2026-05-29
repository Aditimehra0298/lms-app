"use client";

import { useEffect, useState } from "react";
import MyLearningDashboardNav from "@/components/MyLearningDashboardNav";
import { isLearnerLoggedIn } from "@/lib/learner-session-client";

export default function MyLearningLayout({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setLoggedIn(isLearnerLoggedIn());
    sync();
    setReady(true);
    window.addEventListener("sft_auth_updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sft_auth_updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!ready) {
    return <div className="min-h-screen bg-[#0a0a0a]">{children}</div>;
  }

  if (!loggedIn) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <MyLearningDashboardNav />
      {children}
    </div>
  );
}
