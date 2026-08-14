import { Suspense } from "react";
import { redirect } from "next/navigation";
import LearnlyLanding from "@/components/LearnlyLanding";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { readAdminContent } from "@/lib/server/content-store";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

const COMING_SOON_AUDIENCES = ["industry", "auditor", "university", "associators"] as const;

type PageProps = {
  searchParams: Promise<{ for?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { for: audienceFor } = await searchParams;
  if (audienceFor && COMING_SOON_AUDIENCES.includes(audienceFor as (typeof COMING_SOON_AUDIENCES)[number])) {
    redirect(`/coming-soon?for=${audienceFor}`);
  }

  const [homeConfig, content, courses, tutorLedPrograms] = await Promise.all([
    resolveHomePageConfig(),
    readAdminContent(),
    getManagedCourses(),
    getPublishedTutorLedPrograms(),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05070f]" aria-hidden />}>
      <LearnlyLanding
        initialData={{
          homeConfig,
          categories: content.categories.filter((category) => category.isActive),
          courses,
          tutorLedPrograms,
        }}
      />
    </Suspense>
  );
}
