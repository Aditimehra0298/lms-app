import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getManagedCourseBySlug } from "@/lib/server/course-catalog";
import SelfPacedCourseShell from "@/components/SelfPacedCourseShell";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getManagedCourseBySlug(slug);
  if (!course) return { title: "Course not found" };
  return { title: `${course.title} | Courses`, description: course.subtitle };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = await getManagedCourseBySlug(slug);
  if (!course) notFound();

  return <SelfPacedCourseShell course={course} />;
}
