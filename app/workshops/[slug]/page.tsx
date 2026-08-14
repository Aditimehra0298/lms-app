import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import TutorLedProgramClient from "@/components/TutorLedProgramClient";
import { isWorkshopProgram } from "@/lib/workshop-program";
import { getTutorLedProgramBySlug, normalizeTutorLedSlug } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const program = await getTutorLedProgramBySlug(slug);
  if (!program || !isWorkshopProgram(program) || !program.published) return { title: "Workshop not found" };
  return {
    title: `${program.title} | Live workshop`,
    description: program.subtitle,
  };
}

export default async function WorkshopLandingPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const key = normalizeTutorLedSlug(slug);
  const program = await getTutorLedProgramBySlug(key);

  if (!program || !isWorkshopProgram(program)) notFound();

  const previewDraft = preview === "1" || preview === "true";
  if (!program.published && !previewDraft) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <TutorLedProgramClient program={program} variant="workshop" />
    </Suspense>
  );
}
