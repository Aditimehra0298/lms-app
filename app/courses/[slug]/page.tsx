import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getManagedCourseBySlug } from "@/lib/server/course-catalog";
import { getTutorLedProgramBySlug } from "@/lib/server/tutor-led-catalog";
import { programLandingHref } from "@/lib/workshop-program";
import SelfPacedCourseShell from "@/components/SelfPacedCourseShell";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getManagedCourseBySlug(slug);
  if (!course) return { title: "Course not found" };
  const seo = course.seo;
  const title = seo?.metaTitle?.trim() || `${course.title} | SF Trainings`;
  const description = seo?.metaDescription?.trim() || course.subtitle;
  const images = seo?.ogImage?.trim() || course.image?.trim();
  return {
    title,
    description,
    robots: seo?.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      ...(images ? { images: [{ url: images }] } : {}),
    },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = await getManagedCourseBySlug(slug);
  if (!course) notFound();

  const tutorLed = await getTutorLedProgramBySlug(slug);
  if (tutorLed?.published && course.learningFormat !== "self-paced") {
    redirect(programLandingHref(tutorLed));
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SelfPacedCourseShell course={course} />
    </Suspense>
  );
}
