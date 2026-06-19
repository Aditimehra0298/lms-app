/**
 * Infer course recommendation signals from Google account profile data.
 * Optional YouTube readonly OAuth adds subscription / liked-video topic hints.
 */

import type { YoutubeRecommendationPayload } from "@/lib/youtube-recommendation-types";

export type GoogleAccountRecommendationSignals = {
  /** Work / school domain when not a consumer Gmail address */
  emailDomain: string | null;
  /** Google Workspace hosted domain, when present */
  workspaceDomain: string | null;
  /** Human-readable org label derived from domain */
  organizationHint: string | null;
  /** Inferred industry label */
  industryHint: string | null;
  /** Interest labels aligned with LEARNING_INTEREST_OPTIONS */
  suggestedInterests: string[];
  /** Short labels explaining why (shown in UI) */
  activityHints: string[];
  locale: string | null;
  updatedAt: string;
  /** YouTube readonly connection — subscriptions & liked videos */
  youtube?: YoutubeRecommendationPayload;
};

const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

const DOMAIN_KEYWORD_RULES: Array<{
  pattern: RegExp;
  industry: string;
  interests: string[];
  hint: string;
}> = [
  {
    pattern: /food|foods|dairy|beverage|bakery|meat|poultry|fssc|haccp|nutrition|catering|restaurant|hotel|hospitality/i,
    industry: "Food & Beverage",
    interests: ["Food Safety & HACCP", "Food Fraud & Mitigation"],
    hint: "Work email suggests food & beverage training",
  },
  {
    pattern: /cyber|security|infosec|tech|software|digital|cloud|data|it\b|systems|network/i,
    industry: "Technology",
    interests: ["Cybersecurity"],
    hint: "Work email suggests technology & security topics",
  },
  {
    pattern: /bank|finance|financ|audit|account|insurance|capital|invest|credit|compliance/i,
    industry: "Finance",
    interests: ["Compliance & Auditing"],
    hint: "Work email suggests compliance & auditing",
  },
  {
    pattern: /health|hospital|pharma|medical|clinic|care|nhs|bio/i,
    industry: "Healthcare",
    interests: ["Health & Safety", "Compliance & Auditing"],
    hint: "Work email suggests health & safety training",
  },
  {
    pattern: /manufact|factory|industrial|quality|iso|engineering|plant/i,
    industry: "Manufacturing",
    interests: ["Quality Management", "Health & Safety"],
    hint: "Work email suggests quality & safety programs",
  },
  {
    pattern: /university|college|school|academy|edu|training|learning/i,
    industry: "Education",
    interests: ["Leadership & Management"],
    hint: "Email domain suggests education & leadership",
  },
  {
    pattern: /sustain|green|energy|environment|climate|esg/i,
    industry: "Sustainability",
    interests: ["Sustainability"],
    hint: "Work email suggests sustainability topics",
  },
];

function domainFromEmail(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain || null;
}

function labelFromDomain(domain: string): string {
  const host = domain.split(".")[0] ?? domain;
  return host
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function localeHint(locale: string | undefined): string | null {
  const loc = locale?.trim();
  if (!loc) return null;
  if (/^(en-)?(gb|uk)/i.test(loc)) return "UK learner — compliance & food safety programs are popular";
  if (/^(en-)?(in|ind)/i.test(loc)) return "India region — quality & compliance courses often selected";
  if (/^(en-)?(us|ca)/i.test(loc)) return "North America — certification-focused courses recommended";
  if (/^(en-)?(au|nz)/i.test(loc)) return "APAC region — food safety & audit training recommended";
  return null;
}

export function deriveGoogleAccountRecommendationSignals(input: {
  email: string;
  locale?: string;
  workspaceDomain?: string;
}): GoogleAccountRecommendationSignals {
  const emailDomain = domainFromEmail(input.email);
  const workspaceDomain = input.workspaceDomain?.trim().toLowerCase() || null;
  const orgDomain =
    workspaceDomain && !CONSUMER_DOMAINS.has(workspaceDomain)
      ? workspaceDomain
      : emailDomain && !CONSUMER_DOMAINS.has(emailDomain)
        ? emailDomain
        : null;

  const organizationHint = orgDomain ? labelFromDomain(orgDomain) : null;
  const suggestedInterests = new Set<string>();
  const activityHints: string[] = [];
  let industryHint: string | null = null;

  const scanText = [orgDomain, organizationHint, emailDomain].filter(Boolean).join(" ");

  for (const rule of DOMAIN_KEYWORD_RULES) {
    if (rule.pattern.test(scanText)) {
      industryHint = industryHint ?? rule.industry;
      rule.interests.forEach((i) => suggestedInterests.add(i));
      if (!activityHints.includes(rule.hint)) activityHints.push(rule.hint);
    }
  }

  if (workspaceDomain && organizationHint) {
    activityHints.unshift(`Signed in with Google Workspace (${organizationHint})`);
  } else if (orgDomain && organizationHint) {
    activityHints.unshift(`Work email domain: ${organizationHint}`);
  } else {
    activityHints.unshift("Signed in with Google — add interests in profile for sharper picks");
  }

  const locHint = localeHint(input.locale);
  if (locHint) activityHints.push(locHint);

  if (!suggestedInterests.size && industryHint) {
    if (industryHint.includes("Food")) {
      suggestedInterests.add("Food Safety & HACCP");
    } else if (industryHint.includes("Tech") || industryHint.includes("Cyber")) {
      suggestedInterests.add("Cybersecurity");
    }
  }

  return {
    emailDomain,
    workspaceDomain,
    organizationHint,
    industryHint,
    suggestedInterests: [...suggestedInterests],
    activityHints: [...new Set(activityHints)].slice(0, 4),
    locale: input.locale?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeYoutubeIntoGoogleSignals(input: {
  email: string;
  existing: Partial<GoogleAccountRecommendationSignals> | null;
  youtube: YoutubeRecommendationPayload;
}): GoogleAccountRecommendationSignals {
  const base =
    input.existing && input.existing.emailDomain !== undefined
      ? (input.existing as GoogleAccountRecommendationSignals)
      : deriveGoogleAccountRecommendationSignals({ email: input.email });

  const interests = new Set(base.suggestedInterests);
  input.youtube.suggestedInterests.forEach((i) => interests.add(i));

  const hints = [
    ...input.youtube.activityHints,
    ...base.activityHints.filter((h) => !h.toLowerCase().includes("youtube")),
  ];

  return {
    ...base,
    suggestedInterests: [...interests],
    activityHints: [...new Set(hints)].slice(0, 5),
    youtube: input.youtube,
    updatedAt: new Date().toISOString(),
  };
}
