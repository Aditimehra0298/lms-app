import type { AdminContent, CoursesPageFaq, HomePageFaq, HomePageConfig } from "@/lib/content-schema";
import {
  defaultAdminContent,
  defaultCoursesPageConfig,
  defaultHomePageConfig,
} from "@/lib/content-schema";
import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";

export type FaqTargetId = string;

export type FaqTargetOption = {
  id: FaqTargetId;
  label: string;
  description: string;
  previewHref: string;
  /** Shown on public /faq as section heading */
  publicSectionLabel: string;
};

export const FAQ_TARGET_HOME = "home";
export const FAQ_TARGET_COURSES_PAGE = "courses-page";

export function faqTargetCourse(slug: string): FaqTargetId {
  return `course:${slug}`;
}

export function faqTargetTutorLed(slug: string): FaqTargetId {
  return `tutor-led:${slug}`;
}

export function normalizeFaqRows(
  rows: { q?: string; a?: string; question?: string; answer?: string }[],
): HomePageFaq[] {
  return rows.map((f) => ({
    q: (f.q ?? f.question ?? "").trim(),
    a: (f.a ?? f.answer ?? "").trim(),
  }));
}

export function buildFaqTargetOptions(content: AdminContent): FaqTargetOption[] {
  const managed = content.managedCourses ?? defaultAdminContent.managedCourses;
  const tutorLed = content.tutorLedPrograms?.length
    ? content.tutorLedPrograms
    : defaultTutorLedPrograms;

  const options: FaqTargetOption[] = [
    {
      id: FAQ_TARGET_HOME,
      label: "General (Home, Contact & /faq)",
      description: "Main site FAQs — home page block, contact page preview, and /faq general section.",
      previewHref: "/faq",
      publicSectionLabel: "General",
    },
    {
      id: FAQ_TARGET_COURSES_PAGE,
      label: "Courses page (/courses)",
      description: "FAQ block on the courses catalog page.",
      previewHref: "/courses",
      publicSectionLabel: "Courses page",
    },
  ];

  for (const c of managed) {
    if (!c.published) continue;
    const slug = c.slug?.trim();
    if (!slug) continue;
    const title = c.title?.trim() || slug;
    options.push({
      id: faqTargetCourse(slug),
      label: `Self-paced: ${title}`,
      description: `FAQs on /courses/${slug}`,
      previewHref: `/courses/${slug}`,
      publicSectionLabel: `Self-paced: ${title}`,
    });
  }

  for (const p of tutorLed) {
    if (!p.published) continue;
    const slug = p.slug?.trim();
    if (!slug) continue;
    const title = p.title?.trim() || slug;
    options.push({
      id: faqTargetTutorLed(slug),
      label: `Tutor-led: ${title}`,
      description: `FAQs on /tutor-led/${slug}`,
      previewHref: `/tutor-led/${slug}`,
      publicSectionLabel: `Tutor-led: ${title}`,
    });
  }

  return options;
}

export function getFaqTargetOption(options: FaqTargetOption[], id: FaqTargetId): FaqTargetOption | undefined {
  return options.find((o) => o.id === id);
}

export function loadFaqsForTarget(content: AdminContent, targetId: FaqTargetId): HomePageFaq[] {
  const coursesPage = { ...defaultCoursesPageConfig, ...content.coursesPage };
  const homePage = { ...defaultHomePageConfig, ...content.homePage };

  if (targetId === FAQ_TARGET_HOME) {
    return normalizeFaqRows(homePage.faqs ?? []);
  }
  if (targetId === FAQ_TARGET_COURSES_PAGE) {
    return normalizeFaqRows(coursesPage.faqs ?? []);
  }
  if (targetId.startsWith("course:")) {
    const slug = targetId.slice("course:".length);
    const course = (content.managedCourses ?? []).find((c) => c.slug === slug);
    return normalizeFaqRows(course?.faqs ?? []);
  }
  if (targetId.startsWith("tutor-led:")) {
    const slug = targetId.slice("tutor-led:".length);
    const programs = content.tutorLedPrograms?.length ? content.tutorLedPrograms : defaultTutorLedPrograms;
    const program = programs.find((p) => p.slug === slug);
    return normalizeFaqRows(program?.faqs ?? []);
  }
  return [];
}

export function loadHomeFaqExtras(content: AdminContent): Pick<HomePageConfig, "faqPage" | "faqImage"> {
  const homePage = { ...defaultHomePageConfig, ...content.homePage };
  return {
    faqPage: { ...defaultHomePageConfig.faqPage, ...homePage.faqPage },
    faqImage: homePage.faqImage ?? defaultHomePageConfig.faqImage,
  };
}

function toCoursesPageFaqs(faqs: HomePageFaq[]): CoursesPageFaq[] {
  return faqs.map((f) => ({ question: f.q, answer: f.a }));
}

/** Apply FAQ rows for one target into a copy of admin content. */
export function applyFaqsToAdminContent(
  content: AdminContent,
  targetId: FaqTargetId,
  faqs: HomePageFaq[],
  homeExtras?: Pick<HomePageConfig, "faqPage" | "faqImage">,
): AdminContent {
  const cleaned = faqs.filter((f) => f.q.trim() || f.a.trim()).map((f) => ({ q: f.q.trim(), a: f.a.trim() }));

  if (targetId === FAQ_TARGET_HOME) {
    const prev = { ...defaultHomePageConfig, ...content.homePage };
    return {
      ...content,
      homePage: {
        ...prev,
        faqs: cleaned,
        ...(homeExtras?.faqPage ? { faqPage: homeExtras.faqPage } : {}),
        ...(homeExtras?.faqImage !== undefined ? { faqImage: homeExtras.faqImage } : {}),
      },
    };
  }

  if (targetId === FAQ_TARGET_COURSES_PAGE) {
    const prev = { ...defaultCoursesPageConfig, ...content.coursesPage };
    return {
      ...content,
      coursesPage: { ...prev, faqs: toCoursesPageFaqs(cleaned) },
    };
  }

  if (targetId.startsWith("course:")) {
    const slug = targetId.slice("course:".length);
    return {
      ...content,
      managedCourses: (content.managedCourses ?? []).map((c) =>
        c.slug === slug ? { ...c, faqs: cleaned } : c,
      ),
    };
  }

  if (targetId.startsWith("tutor-led:")) {
    const slug = targetId.slice("tutor-led:".length);
    const programs = content.tutorLedPrograms?.length ? content.tutorLedPrograms : defaultTutorLedPrograms;
    return {
      ...content,
      tutorLedPrograms: programs.map((p) => (p.slug === slug ? { ...p, faqs: cleaned } : p)),
    };
  }

  return content;
}
