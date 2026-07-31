import type { Metadata } from "next";
import Link from "next/link";
import { BadgeIndianRupee } from "lucide-react";
import LmsContentPageShell, { LmsContentCard } from "@/components/LmsContentPageShell";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";
import { LEGAL_LAST_UPDATED, refundSections } from "@/lib/lms-site-pages";

export const metadata: Metadata = {
  title: `Refund Policy — ${COMPANY_DISPLAY_NAME}`,
  description: `Refund eligibility and request process for ${COMPANY_DISPLAY_NAME} LMS course purchases.`,
};

export default function RefundPolicyPage() {
  return (
    <LmsContentPageShell
      badge="Legal · Payments"
      title="Refund"
      titleHighlight="Policy"
      subtitle={`Last updated: ${LEGAL_LAST_UPDATED}. Clear guidance on when refunds may apply for LMS enrollments.`}
      imageSrc="/lms-refund-hero.png"
      imageAlt="Refund and payment policy"
      ctaHref="/contact"
      ctaLabel="Request help"
      secondaryCtaHref="/book-a-call"
      secondaryCtaLabel="Book a call"
    >
      <div className="space-y-5">
        {refundSections.map((section) => (
          <LmsContentCard key={section.title} title={section.title} icon={<BadgeIndianRupee size={16} />}>
            {section.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </LmsContentCard>
        ))}
        <LmsContentCard>
          <p>
            Need help with a payment issue?{" "}
            <Link href="/contact" className="font-bold text-[#eb9422] underline decoration-amber-500/40 hover:brightness-110">
              Contact us
            </Link>{" "}
            or open the site chat and say “payment problem”.
          </p>
        </LmsContentCard>
      </div>
    </LmsContentPageShell>
  );
}
