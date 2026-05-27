/** Course page hero — language list (shown on public course landing). */
export const COURSE_PAGE_LANGUAGES = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Arabic",
  "Portuguese",
  "Italian",
  "Dutch",
  "Russian",
  "Turkish",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Japanese",
  "Korean",
  "Bengali",
  "Urdu",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Malay",
  "Polish",
  "Ukrainian",
  "Hebrew",
  "Swahili",
  "Filipino",
] as const;

/** Captions / subtitles line presets (stored as full string on hero.captions). */
export const COURSE_CAPTION_PRESETS = [
  "English [Auto]",
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Arabic",
  "Portuguese",
  "Multilingual",
  "None",
] as const;

export const HERO_UPDATE_MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export function heroYearOptions(): { value: string; label: string }[] {
  const now = new Date().getFullYear();
  const years: { value: string; label: string }[] = [];
  for (let y = now + 1; y >= 2018; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

/** Parse stored `05/2024` or legacy `2024-05`. */
export function parseHeroLastUpdated(raw: string): { month: string; year: string } {
  const t = raw.trim();
  const slash = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return { month: slash[1].padStart(2, "0"), year: slash[2] };
  }
  const iso = t.match(/^(\d{4})-(\d{2})$/);
  if (iso) {
    return { month: iso[2], year: iso[1] };
  }
  return { month: "", year: "" };
}

export function formatHeroLastUpdated(month: string, year: string): string {
  const m = month.trim();
  const y = year.trim();
  if (!m || !y) return "";
  return `${m.padStart(2, "0")}/${y}`;
}
