import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedTutorLedProgramBySlug } from "@/lib/server/tutor-led-catalog";
import TutorLedProgramClient from "@/components/TutorLedProgramClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const program = await getPublishedTutorLedProgramBySlug(slug);
  if (!program) return { title: "Program not found" };
  return { title: `${program.title} | Live training`, description: program.subtitle };
}

export default async function TutorLedCoursePage({ params }: PageProps) {
  const { slug } = await params;
  const program = await getPublishedTutorLedProgramBySlug(slug);
  if (!program) notFound();

  return <TutorLedProgramClient program={program} />;
}
