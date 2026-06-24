"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { COMPANY_DISPLAY_NAME } from "@/lib/contact-site-data";

const DARK_LOGO = "/SF-WHITE-LOGO.png";
const LIGHT_LOGO = "/sf-light-logo.png";

type Props = {
  className?: string;
};

/** Theme-aware SF Trainings logo — served from /public (avoids bundling multi-MB assets). */
export function MyLearningDashboardLogo({
  className = "my-learning-dashboard-logo h-16 w-auto object-contain md:h-[4.5rem]",
}: Props) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const readTheme = () => {
      setIsLight(document.documentElement.dataset.theme === "light");
    };
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Image
      src={isLight ? LIGHT_LOGO : DARK_LOGO}
      alt={COMPANY_DISPLAY_NAME}
      width={200}
      height={200}
      className={className}
      priority
    />
  );
}
