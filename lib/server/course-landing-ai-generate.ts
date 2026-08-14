import type {
  ManagedCourse,
  ManagedCourseHeroSection,
  ManagedCourseInstructorSection,
  ManagedCourseOverviewSection,
} from "@/lib/content-schema";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import { slugifyCourseTitle, uniqueCourseSlug } from "@/lib/course-slugify";
import { DEFAULT_HACCP_CERTIFICATE_PREVIEW } from "@/lib/course-hero-resolve";

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

/** Visual / copy theme used when generating landing + hero defaults. */
export type CourseLandingTheme =
  | "cyber-security"
  | "food-safety"
  | "esg"
  | "medical-devices"
  | "management"
  | "general";

function apiKey(): string | null {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function model(): string {
  return process.env.OPENAI_COURSE_GENERATE_MODEL?.trim() || process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
}

export function isCourseLandingAiConfigured(): boolean {
  return Boolean(apiKey());
}

export function resolveLandingTheme(category?: string, titleHint?: string): CourseLandingTheme {
  const cat = canonicalCategorySlug(category ?? "");
  const blob = `${cat} ${titleHint ?? ""}`.toLowerCase();
  if (cat === "cyber-security" || /hack|pentest|cyber|soc|phishing|infosec|security/.test(blob)) {
    return "cyber-security";
  }
  if (cat === "food-safety" || /food|haccp|fsms|nutrition/.test(blob)) return "food-safety";
  if (cat === "esg" || /esg|sustainab|environment/.test(blob)) return "esg";
  if (cat === "medical-devices" || /medical|device|iso 13485/.test(blob)) return "medical-devices";
  if (cat === "management" || /leadership|management|iso 9001/.test(blob)) return "management";
  return "general";
}

type ThemePack = {
  label: string;
  tone: string;
  defaultImage: string;
  certificatePreview: string;
  trainerRole: string;
  trainerExperience: string;
  sidebarInstructors: { name: string; role: string }[];
  requirements: string[];
  categorySlug: string;
};

const THEME_PACKS: Record<CourseLandingTheme, ThemePack> = {
  "cyber-security": {
    label: "Cybersecurity / Ethical Hacking",
    tone: "Professional security training — labs, responsible disclosure, legal/ethical use, career outcomes. Never encourage illegal activity.",
    defaultImage: "/p2.png",
    certificatePreview: "",
    trainerRole: "Cybersecurity & Ethical Hacking Instructor",
    trainerExperience: "10+ years · SOC & pentest training",
    sidebarInstructors: [
      { name: "SFT Security Faculty", role: "Ethical hacking & defense" },
      { name: "Lab Coach", role: "Hands-on practice" },
    ],
    requirements: ["Basic IT / networking familiarity", "Legal interest in cybersecurity", "English reading skills"],
    categorySlug: "cyber-security",
  },
  "food-safety": {
    label: "Food Safety / HACCP / ISO",
    tone: "Audit-ready, compliance-focused, practical for plant / QA / FSMS roles.",
    defaultImage: "/course-food-safety.png",
    certificatePreview: DEFAULT_HACCP_CERTIFICATE_PREVIEW,
    trainerRole: "Food Safety & Compliance Specialist",
    trainerExperience: "10+ years industry training",
    sidebarInstructors: [
      { name: "SFT Expert Team", role: "Food Safety Trainers" },
      { name: "HACCP Specialist", role: "Audit & compliance" },
    ],
    requirements: ["Basic English", "Interest in food safety"],
    categorySlug: "food-safety",
  },
  esg: {
    label: "ESG / Sustainability",
    tone: "Clear corporate sustainability language — reporting, governance, and practical ESG programs.",
    defaultImage: "/p3.png",
    certificatePreview: "",
    trainerRole: "ESG & Sustainability Advisor",
    trainerExperience: "10+ years sustainability programs",
    sidebarInstructors: [
      { name: "SFT ESG Faculty", role: "Sustainability strategy" },
      { name: "Reporting Coach", role: "Disclosure & metrics" },
    ],
    requirements: ["Interest in sustainability", "Basic business literacy"],
    categorySlug: "esg",
  },
  "medical-devices": {
    label: "Medical Devices / Quality",
    tone: "Regulated medical-device quality language — ISO, risk, and patient-safety oriented.",
    defaultImage: "/p5.png",
    certificatePreview: "",
    trainerRole: "Medical Device Quality Specialist",
    trainerExperience: "10+ years device quality systems",
    sidebarInstructors: [
      { name: "SFT MDQ Faculty", role: "Quality systems" },
      { name: "Risk Coach", role: "ISO & risk management" },
    ],
    requirements: ["Basic quality / manufacturing awareness", "English reading skills"],
    categorySlug: "medical-devices",
  },
  management: {
    label: "Management / Leadership",
    tone: "Practical leadership and management systems — clear, professional, workplace-ready.",
    defaultImage: "/p4.jpg",
    certificatePreview: "",
    trainerRole: "Management Systems Trainer",
    trainerExperience: "10+ years leadership development",
    sidebarInstructors: [
      { name: "SFT Leadership Faculty", role: "People & process" },
      { name: "Systems Coach", role: "ISO / operations" },
    ],
    requirements: ["Workplace experience helpful", "English reading skills"],
    categorySlug: "management",
  },
  general: {
    label: "Professional skills",
    tone: "Clear global English, practical outcomes, SFT brand voice.",
    defaultImage: "/p2.png",
    certificatePreview: "",
    trainerRole: "SFT Subject-Matter Expert",
    trainerExperience: "10+ years industry training",
    sidebarInstructors: [
      { name: "SFT Expert Team", role: "Course faculty" },
      { name: "Learning Coach", role: "Learner support" },
    ],
    requirements: ["Basic English", "Interest in the topic"],
    categorySlug: "",
  },
};

function systemPromptForTheme(theme: CourseLandingTheme): string {
  const pack = THEME_PACKS[theme];
  return `You write professional LMS course landing pages for Sustainable Future Trainings (SFT).
Active theme for this request: ${pack.label}
Tone guidance: ${pack.tone}

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
    "aboutText": "2 paragraphs for About this course (shown under hero)",
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
- Match vocabulary and examples to the active theme
- Do not invent specific prices or fake statistics
- Use the user's description as the source of truth
- Clear global English
- Hero "aboutText" and "courseIncludes" must fit the same theme as the title`;
}

export async function generateCourseLandingFromDescription(input: {
  title: string;
  description: string;
  category?: string;
}): Promise<{ ok: true; data: GeneratedLandingFields; theme: CourseLandingTheme } | { ok: false; message: string }> {
  const key = apiKey();
  if (!key) {
    return { ok: false, message: "OPENAI_API_KEY is not set in .env.local" };
  }

  const theme = resolveLandingTheme(input.category, input.title);
  const pack = THEME_PACKS[theme];

  const userMessage = [
    `Course title (hint): ${input.title.trim()}`,
    `Category slug: ${input.category?.trim() || pack.categorySlug || "(infer from title)"}`,
    `Theme: ${pack.label}`,
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
          { role: "system", content: systemPromptForTheme(theme) },
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

    return { ok: true, data: parsed, theme };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "OpenAI request failed" };
  }
}

