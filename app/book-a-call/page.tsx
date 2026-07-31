import type { Metadata } from "next";
import BookACallContent from "@/components/BookACallContent";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

export const metadata: Metadata = {
  title: `Book a Call — ${COMPANY_DISPLAY_NAME}`,
  description: `Book a callback with ${COMPANY_DISPLAY_NAME} for course guidance, corporate training, or LMS support.`,
};

export default function BookACallPage() {
  return <BookACallContent />;
}
