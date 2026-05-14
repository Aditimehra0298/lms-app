/**
 * Shared course detail layout: Food Safety Diploma keeps its full manual curriculum;
 * all other courses reuse the same visual pattern with generic module labels tied to the course title.
 */

import type { CourseCurriculumItem, CourseCurriculumModule } from "./content-schema";

export type CurriculumRow = CourseCurriculumItem;

export type CurriculumModule = CourseCurriculumModule;

/** Full HACCP Diploma manual track (reference design). */
export const FOOD_SAFETY_DIPLOMA_CURRICULUM: CurriculumModule[] = [
  {
    title: "General Instructions for Candidate",
    items: [
      { label: "Video — How to use this course & navigation", kind: "video" },
      { label: "Reading — Policies, attempts & certificate rules", kind: "reading" },
      { label: "Knowledge check (5 questions)", kind: "exam" },
    ],
  },
  {
    title: "Introduction Module - Introduction to Food Safety",
    items: [
      { label: "Video — Introduction to food safety concepts", kind: "video" },
      { label: "Reading — Key terms & reference material", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 2 - HACCP Awareness and Food Safety Basics",
    items: [
      { label: "Video — HACCP principles walkthrough", kind: "video" },
      { label: "Reading — Uploaded workbook / slides", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 3 - Food Safety Culture",
    items: [
      { label: "Video — Building a positive food safety culture", kind: "video" },
      { label: "Reading — Case study PDF", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 4 - Food Handler Behaviour and Hygiene",
    items: [
      { label: "Video — Hygiene in practice", kind: "video" },
      { label: "Reading — Checklists & SOP excerpts", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 5 - Food Safety and Consumer Health",
    items: [
      { label: "Video — Consumer health linkages", kind: "video" },
      { label: "Reading — Regulatory overview notes", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 6 - Company Reputation and Legal Responsibilities",
    items: [
      { label: "Video — Legal & reputational risk", kind: "video" },
      { label: "Reading — Compliance reading pack", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 7 - Food Hazards and Food Safety Management",
    items: [
      { label: "Video — Hazard analysis introduction", kind: "video" },
      { label: "Reading — Management system outline", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 8 - Foodborne Hazards",
    items: [
      { label: "Video — Foodborne illness pathways", kind: "video" },
      { label: "Reading — Pathogen fact sheet", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 9 - Biological Hazards",
    items: [
      { label: "Video — Biological contamination controls", kind: "video" },
      { label: "Reading — Lab summary notes", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 10 - Chemical Hazards",
    items: [
      { label: "Video — Chemical hazards in operations", kind: "video" },
      { label: "Reading — SDS reference reading", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
  {
    title: "Module 11 - Physical Hazards",
    items: [
      { label: "Video — Physical hazard prevention", kind: "video" },
      { label: "Reading — Inspection guidelines", kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  },
];

const GENERIC_MODULE_BLUEPRINT: [string, string, string][] = [
  ["Introduction & orientation", "Course overview and learning outcomes", "Handbook, glossary, and resources"],
  ["Core foundations", "Key principles and terminology", "Reference readings and frameworks"],
  ["Applied practices", "Scenario-based lesson", "Worksheets, templates, and examples"],
  ["Standards & compliance", "Regulatory and policy context", "Checklists and guidance notes"],
  ["Risk assessment & controls", "Identification and mitigation walkthrough", "Case studies and exercises"],
  ["Implementation", "Operational best practices on the job", "SOP excerpts and job aids"],
  ["Review & assessment prep", "Summary and practice session", "Revision materials and sample questions"],
  ["Capstone & certification path", "Final wrap-up and next steps", "Completion requirements overview"],
];

export function formatCategoryLabel(categorySlug: string | undefined): string {
  if (!categorySlug || !categorySlug.trim()) return "Professional Training";
  return categorySlug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function buildGenericCurriculum(courseTitle: string): CurriculumModule[] {
  const topic = courseTitle.replace(/\s*\([^)]*\)\s*$/, "").trim() || "this program";
  const header: CurriculumModule = {
    title: "General Instructions for Candidate",
    items: [
      { label: "Video — How to use this course & navigation", kind: "video" },
      { label: "Reading — Policies, attempts & certificate rules", kind: "reading" },
      { label: "Knowledge check (5 questions)", kind: "exam" },
    ],
  };
  const rest: CurriculumModule[] = GENERIC_MODULE_BLUEPRINT.map(([modTitle, videoDesc, readingDesc], i) => ({
    title: `Module ${i + 1} — ${modTitle} (${topic})`,
    items: [
      { label: `Video — ${videoDesc}`, kind: "video" },
      { label: `Reading — ${readingDesc}`, kind: "reading" },
      { label: "Module examination (10 MCQs)", kind: "exam" },
    ],
  }));
  return [header, ...rest];
}

/** Food Safety Diploma manual keeps its uploaded curriculum; everything else mirrors the same UI pattern. */
/** Ensures persisted JSON always has `items` arrays and optional `subModules` shapes. */
export function normalizeCurriculumModules(modules: CourseCurriculumModule[]): CourseCurriculumModule[] {
  return modules.map((m) => ({
    ...m,
    items: Array.isArray(m.items) ? m.items : [],
    subModules: m.subModules?.length
      ? m.subModules.map((sm) => ({
          ...sm,
          items: Array.isArray(sm.items) ? sm.items : [],
        }))
      : undefined,
  }));
}

export function getCurriculumForCourse(
  slug: string,
  _category: string | undefined,
  title: string,
  persisted?: CourseCurriculumModule[] | null,
): CurriculumModule[] {
  if (persisted && persisted.length > 0) {
    return normalizeCurriculumModules(persisted);
  }
  if (slug === "food-safety-masterclass") {
    return FOOD_SAFETY_DIPLOMA_CURRICULUM;
  }
  return buildGenericCurriculum(title);
}

export function totalCurriculumSteps(modules: CurriculumModule[]): number {
  return modules.reduce((sum, m) => {
    let n = m.items.length;
    if (m.subModules?.length) {
      for (const sm of m.subModules) n += sm.items.length;
    }
    return sum + n;
  }, 0);
}

export function learningOutcomeBullets(title: string): string[] {
  const t = title.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return [
    `Understand the core ideas and vocabulary used throughout ${t}`,
    "Follow structured video lessons and supporting readings in order",
    "Apply practical techniques to realistic workplace scenarios",
    "Recognize compliance expectations and common risk areas in the domain",
    "Use checklists, templates, and documentation approaches introduced in the course",
    "Prepare for module examinations with confidence",
    "Demonstrate readiness for certificate requirements upon completion",
    "Stay aligned with SF Trainings delivery and support processes",
  ];
}

export function whatYouLearnGrid(title: string): [string, string][] {
  const t = title.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return [
    ["Foundations", `Grasp essential concepts and context for ${t}.`],
    ["Frameworks & standards", "See how industry expectations map to everyday practice."],
    ["Hands-on application", "Translate lessons into steps you can use on the job."],
    ["Documentation & evidence", "Know what to record and how to show due diligence."],
    ["Assessment readiness", "Practice with question styles used in module exams."],
    ["Career relevance", "Build credentials employers and auditors recognize."],
  ];
}

export function requirementBullets(domainHint: string): string[] {
  return [
    "A registered account or valid login credentials on the LMS",
    "Stable internet connection",
    "Laptop, desktop, tablet, or mobile device",
    "Updated browser such as Chrome, Edge, Firefox, or Safari",
    "Headphones or speakers for clear audio",
    `Interest or basic familiarity with ${domainHint} is helpful but not mandatory`,
    "Enough time to watch each video module completely",
    "Ability to complete short MCQ-based assessments after modules",
    "Access to email for course updates, support communication, and certificate notifications",
  ];
}

export function instructorExpertiseChips(categoryLabel: string): string[] {
  const base = [
    "Industry practitioners",
    "Audit-ready thinking",
    "Practical job aids",
    "Certificate pathway",
  ];
  if (/food|haccp|hygiene/i.test(categoryLabel)) {
    return ["HACCP alignment", "Food safety culture", "Regulatory context", ...base.slice(0, 2)];
  }
  if (/cyber|security/i.test(categoryLabel)) {
    return ["Threat awareness", "Controls & hygiene", "Incident basics", ...base.slice(0, 2)];
  }
  if (/esg|sustain/i.test(categoryLabel)) {
    return ["Reporting literacy", "Risk & governance", "Material topics", ...base.slice(0, 2)];
  }
  return [`${categoryLabel} focus`, "Applied exercises", "Expert Q&A support", ...base.slice(0, 1)];
}

export type QAItem = { name: string; module: string; question: string; answers: string; likes: string };

export function genericQAItems(courseTitle: string): QAItem[] {
  const short = courseTitle.slice(0, 42);
  return [
    {
      name: "Amit Kumar",
      module: "Module 2 — Core foundations",
      question: `How much time should I budget weekly to stay on track for ${short}?`,
      answers: "3 Answers",
      likes: "12",
    },
    {
      name: "Neha Sharma",
      module: "Module 4 — Standards & compliance",
      question: "Are the module exams timed, and can I revisit readings during an attempt?",
      answers: "2 Answers",
      likes: "8",
    },
    {
      name: "Deepak Patel",
      module: "Module 6 — Implementation",
      question: "Where can I download the worksheets mentioned in the reading sections?",
      answers: "1 Answer",
      likes: "5",
    },
  ];
}

export type ReviewSample = {
  name: string;
  role: string;
  time: string;
  review: string;
  helpful: number;
};

export function genericReviewSamples(courseTitle: string): ReviewSample[] {
  const t = courseTitle.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return [
    {
      name: "Ravi Kumar",
      role: "Verified Learner",
      time: "2 days ago",
      review: `Clear structure and practical examples throughout ${t}. The mix of video and short assessments kept me engaged.`,
      helpful: 24,
    },
    {
      name: "Priya Singh",
      role: "Verified Learner",
      time: "1 week ago",
      review:
        "Professional delivery and useful downloadable materials. Quizzes matched what was taught in each module—great experience overall.",
      helpful: 18,
    },
  ];
}
