import type { QaModerationStatus } from "@/lib/course-qa-types";

export type CourseQACommunityAnswer = {
  id: string;
  name: string;
  body: string;
  daysAgo: string;
  status: QaModerationStatus;
};

export type CourseQAItem = {
  id: string;
  authorEmail?: string;
  name: string;
  daysAgo: string;
  module: string;
  question: string;
  answerCount: number;
  helpful: number;
  answered: boolean;
  avatarTone: "emerald" | "rose" | "sky" | "violet" | "amber";
  status?: QaModerationStatus;
  officialAnswer?: { author: string; body: string };
  communityAnswers?: CourseQACommunityAnswer[];
};

export const DEFAULT_QA_GUIDELINES = [
  "Be respectful and helpful",
  "Search before asking",
  "Stay on topic",
  "No promotions or spam",
  "SFT Expert Team will answer official queries",
];

export const QA_GUIDELINE_ICONS = ["message", "search", "target", "ban", "shield"] as const;

export type ResolvedQACopy = {
  title: string;
  subtitle: string;
  askButtonLabel: string;
  searchPlaceholder: string;
  guidelinesTitle: string;
  guidelines: string[];
  needHelpTitle: string;
  needHelpText: string;
  contactSupportLabel: string;
};

export function resolveQACopy(course: { qaSection?: { title?: string; subtitle?: string; askButtonLabel?: string; searchPlaceholder?: string; guidelinesTitle?: string; guidelines?: string[]; needHelpTitle?: string; needHelpText?: string; contactSupportLabel?: string } }): ResolvedQACopy {
  const q = course.qaSection;
  const guidelines = (q?.guidelines ?? []).map((s) => s.trim()).filter(Boolean);
  return {
    title: q?.title?.trim() || "Course Q&A",
    subtitle:
      q?.subtitle?.trim() ||
      "Ask questions, get answers, and learn from the community. New posts are reviewed before they appear for others.",
    askButtonLabel: q?.askButtonLabel?.trim() || "Ask Question",
    searchPlaceholder: q?.searchPlaceholder?.trim() || "Search questions…",
    guidelinesTitle: q?.guidelinesTitle?.trim() || "Community guidelines",
    guidelines: guidelines.length ? guidelines : DEFAULT_QA_GUIDELINES,
    needHelpTitle: q?.needHelpTitle?.trim() || "Need help?",
    needHelpText:
      q?.needHelpText?.trim() ||
      "If you have any questions or need assistance, our support team is here to help.",
    contactSupportLabel: q?.contactSupportLabel?.trim() || "Contact Support",
  };
}

/** @deprecated Use resolveQACopy — kept for icon mapping */
export const QA_GUIDELINES = DEFAULT_QA_GUIDELINES.map((text, i) => ({
  icon: QA_GUIDELINE_ICONS[i % QA_GUIDELINE_ICONS.length]!,
  text,
}));
