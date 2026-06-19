import type { Metadata } from "next";
import TestimonialsPageContent from "@/components/TestimonialsPageContent";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Testimonials — ${COMPANY_DISPLAY_NAME}`,
  description: "Reviews and experiences from professionals who trained with us.",
};

export default async function TestimonialsPage() {
  const homePage = await resolveHomePageConfig();

  return (
    <TestimonialsPageContent meta={homePage.testimonialsPage} testimonials={homePage.testimonials} />
  );
}
