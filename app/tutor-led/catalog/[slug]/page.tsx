import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FoodTutorLedCatalogLanding from "@/components/FoodTutorLedCatalogLanding";
import { findTutorLedCatalog, mergeTutorLedCatalogPages } from "@/lib/tutor-led-catalog-landings";
import { readAdminContentFromDisk } from "@/lib/server/content-store";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = await readAdminContentFromDisk();
  const pages = mergeTutorLedCatalogPages(content.tutorLedCatalogPages, content.tutorLedCatalogPage);
  const catalog = findTutorLedCatalog(pages, slug);
  if (!catalog || !catalog.published) return { title: "Catalog not found" };
  return {
    title: `${catalog.cardTitle} | Live tutor-led`,
    description: catalog.page.hero.subtitle,
  };
}

export default async function TutorLedCatalogLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const content = await readAdminContentFromDisk();
  const pages = mergeTutorLedCatalogPages(content.tutorLedCatalogPages, content.tutorLedCatalogPage);
  const catalog = findTutorLedCatalog(pages, slug);
  if (!catalog || !catalog.published) notFound();

  return (
    <div className="min-h-screen bg-[#07090f]">
      <FoodTutorLedCatalogLanding page={catalog.page} />
    </div>
  );
}
