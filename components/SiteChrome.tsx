"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <div className="relative z-10 flex w-full min-w-0 flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}
