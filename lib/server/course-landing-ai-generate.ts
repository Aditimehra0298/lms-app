import type {
  ManagedCourse,
  ManagedCourseHeroSection,
  ManagedCourseInstructorSection,
  ManagedCourseOverviewSection,
} from "@/lib/content-schema";
import { slugifyCourseTitle, uniqueCourseSlug } from "@/lib/course-slugify";

const OPENAI_BASE = "https://api.openai.com/v1";

export type GeneratedLandingFields = {
  title: string;
  subtitle: string;
  pageBadge?: string;
  level?: string;
  duration?: string;
  highlights?: string[];
  faqs?: { q: string; a: string }[];
  trainerRole?: string;
  trainerExperience?: string;
  trainerBio?: string;
  hero?: Pick<ManagedCourseHeroSection, "aboutText" | "courseIncludes" | "lectureCount">;
  instructorSection?: Pick<
    ManagedCourseInstructorSection,
    "headline" | "introParagraphs" | "sidebarInstructors"
  >;
  overviewSection?: Pick<
    ManagedCourseOverviewSection,
    "learnOutcomes" | "whatYouLearn" | "requirements"
  >;
  seo?: { metaTitle?: string; metaDescription?: string; focusKeyword?: string };
};

function apiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function model(): string {
  return process.env.OPENAI_COURSE_GENERATE_MODEL?.trim() || process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
}

export function isCourseLandingAiConfigured(): boolean {
  return Boolean(apiKey());
}

const SYSTEM_PROMPT = `You write professional LMS course landing pages for Sustainable Future Trainings (food safety, HACCP, FSSC, BRCGS, ISO 22000, auditing).

Return ONLY valid JSON matching this schema (no markdown):
{
  "title": "Full course title",
  "subtitle": "2-3 sentence marketing subtitle",
  "pageBadge": "SELF-PACED",
  "level": "Beginner | Intermediate | Advanced",
  "duration": "e.g. 4h 00m",
  "highlights": ["8-10 short bullet strings for enroll card"],
  "faqs": [{"q":"...","a":"..."}, ... 5-6 items],
  "trainerRole": "short role line",
  "trainerExperience": "e.g. 10+ years · 5000+ learners",
  "trainerBio": "2 paragraphs about SFT Expert Team",
  "hero": {
    "aboutText": "2 paragraphs for About this course",
    "courseIncludes": ["5-7 sidebar bullets"],
    "lectureCount": "e.g. 8 Lectures"
  },
  "instructorSection": {
    "headline": "Course Developed by ...",
    "introParagraphs": ["3 paragraphs"],
    "sidebarInstructors": [{"name":"...","role":"..."}, ... 3-4]
  },
  "overviewSection": {
    "learnOutcomes": ["5-7 outcome bullets"],
    "whatYouLearn": [{"title":"Topic","description":"One line"}, ... 4-6],
    "requirements": ["3-5 prerequisite bullets"]
  },
  "seo": {
    "metaTitle": "60 chars max",
    "metaDescription": "150 chars max",
    "focusKeyword": "main keyword phrase"
  }
}

Rules:
- Professional, audit-ready tone for food industry learners
- Do not invent specific prices or fake statistics
- Use the user's description as the source of truth
- British/Australian spelling is fine; keep clear global English`;

export async function generateCourseLandingFromDescription(input: {
  title: string;
  description: string;
}): Promise<{ ok: true; data: GeneratedLandingFields } | { ok: false; message: string }> {
  const key = apiKey();
  if (!key) {
    return { ok: false, message: "OPENAI_API_KEY is not set in .env.local" };
  }

  const userMessage = [
    `Course title (hint): ${input.title.trim()}`,
    "",
    "Course description / notes from admin:",
    input.description.trim() || input.title.trim(),
  ].join("\n");

  try {
    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model(),
        temperature: 0.5,
        max_tokens: 3500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const raw = await res.text();
    let data: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return { ok: false, message: raw.slice(0, 200) || `OpenAI ${res.status}` };
    }

    if (!res.ok) {
      return { ok: false, message: data.error?.message ?? `OpenAI ${res.status}` };
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { ok: false, message: "OpenAI returned empty JSON." };

    const parsed = JSON.parse(content) as GeneratedLandingFields;
    if (!parsed.title?.trim()) parsed.title = input.title.trim();
    if (!parsed.subtitle?.trim()) parsed.subtitle = input.description.trim().slice(0, 280);

    return { ok: true, data: parsed };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "OpenAI request failed" };
  }
}

