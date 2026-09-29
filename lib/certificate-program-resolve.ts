import type { AdminContent, ManagedCourse } from "@/lib/content-schema";
import { canonicalCourseSlug } from "@/lib/course-slug-aliases";

/** Unified certificate policy source — self-paced course or tutor-led program. */
export type CertificateProgramRef = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  level: string;
  duration: string;
  published: boolean;
  learningFormat?: ManagedCourse["learningFormat"];
  certificateConfig?: ManagedCourse["certificateConfig"];
  hero?: ManagedCourse["hero"];
};

function slugMatches(a: string, b: string): boolean {
  const left = canonicalCourseSlug(a) || a.trim().toLowerCase();
  const right = canonicalCourseSlug(b) || b.trim().toLowerCase();
  return Boolean(left && right && left === right);
}

export function findCertificateProgram(
  content: AdminContent,
  courseSlug: string,
): CertificateProgramRef | undefined {
  const slug = courseSlug.trim();
  if (!slug) return undefined;

  const course = content.managedCourses?.find((c) => slugMatches(c.slug, slug));
  if (course) {
    return {
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      category: course.category,
      level: course.level,
      duration: course.duration,
      published: course.published,
      learningFormat: course.learningFormat,
      certificateConfig: course.certificateConfig,
      hero: course.hero,
    };
  }

  const program = content.tutorLedPrograms?.find((p) => slugMatches(p.slug, slug));
  if (program) {
    return {
      slug: program.slug,
      title: program.title,
      subtitle: program.subtitle ?? "",
      category: "Tutor-led",
      level: "Professional",
      duration: program.schedule?.trim() || program.batchLabel?.trim() || "",
      published: program.published,
      learningFormat: "live",
      certificateConfig: program.certificateConfig,
      hero: undefined,
    };
  }

  return undefined;
}
