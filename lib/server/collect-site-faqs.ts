import {
  defaultCoursesPageConfig,
  type HomePageFaq,
} from "@/lib/content-schema";
import {
  FAQ_TARGET_COURSES_PAGE,
  FAQ_TARGET_HOME,
  faqTargetCourse,
  faqTargetTutorLed,
} from "@/lib/admin-faq-targets";
import type { SiteFaqGroup, SiteFaqItem } from "@/lib/site-faq-types";
import { readAdminContent } from "@/lib/server/content-store";
import { resolveHomePageConfig } from "@/lib/server/resolve-home-page";

export type { SiteFaqGroup, SiteFaqItem } from "@/lib/site-faq-types";

function validFaq(item: { q?: string; a?: string }): SiteFaqItem | null {
  const q = item.q?.trim() ?? "";
  const a = item.a?.trim() ?? "";
  if (!q || !a) return null;
  return { q, a };
}

function pushGroup(
  groups: SiteFaqGroup[],
  id: string,
  label: string,
  items: SiteFaqItem[],
  href?: string,
) {
  if (items.length === 0) return;
  groups.push({ id, label, href, items });
}

/** All FAQ sections from home, courses page, and published programs — for /faq. */
export async function collectSiteFaqGroups(): Promise<SiteFaqGroup[]> {
  const content = await readAdminContent();
  const homePage = await resolveHomePageConfig();
  const coursesPage = { ...defaultCoursesPageConfig, ...content.coursesPage };
  const managedCourses = content.managedCourses ?? [];
  const tutorLedPrograms = Array.isArray(content.tutorLedPrograms) ? content.tutorLedPrograms : [];

  const groups: SiteFaqGroup[] = [];

  const general = homePage.faqs.map((f) => validFaq(f)).filter((f): f is SiteFaqItem => f !== null);
  pushGroup(groups, FAQ_TARGET_HOME, "General", general);

  const coursesPageItems = coursesPage.faqs
    .map((f) => {
      const q = f.question?.trim() ?? "";
      const a =
        f.answer?.trim() ||
        "Browse our course catalog or contact support for detailed information about this topic.";
      return validFaq({ q, a });
    })
    .filter((f): f is SiteFaqItem => f !== null);
  pushGroup(groups, FAQ_TARGET_COURSES_PAGE, "Courses page", coursesPageItems, "/courses");

  for (const course of managedCourses) {
    if (!course.published) continue;
    const title = course.title?.trim() || course.slug;
    const items = (course.faqs ?? [])
      .map((f) => validFaq(f))
      .filter((f): f is SiteFaqItem => f !== null);
    pushGroup(groups, faqTargetCourse(course.slug), `Self-paced: ${title}`, items, `/courses/${course.slug}`);
  }

  for (const program of tutorLedPrograms ?? []) {
    if (!program.published) continue;
    const title = program.title?.trim() || program.slug;
    const items = (program.faqs ?? [])
      .map((f) => validFaq(f))
      .filter((f): f is SiteFaqItem => f !== null);
    pushGroup(
      groups,
      faqTargetTutorLed(program.slug),
      `Tutor-led: ${title}`,
      items,
      `/tutor-led/${program.slug}`,
    );
  }

  return groups;
}

/** Flat list (general first) for contact page preview and APIs. */
export async function collectSiteFaqsFlat(): Promise<HomePageFaq[]> {
  const groups = await collectSiteFaqGroups();
  const seen = new Set<string>();
  const flat: HomePageFaq[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const key = item.q.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      flat.push(item);
    }
  }
  return flat;
}
