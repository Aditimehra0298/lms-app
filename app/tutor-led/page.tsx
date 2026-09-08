import type { Metadata } from "next";
import TutorLedCatalogLanding from "@/components/TutorLedCatalogLanding";
import { getPublishedTutorLedProgramsOnly } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Tutor-Led Programs | SF Trainings",
  description:
    "Browse live Zoom tutor-led training programs. Each course has its own landing page with schedule, pricing, and enrollment.",
};

export default async function TutorLedIndexPage() {
  const programs = await getPublishedTutorLedProgramsOnly();
  return <TutorLedCatalogLanding programs={programs} />;
}
