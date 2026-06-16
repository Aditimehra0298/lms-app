"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { PricingProvider } from "@/components/PricingProvider";
import CartAbandonmentTracker from "@/components/CartAbandonmentTracker";
import DeferredChatbots from "@/components/DeferredChatbots";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");
  const myLearningPage = pathname.startsWith("/my-learning");
  const tutorLedMarketing = pathname.startsWith("/tutor-led");
  const compactMainChrome = myLearningPage;

  useEffect(() => {
    if (!tutorLedMarketing) return;
    document.body.classList.add("tutor-led-marketing-body");
    return () => document.body.classList.remove("tutor-led-marketing-body");
  }, [tutorLedMarketing]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <PricingProvider>
      <SiteHeader forceDarkChrome={tutorLedMarketing} />
      <div
        className={`relative z-10 flex w-full min-w-0 flex-col${
          compactMainChrome ? " shrink-0" : " flex-1"
        }${tutorLedMarketing ? " bg-black text-white" : ""}`}
      >
        {children}
      </div>
      <SiteFooter forceDarkChrome={tutorLedMarketing} />
      <CartAbandonmentTracker />
      <DeferredChatbots />
    </PricingProvider>
  );
}
