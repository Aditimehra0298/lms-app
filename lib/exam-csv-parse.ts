export type ExamOption = {
  /** Option label (can be empty when the answer is image-only). */
  text: string;
  /** Public image URL for this choice (e.g. /uploads/covers/…). */
  imageUrl?: string;
};

export type ParsedExamQuestion = {
  question: string;
  /** Optional image shown with the question stem. */
  questionImageUrl?: string;
  options: ExamOption[];
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

function looksLikeImageUrl(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (/^\/uploads\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(s)) return true;
  if (/^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(s)) return true;
  if (/^data:image\//i.test(s)) return true;
  return false;
}

/**
 * Option cell formats:
 * - Plain text: `Answer text`
 * - Image only: `IMAGE:https://…/a.png` or a bare image URL / `/uploads/…`
 * - Text + image: `Answer text || IMAGE:/uploads/covers/a.png`
 * - Markdown: `![alt](https://…/a.png)` or `![alt](url) trailing text`
 */
export function parseOptionCell(raw: string): ExamOption {
  const s = raw.trim();
  if (!s) return { text: "" };

  const md = s.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*(.*)$/s);
  if (md) {
    const imageUrl = md[2]?.trim();
    const text = (md[3] || md[1] || "").trim();
    return { text, imageUrl: imageUrl || undefined };
  }

  const imagePrefix = /^(?:IMAGE|IMG|IMAGEURL)\s*:\s*(.+)$/i;
  const parts = s.split(/\s*\|\|\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    let text = "";
    let imageUrl = "";
    for (const p of parts) {
      const m = p.match(imagePrefix);
      if (m) {
        imageUrl = m[1]!.trim();
      } else if (looksLikeImageUrl(p)) {
        imageUrl = p;
      } else if (!text) {
        text = p;
      } else {
        text = `${text} ${p}`.trim();
      }
    }
    return { text, imageUrl: imageUrl || undefined };
  }

  const prefixed = s.match(imagePrefix);
  if (prefixed) {
    return { text: "", imageUrl: prefixed[1]!.trim() };
  }

  if (looksLikeImageUrl(s)) {
    return { text: "", imageUrl: s };
  }

  return { text: s };
}

/** Serialize an option back into a CSV cell. */
export function formatOptionCell(option: ExamOption): string {
  const text = option.text.trim();
  const imageUrl = option.imageUrl?.trim();
  if (text && imageUrl) return `${text} || IMAGE:${imageUrl}`;
  if (imageUrl) return `IMAGE:${imageUrl}`;
  return text;
}

function optionLabelForMatch(option: ExamOption): string {
  return option.text.trim() || option.imageUrl?.trim() || "";
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Build admin CSV from structured questions (used by the image-options builder). */
export function serializeExamCsv(questions: ParsedExamQuestion[]): string {
  const maxOptions = Math.max(2, ...questions.map((q) => q.options.length), 4);
  const optionHeaders = Array.from({ length: maxOptions }, (_, i) => `Option ${String.fromCharCode(65 + i)}`);
  const header = ["S.No", "Question", "Question Image", ...optionHeaders, "CorrectOption", "marks"].join(",");

  const rows = questions.map((q, qi) => {
    const cells: string[] = [
      String(qi + 1),
      csvEscape(q.question),
      csvEscape(q.questionImageUrl?.trim() ?? ""),
    ];
    for (let i = 0; i < maxOptions; i++) {
      const opt = q.options[i];
      cells.push(csvEscape(opt ? formatOptionCell(opt) : ""));
    }
    cells.push(String.fromCharCode(65 + Math.max(0, q.correctIndex)));
    cells.push("1");
    return cells.join(",");
  });

  return [header, ...rows].join("\n");
}

/**
 * Admin exam CSV format:
 * S.No, Question, Option A, Option B, Option C, Option D, CorrectOption, marks
 *
 * Optional columns: Question Image, Option A Image, Option B Image, …
 * Option cells may embed images via IMAGE:url or text || IMAGE:url.
 */
export function parseExamCsv(text: string): ParsedExamQuestion[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]!).map((h) => h.toLowerCase().replace(/\s+/g, " ").trim());
  const questionIdx = header.findIndex((h) => h === "question" || (h.includes("question") && !h.includes("image")));
  const questionImageIdx = header.findIndex(
    (h) => h === "question image" || h === "questionimage" || h === "q image",
  );
  const correctIdx = header.findIndex(
    (h) => h.includes("correct") || h === "answer" || h === "correctoption",
  );

  const optionCols: number[] = [];
  const optionImageCols = new Map<number, number>(); // option letter index → column

  header.forEach((h, i) => {
    const cell = h.replace(/\s+/g, " ").trim();
    const imageMatch = cell.match(/^option\s*([a-z0-9]+)\s*image$/i);
    if (imageMatch) {
      const token = imageMatch[1]!.toUpperCase();
      const optIndex = /^[A-Z]$/.test(token)
        ? token.charCodeAt(0) - 65
        : Number.parseInt(token, 10) - 1;
      if (optIndex >= 0) optionImageCols.set(optIndex, i);
      return;
    }
    if (/^option(\s+[a-z0-9]+)?$/i.test(cell)) optionCols.push(i);
  });

  if (optionCols.length === 0) {
    for (let i = 0; i < header.length; i++) {
      const cell = header[i] ?? "";
      if (cell.startsWith("option") && !cell.includes("image")) optionCols.push(i);
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

    const questionImageUrl =
      questionImageIdx >= 0 ? cols[questionImageIdx]?.trim() || undefined : undefined;

    const options: ExamOption[] = [];
    optionCols.forEach((colIdx, optIndex) => {
      const raw = cols[colIdx]?.trim() ?? "";
      const parsed = raw ? parseOptionCell(raw) : { text: "" };
      const imageCol = optionImageCols.get(optIndex);
      const extraImage = imageCol != null ? cols[imageCol]?.trim() : "";
      if (extraImage) {
        parsed.imageUrl = extraImage.replace(/^(?:IMAGE|IMG|IMAGEURL)\s*:\s*/i, "").trim();
      }
      if (parsed.text || parsed.imageUrl) options.push(parsed);
    });

    // Also pick up image-only columns that had no text column filled
    optionImageCols.forEach((colIdx, optIndex) => {
      if (optIndex < options.length) return;
      const extraImage = cols[colIdx]?.trim();
      if (!extraImage) return;
      while (options.length < optIndex) options.push({ text: "" });
      options.push({
        text: "",
        imageUrl: extraImage.replace(/^(?:IMAGE|IMG|IMAGEURL)\s*:\s*/i, "").trim(),
      });
    });

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
            (o) => optionLabelForMatch(o).toLowerCase() === raw.toLowerCase(),
          );
          if (match >= 0) correctIndex = match;
        }
      }
    }

    questions.push({
      question: qText,
      questionImageUrl,
      options,
      correctIndex,
    });
  }

  return questions;
}
