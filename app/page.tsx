import { Suspense } from "react";
import LearnlyLanding from "@/components/LearnlyLanding";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { readAdminContent } from "@/lib/server/content-store";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";
import { getPublishedTutorLedPrograms } from "@/lib/server/tutor-led-catalog";

export const dynamic = "force-dynamic";

export default async function Page() {
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
