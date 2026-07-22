"use client";

import BrandLogo from "@/components/BrandLogo";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

type Props = {
  className?: string;
};

/** Theme-aware SF Trainings logo — same asset as the site header. */
export function MyLearningDashboardLogo({
  className = "my-learning-dashboard-logo h-16 w-auto object-contain md:h-[4.5rem]",
}: Props) {
  return <BrandLogo className={className} priority alt={COMPANY_DISPLAY_NAME} width={220} height={80} />;
}
