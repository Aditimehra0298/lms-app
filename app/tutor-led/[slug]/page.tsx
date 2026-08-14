import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import TutorLedProgramClient from "@/components/TutorLedProgramClient";
import { getTutorLedProgramBySlug, normalizeTutorLedSlug } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const program = await getTutorLedProgramBySlug(slug);
  if (!program || !program.published) return { title: "Program not found" };
  return { title: `${program.title} | Live training`, description: program.subtitle };
}

export default async function TutorLedCoursePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const key = normalizeTutorLedSlug(slug);
  const program = await getTutorLedProgramBySlug(key);

  if (!program) notFound();

  const previewDraft = preview === "1" || preview === "true";
  if (!program.published && !previewDraft) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <TutorLedProgramClient program={program} />
    </Suspense>
  );
}
