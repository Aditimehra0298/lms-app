export type ParsedExamQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

/** Parse a simple CSV row respecting quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function letterToIndex(letter: string): number {
  const c = letter.trim().toUpperCase().charAt(0);
  if (c >= "A" && c <= "Z") return c.charCodeAt(0) - 65;
  return -1;
}

/**
 * Admin exam CSV format:
 * S.No, Question, Option A, Option B, Option C, Option D, CorrectOption, marks
 */
export function parseExamCsv(text: string): ParsedExamQuestion[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const questionIdx = header.findIndex((h) => h.includes("question"));
  const correctIdx = header.findIndex(
    (h) => h.includes("correct") || h === "answer" || h === "correctoption",
  );

  const optionCols: number[] = [];
  header.forEach((h, i) => {
    const cell = h.replace(/\s+/g, " ").trim();
    if (/^option(\s+[a-z0-9]+)?$/i.test(cell)) optionCols.push(i);
  });
  if (optionCols.length === 0) {
    for (let i = 0; i < header.length; i++) {
      const cell = (header[i] ?? "").toLowerCase();
      if (cell.startsWith("option")) optionCols.push(i);
    }
  }
  if (optionCols.length === 0 && header.length >= 6) {
    optionCols.push(2, 3, 4, 5);
  }

  const questions: ParsedExamQuestion[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]!);
    const qText =
      questionIdx >= 0 ? cols[questionIdx]?.trim() : cols[1]?.trim();
    if (!qText) continue;

    const options = optionCols
      .map((i) => cols[i]?.trim())
      .filter((o): o is string => Boolean(o));
    if (options.length < 2) continue;

    let correctIndex = 0;
    if (correctIdx >= 0) {
      const raw = cols[correctIdx]?.trim() ?? "";
      const letterIdx = letterToIndex(raw);
      if (letterIdx >= 0 && letterIdx < options.length) {
        correctIndex = letterIdx;
      } else {
        const num = Number.parseInt(raw, 10);
        if (Number.isFinite(num) && num >= 1 && num <= options.length) {
          correctIndex = num - 1;
        } else {
          const match = options.findIndex(
            (o) => o.toLowerCase() === raw.toLowerCase(),
          );
          if (match >= 0) correctIndex = match;
        }
      }
    }

    questions.push({ question: qText, options, correctIndex });
  }

  return questions;
}
