import { notFound, redirect } from "next/navigation";
import { DEFAULT_TUTOR_LED_SLUG } from "@/lib/tutor-led-routes";
import {
  getPublishedTutorLedPrograms,
  getTutorLedProgramBySlug,
} from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

export default async function TutorLedIndexPage() {
  const preferred = await getTutorLedProgramBySlug(DEFAULT_TUTOR_LED_SLUG);
  const programs = await getPublishedTutorLedPrograms();
  const slug =
    (preferred?.published !== false ? preferred?.slug : null) ??
    programs.find((p) => p.programKind !== "workshop")?.slug ??
    programs[0]?.slug;
  if (!slug) notFound();
  redirect(`/tutor-led/${slug}`);
}
