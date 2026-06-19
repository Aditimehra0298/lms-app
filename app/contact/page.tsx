import type { Metadata } from "next";
import ContactPageContent from "@/components/ContactPageContent";
import { COMPANY_DISPLAY_NAME, COMPANY_LEGAL_NAME } from "@/lib/contact-site-data";

export const metadata: Metadata = {
  title: `Contact Us — ${COMPANY_DISPLAY_NAME}`,
  description: `Get in touch with ${COMPANY_LEGAL_NAME} for course enrollment, technical support, and corporate training inquiries.`,
};

export default function ContactPage() {
  return <ContactPageContent />;
}
