import type { LearnerAuthProfile } from "@/lib/auth-profile";

/** Map profile signals → catalog category slugs (admin `ManagedCourse.category`). */
const INDUSTRY_CATEGORY_SLUGS: Record<string, string[]> = {
  food: ["food-safety"],
  beverage: ["food-safety"],
  "food & beverage": ["food-safety"],
  manufacturing: ["food-safety", "workplace-compliance"],
  healthcare: ["medical-devices", "workplace-compliance"],
  hospital: ["medical-devices", "workplace-compliance"],
  finance: ["information-security", "cyber-security", "workplace-compliance"],
  technology: ["cyber-security", "information-security"],
  cybersecurity: ["cyber-security", "information-security"],
  software: ["cyber-security", "information-security"],
  education: ["skill-development-framework"],
  hospitality: ["food-safety", "workplace-compliance"],
};

const COMPANY_KEYWORD_CATEGORIES: Array<{ pattern: RegExp; categories: string[]; label: string }> = [
  { pattern: /food|beverage|dairy|bakery|restaurant|catering|fssc|haccp|packaging/i, categories: ["food-safety"], label: "food & beverage" },
  { pattern: /hospital|clinic|pharma|medical|healthcare|health care/i, categories: ["medical-devices", "workplace-compliance"], label: "healthcare" },
  { pattern: /bank|insurance|fintech|financial/i, categories: ["information-security", "cyber-security"], label: "financial services" },
  { pattern: /hotel|hospitality|resort/i, categories: ["food-safety", "workplace-compliance"], label: "hospitality" },
  { pattern: /manufactur|factory|plant|production/i, categories: ["food-safety", "workplace-compliance"], label: "manufacturing" },
  { pattern: /tech|software|digital|cyber|it services/i, categories: ["cyber-security", "information-security"], label: "technology" },
  { pattern: /sustain|environment|esg|green/i, categories: ["esg"], label: "sustainability" },
];

export type ProfileRecommendationSignals = {
  accountType: LearnerAuthProfile["accountType"];
  industryType: string;
  companyName: string;
  companySize: string;
  categorySlugs: Set<string>;
  profileKeywords: string[];
  organizationLabel: string | null;
};

export function buildProfileRecommendationSignals(
  profile: LearnerAuthProfile,
): ProfileRecommendationSignals {
  const industryType = profile.industryType?.trim() ?? "";
  const companyName = profile.companyName?.trim() ?? "";
  const companySize = profile.companySize?.trim() ?? "";
  const categorySlugs = new Set<string>();
  const profileKeywords: string[] = [];
  let organizationLabel: string | null = null;

  if (companyName) {
    organizationLabel = companyName;
    profileKeywords.push(...companyName.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
    for (const row of COMPANY_KEYWORD_CATEGORIES) {
      if (row.pattern.test(companyName)) {
        for (const cat of row.categories) categorySlugs.add(cat);
      }
    }
  }

  if (industryType) {
    const industryLower = industryType.toLowerCase();
    profileKeywords.push(...industryLower.split(/\s+/).filter((w) => w.length > 2));
    for (const [key, cats] of Object.entries(INDUSTRY_CATEGORY_SLUGS)) {
      if (industryLower.includes(key)) {
        for (const cat of cats) categorySlugs.add(cat);
      }
    }
  }

  if (profile.accountType === "organisation" && companyName && !organizationLabel) {
    organizationLabel = companyName;
  }

  return {
    accountType: profile.accountType,
    industryType,
    companyName,
    companySize,
    categorySlugs,
    profileKeywords,
    organizationLabel,
  };
}

export function profileSummaryLine(signals: ProfileRecommendationSignals): string {
  if (signals.accountType === "organisation" && signals.companyName) {
    return `Organisation account · ${signals.companyName}${signals.industryType ? ` · ${signals.industryType}` : ""}`;
  }
  if (signals.companyName) {
    return `Individual trainee · works at ${signals.companyName}${signals.industryType ? ` · ${signals.industryType}` : ""}`;
  }
  if (signals.industryType) {
    return `Individual trainee · ${signals.industryType}`;
  }
  return "Individual trainee · add your organisation below for better course matches";
}
