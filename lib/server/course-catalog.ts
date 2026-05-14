import { defaultAdminContent } from "@/lib/content-schema";
import { readAdminContent } from "@/lib/server/content-store";

export async function getManagedCourses() {
  const content = await readAdminContent();
  const courses =
    content.managedCourses && content.managedCourses.length > 0
      ? content.managedCourses
      : defaultAdminContent.managedCourses;
  return courses.filter((course) => course.published);
}

export async function getManagedCourseBySlug(slug: string) {
  const courses = await getManagedCourses();
  return courses.find((course) => course.slug === slug);
}
