import type { Metadata } from "next";
import { Shield } from "lucide-react";
import LmsContentPageShell, { LmsContentCard } from "@/components/LmsContentPageShell";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import { LEGAL_LAST_UPDATED, privacySections } from "@/lib/lms-site-pages";

export const metadata: Metadata = {
  title: `Privacy Policy — ${COMPANY_DISPLAY_NAME}`,
  description: `How ${COMPANY_DISPLAY_NAME} collects, uses, and protects learner data on the LMS.`,
};

export default function PrivacyPolicyPage() {
  return (
    <LmsContentPageShell
      badge="Legal · Trust & security"
      title="Privacy"
      titleHighlight="Policy"
      subtitle={`Last updated: ${LEGAL_LAST_UPDATED}. How we collect, use, and protect personal information on our Learning Management System.`}
      imageSrc="/lms-privacy-hero.png"
      imageAlt="Privacy and data protection on the LMS"
      ctaHref="/contact"
      ctaLabel="Privacy questions"
      secondaryCtaHref="/courses"
      secondaryCtaLabel="Browse courses"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {privacySections.map((section) => (
            <LmsContentCard key={section.title} title={section.title} icon={<Shield size={16} />}>
              {section.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </LmsContentCard>
          ))}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <LmsContentCard title="Quick summary">
            <ul className="lh-bullet list-disc space-y-2 pl-4">
              <li>We don’t sell learner data</li>
              <li>Payments handled by trusted gateways</li>
              <li>You can request access or correction</li>
              <li>Learning records kept securely</li>
            </ul>
          </LmsContentCard>
        </aside>
      </div>
    </LmsContentPageShell>
  );
}
