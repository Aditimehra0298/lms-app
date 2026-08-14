import { notFound, redirect } from "next/navigation";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

export default async function TutorLedIndexPage() {
  const programs = await getPublishedTutorLedPrograms();
  const slug =
    programs.find((p) => p.programKind !== "workshop")?.slug ?? programs[0]?.slug;
  if (!slug) notFound();
  redirect(`/tutor-led/${slug}`);
}
