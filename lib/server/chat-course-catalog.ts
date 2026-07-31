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
  "cyber-security": [
    "cyber security",
    "cyber-security",
    "cybersecurity",
    "cyber",
    "phishing",
    "hacking",
    "cyberbers",
    "cyberber",
    "cybr",
    "cybersec",
  ],
  "information-security": ["information security", "iso 27001", "infosec", "security governance", "iso27001"],
  "medical-devices": ["medical device", "medical devices", "medtech"],
  "workplace-compliance": ["workplace compliance", "compliance", "osh", "health and safety"],
  "skill-development-framework": ["skill development", "soft skills"],
  "mechanical-engineering-hvac-and-refrigeration": ["hvac", "refrigeration", "mechanical engineering"],
};

/** Normalize messy user typing (typos, punctuation) for matching. */
export function normalizeChatQuery(message: string): string {
  return message
    .toLowerCase()
    .replace(/[=_]+/g, " ")
    .replace(/[^a-z0-9\s+-]/g, " ")
    .replace(/\b(im|nfortmation|informaton|infomation|inforamation)\b/g, "information")
    .replace(/\b(cours|couse|corse|coursees)\b/g, "course")
    .replace(/\b(cyberbers?|cyberber|cybrsecurity|cybersecuirty)\b/g, "cybersecurity")
    .replace(/\s+/g, " ")
    .trim();
}

/** Broad ask for LMS catalog (not a named topic like cyber / ESG). */
export function isGeneralCatalogQuestion(message: string): boolean {
  const q = normalizeChatQuery(message);
  if (!q) return false;
  // Specific topic → not general
  if (
    /\b(cyber|esg|food|hvac|phishing|medical|workplace|skill development|iso\s*27001|haccp|infosec|information security)\b/.test(
      q,
    )
  ) {
    return false;
  }
  return (
    /your courses?|course information|courses? information|give me .*courses?|tell me .*courses?|what courses|which courses|show .*courses?|all courses|catalog|training you offer|lms courses?|courses? (you|u) (have|offer)/.test(
      q,
    ) ||
    /^(can you|can u|could you|please )??(give|share|show|tell).*(course|training)/.test(q)
  );
}

function tokens(text: string): string[] {
  return text.split(/[\s/-]+/).filter((w) => w.length > 2);
}

/** Simple typo tolerance: shared prefix or close length edit distance. */
function fuzzyTokenMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) return true;
  if (Math.abs(a.length - b.length) > 3) return false;
  let distance = 0;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) distance++;
    if (distance > 2) return false;
  }
  return distance <= 2;
}

export function categoryLabel(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function countLessons(course: ManagedCourse): number {
  if (!course.curriculum?.length) return 0;
  return course.curriculum.reduce((sum, mod) => sum + (mod.items?.length ?? 0), 0);
}

function toDetail(course: ManagedCourse): ChatCourseDetail {
  const category = course.category?.trim() || "general";
  const highlightsRaw = course.highlights;
  const highlights = Array.isArray(highlightsRaw)
    ? highlightsRaw.map(String).slice(0, 4)
    : typeof highlightsRaw === "string"
      ? highlightsRaw
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 4)
      : [];

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
    highlights,
    faqs: course.faqs?.slice(0, 3) ?? [],
    coursePath: `/courses/${course.slug}`,
    categoryPath: `/courses/category/${category}`,
  };
}