const DEFAULT_FOOD_IMAGE = "/course-food-safety.png";

/** Merge AI output + defaults into a draft ManagedCourse (unpublished). */
export function buildManagedCourseFromGenerated(input: {
  generated: GeneratedLandingFields;
  slug: string;
  category?: string;
  sourceDescription?: string;
}): ManagedCourse {
  const g = input.generated;
  const title = g.title.trim();
  const subtitle = g.subtitle.trim();

  return {
    slug: input.slug,
    title,
    subtitle,
    category: input.category?.trim() || "food-safety",
    level: g.level?.trim() || "Beginner",
    duration: g.duration?.trim() || "3h 00m",
    rating: "4.6",
    learners: "0",
    price: "$99.00",
    oldPrice: "$129.00",
    image: DEFAULT_FOOD_IMAGE,
    published: false,
    learningFormat: "self-paced",
    instructorName: "SFT Expert Team",
    pageBadge: g.pageBadge?.trim() || "SELF-PACED",
    highlights: g.highlights?.length ? g.highlights : ["Self-paced e-learning", "Expert-led content", "Certificate on completion"],
    faqs: g.faqs?.filter((f) => f.q?.trim() && f.a?.trim()) ?? [],
    trainerRole: g.trainerRole?.trim() || "Food Safety & Compliance Specialist",
    trainerExperience: g.trainerExperience?.trim() || "10+ years industry training",
    trainerBio: g.trainerBio?.trim() || "",
    trainerCertifications: ["Certified Trainer"],
    trainerWorkedWith: ["SFT"],
    hero: {
      previewLabel: "Preview this Course",
      ratingCount: "4.5",
      studentsLabel: "New",
      language: "English",
      captions: "English [Auto]",
      lectureCount: g.hero?.lectureCount?.trim() || "Self-paced modules",
      certificate: "Yes",
      access: "Lifetime",
      shareable: "Yes",
      moneyBackGuarantee: "7 days money-back guarantee",
      enrollButtonLabel: "Enroll Now",
      wishlistButtonLabel: "Add to Wishlist",
      certificatePreviewLabel: "Certificate of Attainment",
      aboutText: g.hero?.aboutText?.trim() || subtitle,
      courseIncludes: g.hero?.courseIncludes?.length ? g.hero.courseIncludes : g.highlights?.slice(0, 6),
      backgroundImage: DEFAULT_FOOD_IMAGE,
      previewImage: DEFAULT_FOOD_IMAGE,
    },
    instructorSection: {
      headline: g.instructorSection?.headline?.trim() || "Course Developed by SFT Expert Team",
      introParagraphs: g.instructorSection?.introParagraphs?.length
        ? g.instructorSection.introParagraphs
        : [subtitle],
      sidebarInstructors: g.instructorSection?.sidebarInstructors?.length
        ? g.instructorSection.sidebarInstructors
        : [
            { name: "SFT Expert Team", role: "Food Safety Trainers" },
            { name: "HACCP Specialist", role: "Audit & compliance" },
          ],
    },
    overviewSection: {
      learnOutcomes: g.overviewSection?.learnOutcomes ?? [],
      whatYouLearn: g.overviewSection?.whatYouLearn ?? [],
      requirements: g.overviewSection?.requirements ?? ["Basic English", "Interest in food safety"],
    },
    seo: {
      metaTitle: g.seo?.metaTitle?.trim() || title.slice(0, 60),
      metaDescription: g.seo?.metaDescription?.trim() || subtitle.slice(0, 155),
      focusKeyword: g.seo?.focusKeyword?.trim() || slugifyCourseTitle(title).replace(/-/g, " "),
    },
    settings: {
      showInCatalog: true,
      enrollmentOpen: true,
      allowQa: true,
    },
    certificateConfig: {
      enabled: true,
      provider: "n8n",
      showInLearnerDashboard: true,
      autoVisibleWhenReady: true,
      requireAdminApproval: false,
    },
    organizationSeatPricing: [],
    regionalPrices: [],
  };
}

export function assignUniqueSlugs(
  rows: Array<{ title: string; slug?: string }>,
  existingSlugs: Set<string>,
): string[] {
  const taken = new Set(existingSlugs);
  return rows.map((row) => {
    const base = row.slug?.trim() || row.title;
    const slug = uniqueCourseSlug(base, taken);
    taken.add(slug);
    return slug;
  });
}
