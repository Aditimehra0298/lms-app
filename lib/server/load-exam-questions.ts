import { readFile } from "node:fs/promises";
import { parseExamCsv, type ParsedExamQuestion } from "@/lib/exam-csv-parse";
import { resolveMediaFilePath, storageFileNameFromUrl } from "@/lib/server/private-media-storage";

/** Read and parse an admin-uploaded exam CSV from disk (no media token required). */
export async function loadExamQuestionsFromStoredUrl(
  storedUrl: string | undefined | null,
): Promise<ParsedExamQuestion[]> {
  const url = storedUrl?.trim();
  if (!url) return [];

  const fileName = storageFileNameFromUrl(url);
  if (!fileName) return [];

  const filePath = await resolveMediaFilePath(fileName);
  if (!filePath) return [];

  const text = await readFile(filePath, "utf8");
  return parseExamCsv(text);
}
