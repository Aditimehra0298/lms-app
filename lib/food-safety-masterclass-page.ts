import type { ManagedCourse } from "@/lib/content-schema";
import {
  FOOD_SAFETY_DIPLOMA_CURRICULUM,
  getCurriculumForCourse,
  instructorExpertiseChips,
  learningOutcomeBullets,
  requirementBullets,
} from "@/lib/course-detail-template";
import type { PostHeroCourse } from "@/components/TutorLedPostHeroSections";
import { managedCourseToPostHero } from "@/lib/managed-course-to-post-hero";

/** Slug for the one course that uses the hardcoded diploma landing (pre-payment). */
export const FOOD_SAFETY_MASTERCLASS_SLUG = "food-safety-masterclass";

/** Original hardcoded marketing copy for the HACCP diploma landing. */
export const FOOD_SAFETY_LANDING_COPY = {
  title: "Diploma in HACCP Food Safety Standards (Level 2)",
  subtitle:
    "Build practical HACCP and hygiene skills with real audit-ready workflows — structured for audit-ready teams.",
  pageBadge: "DIPLOMA",
  instructorName: "Dr. Giri",
  trainerRole: "Food Safety & HACCP Specialist",
  trainerExperience: "12+ years · audit & training",
  level: "Beginner",
  duration: "11 modules · self-paced",
  rating: "4.8",
  learners: "18,240",
};

export function isFoodSafetyMasterclassSlug(slug: string): boolean {
  return slug.trim() === FOOD_SAFETY_MASTERCLASS_SLUG;
}

/** Merge API/admin row with hardcoded diploma fields for the public landing hero. */
/** Use on every self-paced `/courses/[slug]` page before rendering the marketing layout. */
export function resolveSelfPacedLandingCourse(course: ManagedCourse): ManagedCourse {
  if (isFoodSafetyMasterclassSlug(course.slug)) return mergeFoodSafetyCourseForLanding(course);
  return course;
}

export function mergeFoodSafetyCourseForLanding(course: ManagedCourse): ManagedCourse {
  return {
    ...course,
    slug: FOOD_SAFETY_MASTERCLASS_SLUG,
    title: FOOD_SAFETY_LANDING_COPY.title,
    subtitle: FOOD_SAFETY_LANDING_COPY.subtitle,
    pageBadge: FOOD_SAFETY_LANDING_COPY.pageBadge,
    instructorName: course.instructorName?.trim() || FOOD_SAFETY_LANDING_COPY.instructorName,
    trainerRole: course.trainerRole?.trim() || FOOD_SAFETY_LANDING_COPY.trainerRole,
    trainerExperience: course.trainerExperience?.trim() || FOOD_SAFETY_LANDING_COPY.trainerExperience,
    level: FOOD_SAFETY_LANDING_COPY.level,
    duration: FOOD_SAFETY_LANDING_COPY.duration,
    learningFormat: "self-paced",
    /** Always show the full 11-module diploma track on the marketing page. */
    curriculum: FOOD_SAFETY_DIPLOMA_CURRICULUM,
  };
}

function curriculumRowsForPostHero(mods: ReturnType<typeof getCurriculumForCourse>): PostHeroCourse["curriculum"] {
  return mods.map((m, i) => ({
    week: i + 1,
    label: m.title.length > 48 ? `${m.title.slice(0, 45)}…` : m.title,
    topic: m.items[0]?.label ?? m.title,
    keyLearning:
      m.items
        .slice(0, 6)
        .map((it) => it.label)
        .join(" · ") || "Lessons and practice",
    sessionType: m.items.some((x) => x.kind === "exam") ? "Video + quiz" : "On-demand",
  }));
}

/** Post-hero data with full gold module table (all 11 diploma modules). */
export function foodSafetyMasterclassPostHero(course: ManagedCourse): PostHeroCourse {
  const merged = mergeFoodSafetyCourseForLanding(course);
  const base = managedCourseToPostHero(merged);
  const mods = getCurriculumForCourse(
    FOOD_SAFETY_MASTERCLASS_SLUG,
    merged.category,
    merged.title,
    null,
  );

  return {
    ...base,
    curriculum: curriculumRowsForPostHero(mods),
    highlights: [
      "Complete HACCP diploma track — 11 structured modules",
      "Video lessons, readings, and module examinations",
      "Audit-ready workflows and documentation practice",
      "Certificate pathway aligned to food safety standards",
      "Study on your schedule — no live batch required",
    ],
    faqs: [
      {
        q: "Is this the full Diploma in HACCP Food Safety Standards (Level 2)?",
        a: "Yes. The landing page lists every module in the diploma track. After enrollment you work through each module in order.",
      },
      {
        q: "How long do I have access?",
        a: "You can study on your own schedule. Access duration is confirmed at checkout for your enrollment plan.",
      },
      {
        q: "Are there live classes?",
        a: "This is a self-paced diploma. You complete videos, readings, and module exams without fixed class times.",
      },
      {
        q: "Do I receive a certificate?",
        a: "When you complete all required modules and assessments, you can earn your completion certificate.",
      },
    ],
  };
}

export function foodSafetyRequirementBullets(): string[] {
  return requirementBullets("Food Safety");
}

export function foodSafetyLearningOutcomes(): string[] {
  return learningOutcomeBullets(FOOD_SAFETY_LANDING_COPY.title);
}

export function foodSafetyExpertiseChips(): string[] {
  return instructorExpertiseChips("Food Safety");
}
