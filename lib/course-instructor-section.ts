import type { ManagedCourse, ManagedCourseInstructorSection } from "@/lib/content-schema";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import { instructorExpertiseChips } from "@/lib/course-detail-template";

export type InstructorPillar = {
  title: string;
  description: string;
};

export type ExpertiseCard = {
  title: string;
  subtitle: string;
  tone: "emerald" | "sky" | "orange" | "violet" | "amber";
};

export type SidebarInstructorCard = {
  name: string;
  role: string;
  accent: string;
};

export type ResolvedInstructorSection = {
  headline: string;
  paragraphs: string[];
  teamImage: string;
  teamLabel: string;
  pillars: InstructorPillar[];
  expertise: ExpertiseCard[];
  trustQuote: string;
  trustBadge: string;
  sidebarInstructors: SidebarInstructorCard[];
};

const FOOD_SAFETY_PARAGRAPHS = [
  "This course is designed by the SFT Expert Team — professionals with deep experience in food safety, compliance, and HACCP principles.",
  "Every module is structured to help you understand real-world food safety risks, preventive controls, and audit-ready documentation.",
  "You learn from experts who have trained organizations, auditors, and food handlers across manufacturing, hospitality, and supply chains.",
];

const FOOD_SAFETY_PILLARS: InstructorPillar[] = [
  {
    title: "Industry Professionals",
    description:
      "Courses built by specialists who work in food manufacturing, hospitality, and supply chain environments.",
  },
  {
    title: "Food Safety Specialists",
    description:
      "Deep knowledge of hygiene, contamination control, and regulatory expectations across global markets.",
  },
  {
    title: "Training Experts",
    description:
      "Structured learning paths designed for clarity, engagement, and practical application on the job.",
  },
  {
    title: "Certification Experts",
    description:
      "Content aligned with recognized standards so your credential reflects real competence, not theory alone.",
  },
];

const FOOD_SAFETY_EXPERTISE: ExpertiseCard[] = [
  { title: "HACCP Experts", subtitle: "Risk-based controls", tone: "emerald" },
  { title: "ISO 22000 Knowledge", subtitle: "Management systems", tone: "sky" },
  { title: "Food Safety Systems", subtitle: "End-to-end design", tone: "orange" },
  { title: "Compliance & Audit", subtitle: "Audit-ready practice", tone: "violet" },
  { title: "Hygiene Standards", subtitle: "Operational hygiene", tone: "amber" },
];

const FOOD_SAFETY_SIDEBAR: SidebarInstructorCard[] = [
  { name: "Quality & Compliance Lead", role: "Food safety governance", accent: "bg-sky-500/20 text-sky-300" },
  { name: "Executive Chef Trainer", role: "Kitchen & service operations", accent: "bg-amber-500/20 text-amber-300" },
  { name: "HACCP Specialist", role: "Risk assessment & CCPs", accent: "bg-violet-500/20 text-violet-300" },
  { name: "Audit & Standards Expert", role: "ISO 22000 · FSSAI alignment", accent: "bg-emerald-500/20 text-emerald-300" },
];

const CYBER_PARAGRAPHS = [
  "This course is developed by the SFT Expert Team — practitioners with hands-on experience in cybersecurity operations, risk management, and incident response.",
  "Modules combine defensive strategy, hands-on labs, and frameworks used by security teams in enterprise environments.",
  "You learn from instructors who have trained analysts, engineers, and IT leaders across regulated and high-growth industries.",
];

const CYBER_PILLARS: InstructorPillar[] = [
  {
    title: "Security Practitioners",
    description: "Built by analysts and engineers who defend live production environments every day.",
  },
  {
    title: "Threat Specialists",
    description: "Coverage of detection, response, and hardening aligned to current attack patterns.",
  },
  {
    title: "Training Designers",
    description: "Lessons structured for clarity, labs for practice, and assessments for confidence.",
  },
  {
    title: "Certification Pathway",
    description: "Content mapped to job-ready skills employers expect from security professionals.",
  },
];

function defaultParagraphs(course: ManagedCourse): string[] {
  const cat = canonicalCategorySlug(course.category);
  if (cat === "food-safety") return FOOD_SAFETY_PARAGRAPHS;
  if (cat === "cyber-security") return CYBER_PARAGRAPHS;
  const bio = course.trainerBio?.trim();
  return [
    bio ||
      `This course is developed by ${course.instructorName?.trim() || "the SFT Expert Team"} with practical, job-ready training aligned to your field.`,
    course.subtitle.trim(),
  ];
}

function defaultPillars(course: ManagedCourse): InstructorPillar[] {
  const cat = canonicalCategorySlug(course.category);
  if (cat === "food-safety") return FOOD_SAFETY_PILLARS;
  if (cat === "cyber-security") return CYBER_PILLARS;
  return [
    {
      title: "Industry Professionals",
      description: "Courses shaped by practitioners with real-world experience in your domain.",
    },
    {
      title: "Subject Specialists",
      description: "Deep expertise in standards, compliance, and operational best practices.",
    },
    {
      title: "Training Experts",
      description: "Clear modules, assessments, and resources designed for lasting retention.",
    },
    {
      title: "Credential Focus",
      description: "Pathways that help you earn recognition you can show employers and auditors.",
    },
  ];
}

