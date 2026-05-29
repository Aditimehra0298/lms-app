"use client";

import { usePathname } from "next/navigation";
import LmsChatbot from "@/components/LmsChatbot";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { PricingProvider } from "@/components/PricingProvider";
import CourseChatbot from "@/components/CourseChatbot";
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  const accountPage = pathname === "/account";

  return (
    <PricingProvider>
      <SiteHeader />
      <div
        className={`relative z-10 flex w-full min-w-0 flex-col${accountPage ? " shrink-0" : " flex-1"}`}
      >
        {children}
      </div>
      <SiteFooter />
      <CourseChatbot />
 <LmsChatbot />
    </PricingProvider>

  );
}
