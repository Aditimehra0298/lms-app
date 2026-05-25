import { notFound, redirect } from "next/navigation";
import { DEFAULT_TUTOR_LED_SLUG } from "@/lib/tutor-led-routes";
import {
  getFirstPublishedTutorLedSlug,
  getPublishedTutorLedProgramBySlug,
  getTutorLedPrograms,
} from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

export default async function TutorLedIndexPage() {
  const preferred = await getPublishedTutorLedProgramBySlug(DEFAULT_TUTOR_LED_SLUG);
  const slug =
    preferred?.slug ??
    (await getFirstPublishedTutorLedSlug()) ??
    (await getTutorLedPrograms()).find((p) => p.slug)?.slug;
  if (!slug) notFound();
  redirect(`/tutor-led/${slug}`);
}
