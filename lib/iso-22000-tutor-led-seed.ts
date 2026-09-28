import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { defaultTutorLedPrograms } from "@/lib/default-tutor-led-programs";
import { formatTrainingDuration } from "@/lib/tutor-led-training-schedule";

/** Catalog card id → live Zoom program slug (4 ISO 22000 levels). */
export const ISO_22000_PROGRAM_SLUGS = {
  basic: "iso-22000-basic",
  implementation: "iso-22000-implementation",
  "internal-auditor": "iso-22000-internal-auditor",
  "lead-auditor": "iso-22000-lead-auditor",
} as const;

export type Iso22000CatalogId = keyof typeof ISO_22000_PROGRAM_SLUGS;

const SHARED_TRAINER: TutorLedProgramStored["trainer"] = {
  name: "Mr. Rajesh Kumar",
  role: "Food Safety Expert",
  experience: "15+ Years Experience",
  bio: "Seasoned food safety professional with 15+ years of experience in ISO 22000 implementation, HACCP, FSSC frameworks, and audit leadership.",
  certifications: ["ISO 22000 Lead Auditor", "HACCP", "FSSC 22000"],
  workedWith: ["Food manufacturing", "QSR / food service", "Export units"],
};

function baseCurriculum(level: string, days: number): TutorLedProgramStored["curriculum"] {
  return Array.from({ length: days }, (_, index) => ({
    week: index + 1,
    label: `Day ${index + 1}`,
    topic:
      days === 1
        ? `${level} — Live Zoom class`
        : `${level} — Day ${index + 1}`,
    keyLearning: `Live Zoom class ${index + 1} of ${days}`,
    sessionType: "Live Zoom",
    liveJoinUrl: "",
    zoomMeetingId: "",
    zoomPasscode: "",
  }));
}

function makeIsoProgram(opts: {
  slug: string;
  title: string;
  tagline: string;
  price: number;
  originalPrice: number;
  badge: string;
  batchLabel: string;
  heroSrc: string;
  trainingDays?: number;
}): TutorLedProgramStored {
  const template = defaultTutorLedPrograms[0];
  const trainingDays = opts.trainingDays ?? 5;
  const duration = formatTrainingDuration(trainingDays);
  return {
    ...JSON.parse(JSON.stringify(template)) as TutorLedProgramStored,
    slug: opts.slug,
    programKind: "tutor-led",
    published: true,
    category: "food-safety",
    title: opts.title,
    subtitle: opts.tagline,
    breadcrumb: ["Home", "Food Safety", "Tutor Led", opts.title],
    badge: opts.badge,
    price: opts.price,
    originalPrice: opts.originalPrice,
    priceAfterPayment: opts.price,
    discount: `${Math.round((1 - opts.price / opts.originalPrice) * 100)}% OFF`,
    batchLabel: opts.batchLabel,
    seatsFilling: true,
    seatsLeft: 25,
    trainer: { ...SHARED_TRAINER },
    nextBatchDate: "",
    schedule: "Mon–Fri (10:00 AM – 5:00 PM IST)",
    language: "English",
    trainingDays,
    durationSource: "curriculum",
    batchDetails: [
      { icon: "Clock", label: "Duration", value: duration },
      { icon: "Monitor", label: "Mode", value: "Live on Zoom" },
      { icon: "GraduationCap", label: "Certificate", value: "Included" },
    ],
    features: [
      { icon: "Video", title: "Live Zoom classes", desc: "Interact with trainers in real time" },
      { icon: "Award", title: "Certificate", desc: "Verifiable certificate on completion" },
      { icon: "FileText", title: "Materials", desc: "Notes, PPT and workbook downloads" },
    ],
    highlights: [
      "Unique Zoom meeting for every training day",
      "Final exam after the last live session",
      "Certificate issued for this program batch",
    ],
    curriculum: baseCurriculum(opts.title, trainingDays),
    whyChoose: [
      { icon: "Video", title: "Live instructor-led", desc: "Ask questions in real time on Zoom" },
      { icon: "Award", title: "Recognized certificate", desc: "Issued after batch completion" },
      { icon: "Users", title: "Cohort learning", desc: "Train with your batch peers" },
    ],
    faqs: [
      {
        q: "Will I get a Zoom link?",
        a: "Yes. Each training day has a different Zoom meeting — not one shared link. After enrollment, Day 1, Day 2, … join buttons appear on your dashboard. After the last live day you take the final exam.",
      },
      {
        q: "Is there an exam?",
        a: "Yes. After the last live Zoom day, the final exam unlocks on your enrolled dashboard. Complete it to earn the certificate for this batch.",
      },
    ],
    liveJoinUrl: "",
    zoomMeetingId: "",
    zoomPasscode: "",
    zoomLinkMode: "manual",
    learningMaterials: [],
    heroSrc: opts.heroSrc,
    heroAlt: opts.title,
    learnerHeroSrc: opts.heroSrc,
  };
}

/** Four ISO 22000 live Zoom programs — each has its own Zoom + batch + certificate. */
export const ISO_22000_TUTOR_LED_TEMPLATES: TutorLedProgramStored[] = [
  makeIsoProgram({
    slug: ISO_22000_PROGRAM_SLUGS.basic,
    title: "ISO 22000:2018 Awareness",
    tagline: "Learn Food Safety Fundamentals",
    price: 9999,
    originalPrice: 14999,
    badge: "AWARENESS",
    batchLabel: "Awareness Batch",
    heroSrc: "/iso-22000-awareness.png",
  }),
  makeIsoProgram({
    slug: ISO_22000_PROGRAM_SLUGS.implementation,
    title: "ISO 22000:2018 Implementator",
    tagline: "Implement Food Safety Systems",
    price: 14999,
    originalPrice: 21999,
    badge: "IMPLEMENTATOR",
    batchLabel: "Implementator Batch",
    heroSrc: "/iso-22000-implementator.png",
  }),
  makeIsoProgram({
    slug: ISO_22000_PROGRAM_SLUGS["internal-auditor"],
    title: "ISO 22000:2018 Internal Auditor",
    tagline: "Conduct Internal Audits",
    price: 19999,
    originalPrice: 27999,
    badge: "INTERNAL AUDITOR",
    batchLabel: "Internal Auditor Batch",
    heroSrc: "/iso-22000-internal-auditor.png",
  }),
  makeIsoProgram({
    slug: ISO_22000_PROGRAM_SLUGS["lead-auditor"],
    title: "ISO 22000:2018 Lead Auditor",
    tagline: "Lead Audit Teams",
    price: 29999,
    originalPrice: 39999,
    badge: "LEAD AUDITOR",
    batchLabel: "Lead Auditor Batch",
    heroSrc: "/iso-22000-lead-auditor.png",
  }),
];

/**
 * Merge missing ISO programs into the admin list (does not overwrite existing slugs).
 * Returns { programs, added } where added is the count of newly inserted templates.
 */
export function ensureIso22000TutorLedPrograms(
  existing: TutorLedProgramStored[] | undefined | null,
): { programs: TutorLedProgramStored[]; added: number } {
  const list = Array.isArray(existing) ? [...existing] : [];
  const have = new Set(list.map((p) => p.slug.trim()).filter(Boolean));
  let added = 0;
  for (const template of ISO_22000_TUTOR_LED_TEMPLATES) {
    if (have.has(template.slug)) continue;
    list.push(JSON.parse(JSON.stringify(template)) as TutorLedProgramStored);
    have.add(template.slug);
    added += 1;
  }
  return { programs: list, added };
}
