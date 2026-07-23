import type { ManagedCourse, ManagedCourseLearningSection } from "@/lib/content-schema";
import { learningOutcomeBullets } from "@/lib/course-detail-template";
import { BRAND_LOGO_PUBLIC_PATH } from "@/lib/brand-logo";
import {
  sanitizeCourseLearningTools,
  type CourseLearningTools,
} from "@/lib/course-learning-tools";

export type ResolvedLearningSection = {
  brandLogoUrl: string;
  certifiedBadgeLabel: string;
  accreditedBadgeLabel: string;
  accreditedDescription: string;
  certificationRuleText: string;
  noVideoMessage: string;
  learningToolsTitle: string;
  learningToolsHint: string;
  courseTools: CourseLearningTools;
  bookmarkLabel: string;
  markCompleteLabel: string;
  previousLabel: string;
  nextLabel: string;
  notesTabLabel: string;
  resourcesTabLabel: string;
  saveNoteLabel: string;
  resourcesEmptyMessage: string;
  defaultLessonAbout: string;
  defaultLessonDescription: string;
  defaultLearningOutcomes: string[];
  progressLabel: string;
  quickToolsTitle: string;
};

const DEFAULT_LOGO = BRAND_LOGO_PUBLIC_PATH;

function lines(raw: string[] | undefined): string[] {
  return (raw ?? []).map((s) => s.trim()).filter(Boolean);
}

export function sanitizeLearningSection(
  raw: ManagedCourseLearningSection | undefined,
): ManagedCourseLearningSection | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  return {
    brandLogoUrl: raw.brandLogoUrl?.trim(),
    certifiedBadgeLabel: raw.certifiedBadgeLabel?.trim(),
    accreditedBadgeLabel: raw.accreditedBadgeLabel?.trim(),
    accreditedDescription: raw.accreditedDescription?.trim(),
    certificationRuleText: raw.certificationRuleText?.trim(),
    noVideoMessage: raw.noVideoMessage?.trim(),
    learningToolsTitle: raw.learningToolsTitle?.trim(),
    learningToolsHint: raw.learningToolsHint?.trim(),
    courseTools: sanitizeCourseLearningTools(raw.courseTools),
    bookmarkLabel: raw.bookmarkLabel?.trim(),
    markCompleteLabel: raw.markCompleteLabel?.trim(),
    previousLabel: raw.previousLabel?.trim(),
    nextLabel: raw.nextLabel?.trim(),
    notesTabLabel: raw.notesTabLabel?.trim(),
    resourcesTabLabel: raw.resourcesTabLabel?.trim(),
    saveNoteLabel: raw.saveNoteLabel?.trim(),
    resourcesEmptyMessage: raw.resourcesEmptyMessage?.trim(),
    defaultLessonAbout: raw.defaultLessonAbout?.trim(),
    defaultLessonDescription: raw.defaultLessonDescription?.trim(),
    defaultLearningOutcomes: lines(raw.defaultLearningOutcomes),
    progressLabel: raw.progressLabel?.trim(),
    quickToolsTitle: raw.quickToolsTitle?.trim(),
  };
}

export function resolveLearningSection(
  course: ManagedCourse,
  certificateLabelFromHero?: string,
): ResolvedLearningSection {
  const l = course.learningSection;
  const title = course.title.trim() || "this course";

  return {
    brandLogoUrl: l?.brandLogoUrl?.trim() || DEFAULT_LOGO,
    certifiedBadgeLabel: l?.certifiedBadgeLabel?.trim() || "Certified course",
    accreditedBadgeLabel: l?.accreditedBadgeLabel?.trim() || "Certified course",
    accreditedDescription:
      l?.accreditedDescription?.trim() ||
      certificateLabelFromHero?.trim() ||
      "SF Trainings accredited program",
    certificationRuleText:
      l?.certificationRuleText?.trim() ||
      "Certification rule: overall module exam score must be at least 60%.",
    noVideoMessage:
      l?.noVideoMessage?.trim() || "No video uploaded for this lesson yet.",
    learningToolsTitle: (() => {
      const title = l?.learningToolsTitle?.trim();
      if (!title || /^learning tools$/i.test(title)) return "Course Learning tools";
      return title;
    })(),
    learningToolsHint: (() => {
      const hint = l?.learningToolsHint?.trim();
      if (!hint || /^learning tools hint$/i.test(hint)) {
        return "Course materials — same tools for every module. Green dots mean a file is ready.";
      }
      return hint;
    })(),
    courseTools: sanitizeCourseLearningTools(l?.courseTools) ?? {},
    bookmarkLabel: l?.bookmarkLabel?.trim() || "Bookmark",
    markCompleteLabel: l?.markCompleteLabel?.trim() || "Mark as Complete",
    previousLabel: l?.previousLabel?.trim() || "Previous",
    nextLabel: l?.nextLabel?.trim() || "Next",
    notesTabLabel: l?.notesTabLabel?.trim() || "Notes",
    resourcesTabLabel: l?.resourcesTabLabel?.trim() || "Resources",
    saveNoteLabel: l?.saveNoteLabel?.trim() || "Save Note",
    resourcesEmptyMessage:
      l?.resourcesEmptyMessage?.trim() || "No uploaded resources for this module yet.",
    defaultLessonAbout:
      l?.defaultLessonAbout?.trim() ||
      `Welcome to the ${title} course. This program uses structured video modules and short assessments to guide your learning. After completing all required modules and assessments, your certificate becomes available.`,
    defaultLessonDescription:
      l?.defaultLessonDescription?.trim() ||
      "Watch lessons fully, use pause/replay for clarity, then proceed to the assessment. Take notes as you go and contact support when needed.",
    defaultLearningOutcomes: l?.defaultLearningOutcomes?.length
      ? l.defaultLearningOutcomes
      : learningOutcomeBullets(title),
    progressLabel: l?.progressLabel?.trim() || "Your Progress",
    quickToolsTitle: l?.quickToolsTitle?.trim() || "Quick Tools",
  };
}
