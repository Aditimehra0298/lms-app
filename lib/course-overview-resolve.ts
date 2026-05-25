import type { ManagedCourse, ManagedCourseOverviewSection } from "@/lib/content-schema";
import {
  landingLearnOutcomes,
  landingRequirements,
  landingWhatYouLearnGrid,
} from "@/lib/course-landing-content";

export type ResolvedOverviewSection = {
  aboutTitle: string;
  youWillLearnTitle: string;
  learnOutcomes: string[];
  whatYouLearnTitle: string;
  whatYouLearn: { title: string; description: string }[];
  requirementsTitle: string;
  requirements: string[];
  faqSectionTitle: string;
};

function lines(raw: string[] | undefined): string[] {
  return (raw ?? []).map((s) => s.trim()).filter(Boolean);
}

export function sanitizeOverviewSection(
  raw: ManagedCourseOverviewSection | undefined,
): ManagedCourseOverviewSection | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const whatYouLearn = Array.isArray(raw.whatYouLearn)
    ? raw.whatYouLearn
        .filter(
          (w): w is { title: string; description: string } =>
            !!w && typeof w.title === "string" && typeof w.description === "string",
        )
        .map((w) => ({ title: w.title.trim(), description: w.description.trim() }))
        .filter((w) => w.title.length > 0)
    : undefined;
  return {
    aboutTitle: raw.aboutTitle?.trim(),
    youWillLearnTitle: raw.youWillLearnTitle?.trim(),
    learnOutcomes: lines(raw.learnOutcomes),
    whatYouLearnTitle: raw.whatYouLearnTitle?.trim(),
    whatYouLearn: whatYouLearn?.length ? whatYouLearn : undefined,
    requirementsTitle: raw.requirementsTitle?.trim(),
    requirements: lines(raw.requirements),
    faqSectionTitle: raw.faqSectionTitle?.trim(),
  };
}

export function resolveOverviewSection(course: ManagedCourse): ResolvedOverviewSection {
  const o = course.overviewSection;
  const learnGridRaw = o?.whatYouLearn?.length
    ? o.whatYouLearn
    : landingWhatYouLearnGrid(course).map(([title, description]) => ({ title, description }));

  return {
    aboutTitle: o?.aboutTitle?.trim() || "About this course",
    youWillLearnTitle: o?.youWillLearnTitle?.trim() || "You will learn to:",
    learnOutcomes: o?.learnOutcomes?.length ? o.learnOutcomes : landingLearnOutcomes(course),
    whatYouLearnTitle: o?.whatYouLearnTitle?.trim() || "What you'll learn",
    whatYouLearn: learnGridRaw,
    requirementsTitle: o?.requirementsTitle?.trim() || "Requirements",
    requirements: o?.requirements?.length ? o.requirements : landingRequirements(course),
    faqSectionTitle: o?.faqSectionTitle?.trim() || "Frequently asked questions",
  };
}
