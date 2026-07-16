import type { ManagedCourse } from "@/lib/content-schema";
import { getManagedCourses } from "@/lib/server/course-catalog";

export type ChatCourseDetail = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  categoryLabel: string;
  level: string;
  duration: string;
  price: string;
  oldPrice: string | null;
  rating: string;
  learners: string;
  learningFormat: string;
  moduleCount: number;
  lessonCount: number;
  learnOutcomes: string[];
  highlights: string[];
  faqs: Array<{ q: string; a: string }>;
  coursePath: string;
  categoryPath: string;
};

export type ChatCategoryRef = {
  slug: string;
  label: string;
  count: number;
  categoryPath: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  esg: "ESG",
  "food-safety": "Food Safety",
  "cyber-security": "Cyber Security",
  "information-security": "Information Security",
  "medical-devices": "Medical Devices",
  "workplace-compliance": "Workplace Compliance",
  "skill-development-framework": "Skill Development",
  "mechanical-engineering-hvac-and-refrigeration": "Mechanical Engineering & HVAC",
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  esg: ["esg", "sustainability", "sustainable", "environmental", "climate", "governance"],
  "food-safety": ["food safety", "food-safety", "haccp", "fssc", "food fraud", "food"],
  "cyber-security": ["cyber security", "cyber-security", "cybersecurity", "phishing", "hacking"],
  "information-security": ["information security", "iso 27001", "infosec", "security governance"],
  "medical-devices": ["medical device", "medical devices", "medtech"],
  "workplace-compliance": ["workplace compliance", "compliance", "osh", "health and safety"],
  "skill-development-framework": ["skill development", "soft skills"],
  "mechanical-engineering-hvac-and-refrigeration": ["hvac", "refrigeration", "mechanical engineering"],
};

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function countLessons(course: ManagedCourse): number {
  if (!course.curriculum?.length) return 0;
  return course.curriculum.reduce((sum, mod) => sum + (mod.items?.length ?? 0), 0);
}

function toDetail(course: ManagedCourse): ChatCourseDetail {
  const category = course.category?.trim() || "general";
  return {
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle ?? "",
    category,
    categoryLabel: categoryLabel(category),
    level: course.level ?? "",
    duration: course.duration ?? "",
    price: course.price ?? "",
    oldPrice: course.oldPrice?.trim() || null,
    rating: course.rating ?? "",
    learners: course.learners ?? "",
    learningFormat: course.learningFormat ?? "self-paced",
    moduleCount: course.curriculum?.length ?? 0,
    lessonCount: countLessons(course),
    learnOutcomes: course.overviewSection?.learnOutcomes?.slice(0, 6) ?? [],
    highlights: course.highlights?.slice(0, 4) ?? [],
    faqs: course.faqs?.slice(0, 3) ?? [],
    coursePath: `/courses/${course.slug}`,
    categoryPath: `/courses/category/${category}`,
  };
}

/** Published catalog with price, content, and outcomes from admin JSON + MySQL backup. */
export async function loadChatCourseCatalog(): Promise<ChatCourseDetail[]> {
  const courses = await getManagedCourses();
  return courses.map(toDetail).sort((a, b) => a.title.localeCompare(b.title));
}

export function buildCategoryList(catalog: ChatCourseDetail[]): ChatCategoryRef[] {
  const counts = new Map<string, number>();
  for (const c of catalog) {
    counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([slug, count]) => ({
      slug,
      label: categoryLabel(slug),
      count,
      categoryPath: `/courses/category/${slug}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function matchCategoryInMessage(message: string): string | null {
  const q = message.toLowerCase();
  for (const [slug, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((a) => q.includes(a))) return slug;
  }
  for (const slug of Object.keys(CATEGORY_LABELS)) {
    if (q.includes(slug.replace(/-/g, " ")) || q.includes(slug)) return slug;
  }
  return null;
}

export function coursesInCategory(catalog: ChatCourseDetail[], categorySlug: string): ChatCourseDetail[] {
  return catalog.filter((c) => c.category === categorySlug);
}

export function matchCoursesInMessage(
  message: string,
  catalog: ChatCourseDetail[],
): ChatCourseDetail[] {
  const q = message.toLowerCase().trim();
  if (!q) return [];

  const scored = catalog
    .map((course) => {
      const hay = `${course.title} ${course.subtitle} ${course.categoryLabel} ${course.slug}`.toLowerCase();
      let score = 0;
      if (hay.includes(q)) score += 5;
      if (q.includes(course.slug.replace(/-/g, " "))) score += 4;
      const titleWords = course.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      for (const w of titleWords) {
        if (q.includes(w)) score += 1;
      }
      return { course, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 6).map((r) => r.course);
}

export function pickFocusedCourse(
  message: string,
  catalog: ChatCourseDetail[],
  categorySlug: string | null,
): ChatCourseDetail | null {
  const q = message.toLowerCase();
  if (categorySlug && /courses\b|all\b|list\b|show me\b|options\b/.test(q)) {
    const inCat = coursesInCategory(catalog, categorySlug);
    if (inCat.length !== 1) return null;
  }

  const matched = matchCoursesInMessage(message, catalog);
  if (matched.length === 1) return matched[0];
  if (matched.length > 1 && /about|price|cost|duration|learn|detail|tell me|more info|how much/.test(q)) {
    return matched[0];
  }
  if (categorySlug) {
    const inCat = coursesInCategory(catalog, categorySlug);
    if (inCat.length === 1) return inCat[0];
  }
  return matched[0] ?? null;
}

export function isCourseDetailQuestion(message: string): boolean {
  return /about|price|cost|how much|duration|length|learn|outcome|module|lesson|rating|who is it for|detail|tell me more|what's in|what is in/.test(
    message.toLowerCase(),
  );
}

export function isCategoryBrowseQuestion(message: string): boolean {
  return /categor|type of course|what do you offer|areas|topics|browse|show me.*course|which course/.test(
    message.toLowerCase(),
  );
}

export async function getChatCategoriesForUi(): Promise<
  Array<{ slug: string; label: string; count: number; prompt: string }>
> {
  const catalog = await loadChatCourseCatalog();
  return buildCategoryList(catalog).map((c) => ({
    slug: c.slug,
    label: c.label,
    count: c.count,
    prompt: `Show me ${c.label} courses with prices and details`,
  }));
}

export function formatCourseForAi(course: ChatCourseDetail): string {
  const lines = [
    `${course.title} [${course.slug}]`,
    `Category: ${course.categoryLabel} | Level: ${course.level} | Format: ${course.learningFormat}`,
    `Price: ${course.price}${course.oldPrice ? ` (was ${course.oldPrice})` : ""} | Duration: ${course.duration} | Rating: ${course.rating}`,
    course.subtitle ? `Summary: ${course.subtitle}` : "",
    course.moduleCount ? `Curriculum: ${course.moduleCount} modules, ${course.lessonCount} lessons` : "",
  ];
  if (course.learnOutcomes.length) {
    lines.push(`Learning outcomes: ${course.learnOutcomes.join("; ")}`);
  }
  if (course.highlights.length) {
    lines.push(`Highlights: ${course.highlights.join("; ")}`);
  }
  return lines.filter(Boolean).join("\n");
}
