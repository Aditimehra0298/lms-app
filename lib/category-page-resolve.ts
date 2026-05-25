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
  categoryTitle: string,
  registerHref: string,
): CategoryWorkshopPlaceholder[] {
  const t = categoryTitle.trim() || "This track";
  return [
    {
      title: `${t} — Expert Live Q&A`,
      date: "Sat, May 24 · 10:00 AM IST",
      instructor: "Priya Nair",
      image:
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80",
      registerHref,
    },
    {
      title: `${t} Applied Skills Lab`,
      date: "Sun, May 25 · 3:00 PM IST",
      instructor: "Daniel Brooks",
      image:
        "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80",
      registerHref,
    },
    {
      title: `${t} Certification Prep`,
      date: "Wed, May 28 · 6:30 PM IST",
      instructor: "Ananya Rao",
      image:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80",
      registerHref,
    },
  ];
}

export function getDefaultHeroImageForCategory(categorySlug: string): string {
  const key = canonicalCategorySlug(categorySlug);
  return CATEGORY_DEFAULT_HERO_IMAGES[key] ?? GENERIC_CATEGORY_HERO_FALLBACK;
}

const foodSafetyInstructors: CategoryPageEditorConfig["instructors"] = [
  {
    name: "Dr. Mehta",
    role: "Food Safety Auditor",
    years: "15+ Years Exp",
    photo:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=240&h=240&q=80",
  },
  {
    name: "Chef Rahul",
    role: "HACCP Specialist",
    years: "12+ Years Exp",
    photo:
      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=240&h=240&q=80",
  },
  {
    name: "Ms. Ananya",
    role: "Food Compliance",
    years: "10+ Years Exp",
    photo:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&h=240&q=80",
  },
];

const genericInstructors: CategoryPageEditorConfig["instructors"] = [
  {
    name: "Priya Nair",
    role: "Lead Auditor",
    years: "14+ Years Exp",
    photo:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&h=240&q=80",
  },
  {
    name: "Daniel Brooks",
    role: "Quality Consultant",
    years: "12+ Years Exp",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&h=240&q=80",
  },
  {
    name: "Ananya Rao",
    role: "Compliance Lead",
    years: "10+ Years Exp",
    photo:
      "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=240&h=240&q=80",
  },
];

const foodSafetyWhy: CategoryPageWhyItem[] = [
  {
    label: "Global Certification",
    desc: "Enhance your career opportunities.",
    tone: "amber",
    icon: "ScrollText",
    quote: "",
  },
  {
    label: "Industry-Relevant Skills",
    desc: "Learn practical and audit-ready skills.",
    tone: "emerald",
    icon: "Award",
    quote: "",
  },
  {
    label: "Better Job Prospects",
    desc: "High demand in food and hospitality sectors.",
    tone: "blue",
    icon: "Users",
    quote: "",
  },
  {
    label: "Safer Communities",
    desc: "Contribute to public health and safety.",
    tone: "violet",
    icon: "Leaf",
    quote: "",
  },
];

const genericWhy: CategoryPageWhyItem[] = [
  {
    label: "Recognized Programs",
    desc: "Credentials employers and auditors respect.",
    tone: "amber",
    icon: "ScrollText",
    quote: "",
  },
  {
    label: "Practical Skills",
    desc: "Apply concepts immediately at work.",
    tone: "emerald",
    icon: "Award",
    quote: "",
  },
  {
    label: "Career Growth",
    desc: "Stand out in hiring and promotions.",
    tone: "blue",
    icon: "Users",
    quote: "",
  },
  {
    label: "Expert-Led",
    desc: "Learn from practitioners in the field.",
    tone: "violet",
    icon: "BookOpen",
    quote: "",
  },
];

/** Full template used by the admin editor and public page fallbacks. */
export function getCategoryEditorTemplate(categorySlug: string): CategoryPageEditorConfig {
  const isFood = canonicalCategorySlug(categorySlug) === "food-safety";
  return {
    heroImage: getDefaultHeroImageForCategory(categorySlug),
    heroSubtitle: "",
    hiddenCourseSlugs: [],
    instructors: isFood ? foodSafetyInstructors : genericInstructors,
    levelFilters: defaultLevelFilters(),
    whyLearn: isFood ? foodSafetyWhy : genericWhy,
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