/** Merge AI output + theme defaults into a draft ManagedCourse (unpublished). */
export function buildManagedCourseFromGenerated(input: {
  generated: GeneratedLandingFields;
  slug: string;
  category?: string;
  sourceDescription?: string;
  theme?: CourseLandingTheme;
}): ManagedCourse {
  const g = input.generated;
  const title = g.title.trim();
  const subtitle = g.subtitle.trim();
  const theme = input.theme ?? resolveLandingTheme(input.category, title);
  const pack = THEME_PACKS[theme];
  const category = input.category?.trim() || pack.categorySlug || "food-safety";

  return {
    slug: input.slug,
    title,
    subtitle,
    category,
    level: g.level?.trim() || "Beginner",
    duration: g.duration?.trim() || "3h 00m",
    rating: "4.6",
    learners: "0",
    price: "$99.00",
    oldPrice: "$129.00",
    image: pack.defaultImage,
    published: false,
    learningFormat: "self-paced",
    instructorName: "SFT Expert Team",
    pageBadge: g.pageBadge?.trim() || "SELF-PACED",
    highlights: g.highlights?.length
      ? g.highlights
      : ["Self-paced e-learning", "Expert-led content", "Certificate on completion"],
    faqs: g.faqs?.filter((f) => f.q?.trim() && f.a?.trim()) ?? [],
    trainerRole: g.trainerRole?.trim() || pack.trainerRole,
    trainerExperience: g.trainerExperience?.trim() || pack.trainerExperience,
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
      certificatePreviewImage: pack.certificatePreview || undefined,
      aboutText: g.hero?.aboutText?.trim() || subtitle,
      courseIncludes: g.hero?.courseIncludes?.length ? g.hero.courseIncludes : g.highlights?.slice(0, 6),
      backgroundImage: pack.defaultImage,
      previewImage: pack.defaultImage,
    },
    instructorSection: {
      headline: g.instructorSection?.headline?.trim() || "Course Developed by SFT Expert Team",
      introParagraphs: g.instructorSection?.introParagraphs?.length
        ? g.instructorSection.introParagraphs
        : [subtitle],
      sidebarInstructors: g.instructorSection?.sidebarInstructors?.length
        ? g.instructorSection.sidebarInstructors
        : pack.sidebarInstructors,
    },
    overviewSection: {
      learnOutcomes: g.overviewSection?.learnOutcomes ?? [],
      whatYouLearn: g.overviewSection?.whatYouLearn ?? [],
      requirements: g.overviewSection?.requirements?.length
        ? g.overviewSection.requirements
        : pack.requirements,
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

/** Overlay AI landing copy onto an existing course — never wipe curriculum / media. */
export function applyGeneratedLandingToCourse(
  existing: ManagedCourse,
  generated: GeneratedLandingFields,
  theme?: CourseLandingTheme,
): ManagedCourse {
  const draft = buildManagedCourseFromGenerated({
    generated,
    slug: existing.slug,
    category: existing.category,
    theme: theme ?? resolveLandingTheme(existing.category, existing.title),
  });
  return {
    ...existing,
    title: generated.title?.trim() || existing.title,
    subtitle: generated.subtitle?.trim() || existing.subtitle,
    level: generated.level?.trim() || existing.level,
    duration: generated.duration?.trim() || existing.duration,
    pageBadge: generated.pageBadge?.trim() || existing.pageBadge,
    highlights: generated.highlights?.length ? generated.highlights : existing.highlights,
    faqs: generated.faqs?.filter((f) => f.q?.trim() && f.a?.trim()).length
      ? generated.faqs.filter((f) => f.q?.trim() && f.a?.trim())
      : existing.faqs,
    trainerRole: generated.trainerRole?.trim() || existing.trainerRole,
    trainerExperience: generated.trainerExperience?.trim() || existing.trainerExperience,
    trainerBio: generated.trainerBio?.trim() || existing.trainerBio,
    hero: {
      ...(existing.hero ?? {}),
      ...(draft.hero ?? {}),
      backgroundImage: existing.hero?.backgroundImage || existing.image || draft.hero?.backgroundImage,
      previewImage: existing.hero?.previewImage || existing.image || draft.hero?.previewImage,
      certificatePreviewImage:
        existing.hero?.certificatePreviewImage || draft.hero?.certificatePreviewImage,
    },
    instructorSection: {
      ...(existing.instructorSection ?? {}),
      ...(draft.instructorSection ?? {}),
      teamImage: existing.instructorSection?.teamImage,
    },
    overviewSection: {
      ...(existing.overviewSection ?? {}),
      ...(draft.overviewSection ?? {}),
    },
    seo: {
      ...(existing.seo ?? {}),
      ...(draft.seo ?? {}),
    },
    curriculum: existing.curriculum,
    image: existing.image || draft.image,
    price: existing.price,
    oldPrice: existing.oldPrice,
    basePrice: existing.basePrice,
    regionalPrices: existing.regionalPrices,
    organizationSeatPricing: existing.organizationSeatPricing,
    certificateConfig: existing.certificateConfig,
    settings: existing.settings,
    published: existing.published,
    learningFormat: existing.learningFormat ?? "self-paced",
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
