import { NextResponse } from "next/server";
import { collectSiteFaqsFlat } from "@/lib/server/collect-site-faqs";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" };

/** Public read-only home page sections (FAQ, testimonials). */
export async function GET() {
  const [homePage, allFaqs] = await Promise.all([resolveHomePageConfig(), collectSiteFaqsFlat()]);
  return NextResponse.json(
    {
      ok: true,
      faqs: allFaqs,
      homeFaqs: homePage.faqs,
      faqImage: homePage.faqImage,
      faqPage: homePage.faqPage,
      testimonials: homePage.testimonials,
      testimonialsPage: homePage.testimonialsPage,
    },
    { headers: noStore },
  );
}
