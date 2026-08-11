import type {
  CourseCurriculumItem,
  CourseCurriculumKind,
  CourseCurriculumModule,
} from "@/lib/content-schema";

export type CurriculumKindPublicLabel = "Lecture" | "Document" | "Assessment";

function firstLine(text: string, max = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const sentence = t.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? t;
  if (sentence.length <= max) return sentence;
  return `${sentence.slice(0, max - 1).trimEnd()}…`;
}

export function curriculumKindPublicLabel(
  kind?: CourseCurriculumKind,
): CurriculumKindPublicLabel {
  if (kind === "exam") return "Assessment";
  if (kind === "reading") return "Document";
  return "Lecture";
}

function flattenModuleItems(mod: CourseCurriculumModule): CourseCurriculumItem[] {
  const top = mod.items ?? [];
  const nested = (mod.subModules ?? []).flatMap((sm) => sm.items ?? []);
  return [...top, ...nested];
}

function topicFromModuleTitle(title: string): string {
  const raw = title.trim();
  if (!raw) return "";
  const afterDash = raw.split(/\s+[—–-]\s+/).slice(1).join(" — ").trim();
  const topic = (afterDash || raw).replace(/\s*\([^)]*\)\s*$/, "").trim();
  return topic;
}

export function curriculumItemOneLiner(item: CourseCurriculumItem): string {
  const custom = firstLine(item.description ?? item.about ?? "");
  if (custom) return custom;
  if (item.kind === "exam") {
    return "Complete this assessment to confirm you understood the module before continuing.";
  }
  if (item.kind === "reading") {
    return "Open this document for notes, policies, or worksheets that support the lecture.";
  }
  return "Watch this lecture to learn the key ideas covered in this module.";
}

export function curriculumModuleOneLiner(mod: CourseCurriculumModule): string {
  const custom = firstLine(mod.description ?? "");
  if (custom) return custom;

  const items = flattenModuleItems(mod);
  const lectures = items.filter((i) => (i.kind ?? "video") === "video").length;
  const documents = items.filter((i) => i.kind === "reading").length;
  const assessments = items.filter((i) => i.kind === "exam").length;
  const parts: string[] = [];
  if (lectures) parts.push(`${lectures} lecture${lectures === 1 ? "" : "s"}`);
  if (documents) parts.push(`${documents} document${documents === 1 ? "" : "s"}`);
  if (assessments) parts.push(`${assessments} assessment${assessments === 1 ? "" : "s"}`);

  const title = (mod.title ?? "").trim();
  if (/general instructions/i.test(title)) {
    return "Start here: how to use the course, key policies, and a short knowledge check.";
  }

  const topic = topicFromModuleTitle(title);
  if (topic && parts.length) {
    return `About this module: ${topic} — includes ${parts.join(", ")}.`;
  }
  if (parts.length) return `This module includes ${parts.join(", ")}.`;
  if (topic) return `About this module: ${topic}.`;
  return "Lessons, documents, and assessments in this module.";
}
