import type { Metadata } from "next";
import BlogsPageContent from "@/components/BlogsPageContent";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

export const metadata: Metadata = {
  title: `Blogs — ${COMPANY_DISPLAY_NAME}`,
  description: `Insights on cybersecurity, ESG, food safety, and professional LMS learning from ${COMPANY_DISPLAY_NAME}.`,
};

export default function BlogsPage() {
  return <BlogsPageContent />;
}
