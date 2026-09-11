import type { Metadata } from "next";
import FoodTutorLedCatalogLanding from "@/components/FoodTutorLedCatalogLanding";
import { findTutorLedCatalog, mergeTutorLedCatalogPages } from "@/lib/tutor-led-catalog-landings";
import { readAdminContentFromDisk } from "@/lib/server/content-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ISO 22000:2018 Training Programs | Live tutor-led",
  description:
    "Four live online ISO 22000:2018 programs — Foundation, Implementation, Internal Auditor, and Lead Auditor.",
};

export default async function Iso22000TutorLedCatalogPage() {
  const adminContent = await readAdminContentFromDisk();
  const pages = mergeTutorLedCatalogPages(
    adminContent.tutorLedCatalogPages,
    adminContent.tutorLedCatalogPage,
  );
  const catalog = findTutorLedCatalog(pages, "iso-22000");
  const page = catalog?.page;
  if (!page) return null;

  return (
    <div className="min-h-screen bg-[#07090f]">
      <FoodTutorLedCatalogLanding page={page} />
    </div>
  );
}
