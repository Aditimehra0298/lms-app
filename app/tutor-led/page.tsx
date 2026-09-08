import type { Metadata } from "next";
import TutorLedCatalogLanding from "@/components/TutorLedCatalogLanding";
import {
  defaultTutorLedCatalogPageConfig,
  mergeTutorLedCatalogPageConfig,
} from "@/lib/content-schema";
import { readAdminContent } from "@/lib/server/content-store";
import { getPublishedTutorLedProgramsOnly } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await readAdminContent();
  const page = mergeTutorLedCatalogPageConfig(content.tutorLedCatalogPage);
  const titleBase = `${page.hero.heading} ${page.hero.headingHighlight}`.trim();
  return {
    title: `${titleBase || "Tutor-Led Training"} | SF Trainings`,
    description: page.hero.subtitle || defaultTutorLedCatalogPageConfig.hero.subtitle,
    openGraph: page.pageThumbnail
      ? {
          images: [{ url: page.pageThumbnail }],
        }
      : undefined,
  };
}

export default async function TutorLedIndexPage() {
  const [programs, content] = await Promise.all([
    getPublishedTutorLedProgramsOnly(),
    readAdminContent(),
  ]);
  const config = mergeTutorLedCatalogPageConfig(content.tutorLedCatalogPage);
  return <TutorLedCatalogLanding programs={programs} config={config} />;
}
