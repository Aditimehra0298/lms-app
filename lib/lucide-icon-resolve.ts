import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

/** Maps old preset keys saved in JSON to Lucide export names. */
const LEGACY_ICON_ALIASES: Record<string, string> = {
  "scroll-text": "ScrollText",
  award: "Award",
  users: "Users",
  leaf: "Leaf",
  "book-open": "BookOpen",
};

function toPascalCase(raw: string): string {
  const s = raw.trim().replace(/\.tsx?$/i, "");
  if (!s) return "";
  if (/^[A-Z][a-zA-Z0-9]*$/.test(s)) return s;
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

/**
 * Resolve any Lucide React export name (e.g. `ShieldCheck`, `graduation-cap` → `GraduationCap`).
 * Falls back to ScrollText when the name is missing or not a component.
 */
export function resolveLucideIcon(iconName: string): LucideIcon {
  const trimmed = iconName.trim();
  if (!trimmed) return Icons.ScrollText;

  const fromLegacy = LEGACY_ICON_ALIASES[trimmed];
  const candidates = [fromLegacy, trimmed, toPascalCase(trimmed)].filter(Boolean) as string[];

  const bag = Icons as unknown as Record<string, unknown>;
  for (const key of candidates) {
    const Comp = bag[key];
    if (typeof Comp === "function") return Comp as LucideIcon;
  }

  return Icons.ScrollText;
}

export function normalizeStoredIconKey(icon: string): string {
  const t = icon.trim();
  return LEGACY_ICON_ALIASES[t] ?? t;
}
