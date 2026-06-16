/** Legacy / demo slugs → canonical catalog slugs. */
const SLUG_ALIASES: Record<string, string> = {
  cybersecurity: "cyber-security-phishing-awareness-training",
};

export function canonicalCourseSlug(slug: string | undefined | null): string {
  const key = String(slug ?? "").trim().toLowerCase();
  if (!key) return "";
  return SLUG_ALIASES[key] ?? key;
}

export function isAliasCourseSlug(slug: string | undefined | null): boolean {
  const key = String(slug ?? "").trim().toLowerCase();
  return Boolean(key && SLUG_ALIASES[key] && SLUG_ALIASES[key] !== key);
}