function defaultExpertise(course: ManagedCourse): ExpertiseCard[] {
  const cat = canonicalCategorySlug(course.category);
  if (cat === "food-safety") return FOOD_SAFETY_EXPERTISE;
  const chips = instructorExpertiseChips(cat);
  const tones: ExpertiseCard["tone"][] = ["emerald", "sky", "orange", "violet", "amber"];
  return chips.slice(0, 5).map((title, i) => ({
    title,
    subtitle: "SFT Expert Team",
    tone: tones[i % tones.length]!,
  }));
}

function defaultSidebar(course: ManagedCourse): SidebarInstructorCard[] {
  const cat = canonicalCategorySlug(course.category);
  if (cat === "food-safety") return FOOD_SAFETY_SIDEBAR;
  const lead = course.instructorName?.trim() || "Lead Instructor";
  return [
    { name: lead, role: course.trainerRole?.trim() || "Lead Instructor", accent: "bg-violet-500/20 text-violet-300" },
    { name: "SFT Expert Team", role: "Course designers", accent: "bg-sky-500/20 text-sky-300" },
    { name: "Industry Mentor", role: "Live Q&A support", accent: "bg-amber-500/20 text-amber-300" },
    { name: "Assessment Panel", role: "Exams & certification", accent: "bg-emerald-500/20 text-emerald-300" },
  ];
}

export function resolveInstructorSection(course: ManagedCourse): ResolvedInstructorSection {
  const custom = course.instructorSection;
  const cat = canonicalCategorySlug(course.category);

  return {
    headline: custom?.headline?.trim() || "Course developed by industry experts",
    paragraphs:
      custom?.introParagraphs?.filter((p) => p.trim()) ?? defaultParagraphs(course),
    teamImage: custom?.teamImage?.trim() || "/sft-expert-team.png",
    teamLabel: custom?.teamLabel?.trim() || "SFT Expert Team",
    pillars:
      custom?.pillars?.filter((p) => p.title.trim())?.map((p) => ({
        title: p.title.trim(),
        description: p.description.trim(),
      })) ?? defaultPillars(course),
    expertise:
      custom?.expertise?.filter((e) => e.title.trim())?.map((e, i) => ({
        title: e.title.trim(),
        subtitle: (e.subtitle ?? "").trim() || "SFT Expert Team",
        tone: (e.tone as ExpertiseCard["tone"]) ?? (["emerald", "sky", "orange", "violet", "amber"][i % 5] as ExpertiseCard["tone"]),
      })) ?? defaultExpertise(course),
    trustQuote:
      custom?.trustQuote?.trim() ||
      (cat === "food-safety"
        ? "Trusted by learners across the food industry to build safer, stronger and more compliant workplaces."
        : "Trusted by learners worldwide to build job-ready skills with structured, expert-led training."),
    trustBadge: custom?.trustBadge?.trim() || "Designed by SFT Expert Team",
    sidebarInstructors:
      custom?.sidebarInstructors
        ?.filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name.trim(),
          role: s.role.trim(),
          accent: s.accent?.trim() || "bg-violet-500/20 text-violet-300",
        })) ?? defaultSidebar(course),
  };
}

export function sanitizeInstructorSection(
  section: ManagedCourseInstructorSection | undefined,
): ManagedCourseInstructorSection | undefined {
  if (!section || typeof section !== "object") return undefined;
  const out: ManagedCourseInstructorSection = {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const headline = str(section.headline);
  if (headline) out.headline = headline;
  const teamImage = str(section.teamImage);
  if (teamImage) out.teamImage = teamImage;
  const teamLabel = str(section.teamLabel);
  if (teamLabel) out.teamLabel = teamLabel;
  const trustQuote = str(section.trustQuote);
  if (trustQuote) out.trustQuote = trustQuote;
  const trustBadge = str(section.trustBadge);
  if (trustBadge) out.trustBadge = trustBadge;
  if (Array.isArray(section.introParagraphs)) {
    const introParagraphs = section.introParagraphs.map((p) => String(p).trim()).filter(Boolean);
    if (introParagraphs.length) out.introParagraphs = introParagraphs;
  }
  if (Array.isArray(section.pillars)) {
    const pillars = section.pillars
      .filter((p) => p && typeof p === "object")
      .map((p) => ({
        title: str((p as { title?: string }).title) ?? "",
        description: str((p as { description?: string }).description) ?? "",
      }))
      .filter((p) => p.title);
    if (pillars.length) out.pillars = pillars;
  }
  if (Array.isArray(section.expertise)) {
    const expertise = section.expertise
      .filter((e) => e && typeof e === "object")
      .map((e) => ({
        title: str((e as { title?: string }).title) ?? "",
        subtitle: str((e as { subtitle?: string }).subtitle) ?? "",
        tone: str((e as { tone?: string }).tone),
      }))
      .filter((e) => e.title);
    if (expertise.length) out.expertise = expertise;
  }
  if (Array.isArray(section.sidebarInstructors)) {
    const sidebarInstructors = section.sidebarInstructors
      .filter((s) => s && typeof s === "object")
      .map((s) => ({
        name: str((s as { name?: string }).name) ?? "",
        role: str((s as { role?: string }).role) ?? "",
        accent: str((s as { accent?: string }).accent),
      }))
      .filter((s) => s.name);
    if (sidebarInstructors.length) out.sidebarInstructors = sidebarInstructors;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