/** Published catalog with price, content, and outcomes — same source as GET /api/courses. */
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
  const q = normalizeChatQuery(message);
  // Never treat generic "course information" as Information Security.
  if (isGeneralCatalogQuestion(q)) return null;

  for (const [slug, aliases] of Object.entries(CATEGORY_ALIASES)) {
    // Require meaningful alias hits — skip ultra-short tokens like lone "cyber" only when standalone enough
    if (aliases.some((a) => a.length >= 4 && q.includes(a))) return slug;
  }

  const qTokens = tokens(q);
  for (const [slug, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      const aliasTokens = tokens(alias).filter((t) => t.length >= 4);
      if (aliasTokens.some((at) => qTokens.some((qt) => qt.length >= 4 && fuzzyTokenMatch(qt, at)))) {
        return slug;
      }
    }
  }
  for (const slug of Object.keys(CATEGORY_LABELS)) {
    const label = slug.replace(/-/g, " ");
    if (label.length >= 5 && (q.includes(label) || q.includes(slug))) return slug;
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
  const q = normalizeChatQuery(message);
  if (!q) return [];
  // Broad catalog asks should not latch onto one course title.
  if (isGeneralCatalogQuestion(q)) return [];

  const qTokens = tokens(q).filter((t) => t.length >= 3 && !["course", "courses", "your", "give", "information", "info", "about", "want", "tell", "show", "please", "with", "from", "this", "that", "have", "what"].includes(t));
  if (!qTokens.length && !matchCategoryInMessage(q)) return [];

  const scored = catalog
    .map((course) => {
      const title = course.title.toLowerCase();
      const subtitle = course.subtitle.toLowerCase();
      const slugWords = course.slug.replace(/-/g, " ");
      const hay = `${title} ${subtitle} ${course.categoryLabel.toLowerCase()} ${slugWords}`;
      let score = 0;

      if (hay.includes(q) && q.length > 12) score += 8;
      if (q.includes(slugWords) && slugWords.length > 8) score += 6;
      if (q.includes(course.slug)) score += 5;

      const titleWords = tokens(title).filter((w) => w.length > 3);
      for (const w of titleWords) {
        if (q.includes(w)) score += 2;
        if (qTokens.some((qt) => fuzzyTokenMatch(qt, w))) score += 1;
      }

      for (const qt of qTokens) {
        if (qt.length >= 5 && hay.includes(qt)) score += 2;
      }

      const aliases = CATEGORY_ALIASES[course.category] ?? [];
      if (aliases.some((a) => a.length >= 4 && q.includes(a))) {
        score += 3;
      }

      return { course, score };
    })
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 8).map((r) => r.course);
}

export function pickFocusedCourse(
  message: string,
  catalog: ChatCourseDetail[],
  categorySlug: string | null,
): ChatCourseDetail | null {
  if (isGeneralCatalogQuestion(message)) return null;

  const q = normalizeChatQuery(message);
  if (categorySlug && /courses?\b|all\b|list\b|show me\b|options\b/.test(q) && !/about|detail|tell me more/.test(q)) {
    const inCat = coursesInCategory(catalog, categorySlug);
    if (inCat.length !== 1) return null;
  }

  const matched = matchCoursesInMessage(message, catalog);
  if (matched.length === 1) return matched[0];
  if (matched.length > 1 && /about|price|cost|duration|learn|detail|tell me|more info|how much/.test(q)) {
    if (categorySlug) {
      const inCat = matched.filter((c) => c.category === categorySlug);
      if (inCat.length === 1) return inCat[0];
      // Multiple in category → don't force one course
      if (inCat.length > 1) return null;
    }
    return matched[0];
  }
  if (categorySlug) {
    const inCat = coursesInCategory(catalog, categorySlug);
    if (inCat.length === 1) return inCat[0];
    return null;
  }
  return matched.length === 1 ? matched[0] : null;
}

export function isCourseDetailQuestion(message: string): boolean {
  const q = normalizeChatQuery(message);
  return /about|price|cost|how much|duration|length|learn|outcome|module|lesson|rating|who is it for|detail|tell me|information|info|what's in|what is in|want (to )?(know|learn)|i want/.test(
    q,
  );
}

export function isCategoryBrowseQuestion(message: string): boolean {
  const q = normalizeChatQuery(message);
  return /categor|type of course|what do you offer|areas|topics|browse|show me.*course|which course|courses (in|on|for)/.test(
    q,
  );
}

/** True when the user is asking about catalog / course info (not account support). */
export function isCourseCatalogQuestion(message: string): boolean {
  const q = normalizeChatQuery(message);
  if (!q) return false;
  if (/payment|refund|ticket|login|password|certificate|enrollment|my course/.test(q) && !/cyber|esg|food|hvac|course/.test(q)) {
    return false;
  }
  return (
    Boolean(matchCategoryInMessage(q)) ||
    /course|training|program|catalog|cyber|esg|haccp|hvac|phishing|iso|learn about|information|info|tell me about|details|price|duration/.test(
      q,
    )
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
