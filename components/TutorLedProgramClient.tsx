"use client";

import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import TutorLedLearnerDashboard from "@/components/TutorLedLearnerDashboard";
import Iso22000CourseLanding from "@/components/Iso22000CourseLanding";

type Props = {
  program: TutorLedProgramStored;
  enrolledLearning?: boolean;
  /** workshop = one-day landing (same layout as tutor-led). */
  variant?: "tutor-led" | "workshop";
};

export default function TutorLedProgramClient({
  program,
  enrolledLearning = false,
}: Props) {
  if (enrolledLearning) {
    return <TutorLedLearnerDashboard program={program} />;
  }

  return <Iso22000CourseLanding program={program} />;
}
