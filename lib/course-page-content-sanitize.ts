import type { ManagedCourse } from "@/lib/content-schema";
import { sanitizeLearningSection } from "@/lib/course-learning-resolve";
import { sanitizeOverviewSection } from "@/lib/course-overview-resolve";
import { sanitizeTabLabels } from "@/lib/course-tab-labels-resolve";
import type {
  ManagedCourseQASectionConfig,
  ManagedCourseReviewsSectionConfig,
} from "@/lib/content-schema";

function lines(raw: string[] | undefined): string[] {
  return (raw ?? []).map((s) => s.trim()).filter(Boolean);
}

export function sanitizeReviewsSectionConfig(
  raw: ManagedCourseReviewsSectionConfig | undefined,
): ManagedCourseReviewsSectionConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  return {
    sectionTitle: raw.sectionTitle?.trim(),
    learnersLoveTitle: raw.learnersLoveTitle?.trim(),
    highlyRatedItems: lines(raw.highlyRatedItems),
    writeReviewTitle: raw.writeReviewTitle?.trim(),
    writeReviewSubtitle: raw.writeReviewSubtitle?.trim(),
    needHelpTitle: raw.needHelpTitle?.trim(),
    needHelpText: raw.needHelpText?.trim(),
    contactSupportLabel: raw.contactSupportLabel?.trim(),
  };
}

export function sanitizeQASectionConfig(
  raw: ManagedCourseQASectionConfig | undefined,
): ManagedCourseQASectionConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  return {
    title: raw.title?.trim(),
    subtitle: raw.subtitle?.trim(),
    askButtonLabel: raw.askButtonLabel?.trim(),
    searchPlaceholder: raw.searchPlaceholder?.trim(),
    guidelinesTitle: raw.guidelinesTitle?.trim(),
    guidelines: lines(raw.guidelines),
    needHelpTitle: raw.needHelpTitle?.trim(),
    needHelpText: raw.needHelpText?.trim(),
    contactSupportLabel: raw.contactSupportLabel?.trim(),
  };
}

export function sanitizeCoursePageContent(course: ManagedCourse): Pick<
  ManagedCourse,
  "overviewSection" | "learningSection" | "reviewsSection" | "qaSection" | "tabLabels"
> {
  return {
    overviewSection: sanitizeOverviewSection(course.overviewSection),
    learningSection: sanitizeLearningSection(course.learningSection),
    reviewsSection: sanitizeReviewsSectionConfig(course.reviewsSection),
    qaSection: sanitizeQASectionConfig(course.qaSection),
    tabLabels: sanitizeTabLabels(course.tabLabels),
  };
}
