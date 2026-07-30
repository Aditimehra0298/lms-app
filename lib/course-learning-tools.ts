import type { LucideIcon } from "lucide-react";
import { BookOpen, FileText, Headphones, Link2, Presentation, ScrollText } from "lucide-react";
import type { ManagedCourseLearningSection } from "@/lib/content-schema";

/** Course-wide learner tools (same for every module/lesson). */
export type CourseLearningToolKey =
  | "eWorkbook"
  | "transcript"
  | "ppt"
  | "podcast"
  | "webhook";

export type CourseLearningTools = {
  eWorkbookUrl?: string;
  transcriptUrl?: string;
  pptUrl?: string;
  podcastUrl?: string;
  webhookUrl?: string;
};

export const COURSE_LEARNING_TOOL_DEFS: Array<{
  key: CourseLearningToolKey;
  label: string;
  field: keyof CourseLearningTools;
  icon: LucideIcon;
  hint: string;
  accept?: string;
}> = [
  {
    key: "eWorkbook",
    label: "E-Workbook",
    field: "eWorkbookUrl",
    icon: BookOpen,
    hint: "Interactive workbook / e-book PDF or link",
    accept: ".pdf,.doc,.docx,.epub,application/pdf",
  },
  {
    key: "transcript",
    label: "Transcript",
    field: "transcriptUrl",
    icon: ScrollText,
    hint: "Course transcript PDF or document",
    accept: ".pdf,.doc,.docx,.txt,.vtt,.srt,application/pdf,text/plain",
  },
  {
    key: "ppt",
    label: "PPT",
    field: "pptUrl",
    icon: Presentation,
    hint: "PowerPoint only (.ppt / .pptx) · max 1 GB",
    accept:
      ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  {
    key: "podcast",
    label: "Podcast",
    field: "podcastUrl",
    icon: Headphones,
    hint: "Audio only — MP3 or M4A · max 1 GB",
    accept: ".mp3,.m4a,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a",
  },
  {
    key: "webhook",
    label: "Additional Resources",
    field: "webhookUrl",
    icon: Link2,
    hint: "Extra learner links or files (URL or upload)",
    accept:
      ".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.epub,.mp3,.m4a,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/epub+zip,audio/mpeg",
  },
];

export function sanitizeCourseLearningTools(
  raw: CourseLearningTools | undefined,
): CourseLearningTools | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const normalizeWebhook = (value?: string) => {
    const t = value?.trim();
    if (!t) return undefined;
    if (/^https?:\/\//i.test(t) || t.startsWith("/")) return t;
    if (/^\/\//.test(t)) return `https:${t}`;
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) return `https://${t}`;
    return t;
  };

  const next: CourseLearningTools = {
    eWorkbookUrl: raw.eWorkbookUrl?.trim() || undefined,
    transcriptUrl: raw.transcriptUrl?.trim() || undefined,
    pptUrl: raw.pptUrl?.trim() || undefined,
    podcastUrl: raw.podcastUrl?.trim() || undefined,
    webhookUrl: normalizeWebhook(raw.webhookUrl),
  };
  return Object.values(next).some(Boolean) ? next : undefined;
}

export function courseToolsFromLearningSection(
  section: ManagedCourseLearningSection | undefined,
): CourseLearningTools {
  return sanitizeCourseLearningTools(section?.courseTools) ?? {};
}

/** Learner-facing rows for the Learning Tools strip. */
export function resolveCourseLearningToolItems(tools: CourseLearningTools | undefined) {
  const t = tools ?? {};
  return COURSE_LEARNING_TOOL_DEFS.map((def) => ({
    key: def.key,
    label: def.label,
    value: (t[def.field] ?? "").trim(),
    icon: def.icon,
  }));
}

export function courseToolResourceLinks(tools: CourseLearningTools | undefined) {
  return resolveCourseLearningToolItems(tools)
    .filter((t) => t.value)
    .map((t) => ({ label: t.label, url: t.value }));
}

/** @deprecated Kept for type imports that expect FileText in resources map */
export const COURSE_TOOL_FALLBACK_ICON = FileText;
