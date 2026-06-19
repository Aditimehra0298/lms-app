import type { Metadata } from "next";
import { Suspense } from "react";
import FaqPageContent from "@/components/FaqPageContent";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import { collectSiteFaqGroups } from "@/lib/server/collect-site-faqs";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `FAQs — ${COMPANY_DISPLAY_NAME}`,
  description: "Frequently asked questions about programs, enrollment, payments, and certificates.",
};

export default async function FaqPage() {
  const [homePage, groups] = await Promise.all([resolveHomePageConfig(), collectSiteFaqGroups()]);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-[#06080f] text-sm text-gray-400">
          Loading FAQs…
        </div>
      }
    >
      <FaqPageContent meta={homePage.faqPage} groups={groups} faqImage={homePage.faqImage} />
    </Suspense>
  );
}
