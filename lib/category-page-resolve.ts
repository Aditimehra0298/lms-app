import type { AdminContent, CategoryPageEditorConfig, CategoryPageWhyItem } from "@/lib/content-schema";
import { normalizeStoredIconKey, resolveLucideIcon } from "@/lib/lucide-icon-resolve";
import { LEVEL_FILTER_OPTIONS } from "@/lib/level-filter-options";
import type { LucideIcon } from "lucide-react";

const defaultLevelFilters = (): CategoryPageEditorConfig["levelFilters"] =>
  LEVEL_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

const FOOD_SAFETY_HERO_DEFAULT = "/food-safety-category-hero.png";

const GENERIC_CATEGORY_HERO_FALLBACK =
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80";

const SKILL_DEV_HERO =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80";
const HVAC_MECH_HERO =
  "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1600&q=80";

/** Older course rows may still use these `category` values; URLs use the canonical slug. */
const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  "skill-development": "skill-development-framework",
  "hvac-refrigeration": "mechanical-engineering-hvac-and-refrigeration",
};

/** Normalize `[category]` route segment so it matches admin category slugs and `categoryPages` keys. */
export function canonicalCategorySlug(slug: string): string {
  return LEGACY_CATEGORY_SLUGS[slug] ?? slug;
}

/** Built-in hero images when admin has not set a custom `heroImage`. */
export const CATEGORY_DEFAULT_HERO_IMAGES: Record<string, string> = {
  "food-safety": FOOD_SAFETY_HERO_DEFAULT,
  "cyber-security":
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80",
  esg: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1600&q=80",
  "information-security":
    "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1600&q=80",
  "medical-devices":
    "https://images.unsplash.com/photo-1581595219315-a187dd40c322?auto=format&fit=crop&w=1600&q=80",
  "workplace-compliance":
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
  "skill-development-framework": SKILL_DEV_HERO,
  "mechanical-engineering-hvac-and-refrigeration": HVAC_MECH_HERO,
};

export type CategoryWorkshopPlaceholder = {
  title: string;
  date: string;
  instructor: string;
  image: string;
  /** Checkout, account redirect, or live schedule — used by the Register CTA. */
  registerHref: string;
};

/** Same workshop strip layout for every category; titles follow the category name. */
export function getCategoryWorkshopPlaceholders(
  _categoryTitle: string,
  _registerHref: string,
): CategoryWorkshopPlaceholder[] {
  return [];
}

export function getDefaultHeroImageForCategory(categorySlug: string): string {
  const key = canonicalCategorySlug(categorySlug);
  return CATEGORY_DEFAULT_HERO_IMAGES[key] ?? GENERIC_CATEGORY_HERO_FALLBACK;
}

/** Full template used by the admin editor and public page fallbacks. */
export function getCategoryEditorTemplate(categorySlug: string): CategoryPageEditorConfig {
  return {
    heroImage: getDefaultHeroImageForCategory(categorySlug),
    heroSubtitle: "",
    hiddenCourseSlugs: [],
    instructors: [],
    levelFilters: defaultLevelFilters(),
    whyLearn: [],
  };
}

/** Merge saved admin overrides with template defaults. */
export function mergeCategoryPageConfig(
  categorySlug: string,
  admin: AdminContent,
): CategoryPageEditorConfig {
  const slug = canonicalCategorySlug(categorySlug);
  const template = getCategoryEditorTemplate(slug);
  const saved = admin.categoryPages?.[slug];
  if (!saved) return template;

  return {
    heroImage:
      saved.heroImage !== undefined && String(saved.heroImage).trim() !== ""
        ? String(saved.heroImage).trim()
        : template.heroImage,
    heroSubtitle: saved.heroSubtitle !== undefined ? saved.heroSubtitle : template.heroSubtitle,
    hiddenCourseSlugs: Array.isArray(saved.hiddenCourseSlugs)
      ? saved.hiddenCourseSlugs
      : template.hiddenCourseSlugs,
    instructors:
      saved.instructors && saved.instructors.length > 0 ? saved.instructors : template.instructors,
    levelFilters:
      saved.levelFilters && saved.levelFilters.length > 0 ? saved.levelFilters : template.levelFilters,
    whyLearn:
      saved.whyLearn && saved.whyLearn.length > 0
        ? saved.whyLearn.map((w) => ({
            ...w,
            icon: w.icon ?? "ScrollText",
            quote: w.quote ?? "",
          }))
        : template.whyLearn,
  };
}

export type CategoryWhyLearnRow = {
  label: string;
  desc: string;
  quote?: string;
  tone: CategoryPageWhyItem["tone"];
  Icon: LucideIcon;
};

export function whyLearnToRows(items: CategoryPageWhyItem[]): CategoryWhyLearnRow[] {
  return items.map((item) => ({
    label: item.label,
    desc: item.desc,
    quote: item.quote,
    tone: item.tone,
    Icon: resolveLucideIcon(normalizeStoredIconKey(item.icon)),
  }));
}
