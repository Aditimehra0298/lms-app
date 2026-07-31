import type { Metadata } from "next";
import { FileText } from "lucide-react";
import LmsContentPageShell, { LmsContentCard } from "@/components/LmsContentPageShell";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import { LEGAL_LAST_UPDATED, termsSections } from "@/lib/lms-site-pages";

export const metadata: Metadata = {
  title: `Terms & Conditions — ${COMPANY_DISPLAY_NAME}`,
  description: `Terms of use for the ${COMPANY_DISPLAY_NAME} LMS, courses, payments, and certificates.`,
};

export default function TermsPage() {
  return (
    <LmsContentPageShell
      badge="Legal · Platform rules"
      title="Terms &"
      titleHighlight="Conditions"
      subtitle={`Last updated: ${LEGAL_LAST_UPDATED}. Please read these terms before creating an account or enrolling in a course.`}
      imageSrc="/lms-terms-hero.png"
      imageAlt="Terms and conditions for LMS use"
      ctaHref="/courses"
      ctaLabel="Browse courses"
      secondaryCtaHref="/account?mode=signup"
      secondaryCtaLabel="Create account"
    >
      <div className="space-y-5">
        {termsSections.map((section) => (
          <LmsContentCard key={section.title} title={section.title} icon={<FileText size={16} />}>
            {section.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </LmsContentCard>
        ))}
      </div>
    </LmsContentPageShell>
  );
}
