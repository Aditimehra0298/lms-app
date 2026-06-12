import type { ManagedCourse } from "@/lib/content-schema";
import type { LearnerAuthProfile } from "@/lib/auth-profile";
import type { PurchasedCourseRow } from "@/lib/learner-course-progress";
import type { TutorLedExploreCard } from "@/lib/tutor-led-live-hub-enrich";
import type { LearningPreferences } from "@/lib/learner-learning-preferences";
import { buildProfileRecommendationSignals } from "@/lib/learner-profile-recommendation-signals";

export type RecommendationContext = {
  profile: LearnerAuthProfile;
  preferences: LearningPreferences;
  enrolledSlugs: Set<string>;
};

export type ScoredCourse = {
  course: ManagedCourse;
  score: number;
  reasons: string[];
};

export type FeaturedCoursePick = {
  kind: "enrolled" | "recommended";
  title: string;
  slug: string;
  image?: string;
  modules: number;
  duration: string;
  completed: number;
  status: string;
  reason: string;
  href: string;
  cta: string;
};

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  technology: ["cyber", "security", "software", "it"],
  cybersecurity: ["cyber", "security"],
  healthcare: ["health", "safety", "compliance", "medical"],
  finance: ["compliance", "audit", "fraud", "risk"],
  manufacturing: ["quality", "safety", "iso", "food"],
  education: ["leadership", "training"],
  food: ["food", "haccp", "fraud", "fssc", "safety"],
  beverage: ["food", "haccp", "fraud", "safety"],
  hospitality: ["food", "safety", "hygiene"],
};

const INTEREST_KEYWORDS: Record<string, string[]> = {
  "food safety & haccp": ["food", "haccp", "safety", "hygiene"],
  "food fraud & mitigation": ["food", "fraud", "mitigation"],
  cybersecurity: ["cyber", "security", "network"],
  "compliance & auditing": ["compliance", "audit", "iso"],
  "quality management": ["quality", "iso", "management"],
  "leadership & management": ["leadership", "management"],
  "health & safety": ["health", "safety", "osha"],
  sustainability: ["sustain", "environment", "esg"],
};

function courseSearchText(course: ManagedCourse): string {
  return [
    course.title,
    course.subtitle,
    course.category,
    course.level,
    ...(course.highlights ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function keywordHits(text: string, keywords: string[]): string[] {
  return keywords.filter((kw) => text.includes(kw));
}

export function scoreManagedCourse(
  course: ManagedCourse,
  ctx: RecommendationContext,
): ScoredCourse {
  const slug = course.slug?.trim().toLowerCase() ?? "";
  const text = courseSearchText(course);
  const category = course.category?.trim().toLowerCase() ?? "";
  const signals = buildProfileRecommendationSignals(ctx.profile);
  let score = 0;
  const reasons: string[] = [];

  if (course.settings?.featured) {
    score += 25;
    reasons.push("Featured on catalog");
  }

  const rating = parseFloat(course.rating);
  if (Number.isFinite(rating)) score += rating * 4;

  if (ctx.enrolledSlugs.has(slug)) {
    score -= 80;
  }

  if (category && signals.categorySlugs.has(category)) {
    score += 45;
    if (signals.organizationLabel) {
      reasons.push(`Top pick for ${signals.organizationLabel}`);
    } else if (signals.industryType) {
      reasons.push(`Matches ${signals.industryType} training needs`);
    } else {
      reasons.push(`Matches your profile industry`);
    }
  }

  if (signals.companyName) {
    const companyLower = signals.companyName.toLowerCase();
    for (const kw of signals.profileKeywords) {
      if (kw.length > 3 && text.includes(kw)) {
        score += 20;
        reasons.push(`Relevant for ${signals.companyName}`);
        break;
      }
    }
    if (/food|fraud|fssc|haccp|safety/.test(text) && /food|fraud|fssc|haccp|safety|beverage|dairy/.test(companyLower)) {
      score += 30;
      if (!reasons.some((r) => r.includes(signals.companyName!))) {
        reasons.push(`Recommended for ${signals.companyName} teams`);
      }
    }
  }

  const industry = signals.industryType.toLowerCase();
  if (industry) {
    for (const [key, kws] of Object.entries(INDUSTRY_KEYWORDS)) {
      if (industry.includes(key)) {
        const hits = keywordHits(text, kws);
        if (hits.length) {
          score += 18 + hits.length * 6;
          if (!reasons.length) {
            reasons.push(`Matches your ${ctx.profile.industryType} background`);
          }
          break;
        }
      }
    }
  }

  if (ctx.profile.accountType === "organisation" && signals.companySize) {
    if (text.includes("team") || text.includes("audit") || text.includes("compliance")) {
      score += 8;
    }
  }

  for (const interest of ctx.preferences.interests) {
    const kws = INTEREST_KEYWORDS[interest.toLowerCase()] ?? interest.toLowerCase().split(/\s+/);
    const hits = keywordHits(text, kws);
    if (hits.length) {
      score += 22 + hits.length * 8;
      reasons.push(`Aligned with ${interest}`);
    }
  }

  const goal = ctx.preferences.goal.toLowerCase();
  if (goal.includes("certif") && text.includes("cert")) {
    score += 12;
    reasons.push("Supports your certification goal");
  }
  if (goal.includes("compliance") && (text.includes("compliance") || text.includes("audit"))) {
    score += 14;
    reasons.push("Helps meet compliance goals");
  }

  if (ctx.preferences.googleSignals?.youtube?.connected) {
    const yt = ctx.preferences.googleSignals.youtube;
    for (const interest of yt.suggestedInterests) {
      const kws = INTEREST_KEYWORDS[interest.toLowerCase()] ?? interest.toLowerCase().split(/\s+/);
      const hits = keywordHits(text, kws);
      if (hits.length) {
        score += 32 + hits.length * 8;
        reasons.push(`From your YouTube activity · ${interest}`);
      }
    }
    for (const kw of yt.topicKeywords) {
      if (kw.length > 3 && text.includes(kw.toLowerCase())) {
        score += 18;
        if (!reasons.some((r) => r.includes("YouTube"))) {
          reasons.push("Matches topics from your YouTube likes & subscriptions");
        }
        break;
      }
    }
  }

  if (ctx.preferences.signedInWithGoogle && ctx.preferences.googleSignals) {
    const g = ctx.preferences.googleSignals;
    for (const interest of g.suggestedInterests) {
      const kws = INTEREST_KEYWORDS[interest.toLowerCase()] ?? interest.toLowerCase().split(/\s+/);
      const hits = keywordHits(text, kws);
      if (hits.length) {
        score += 28 + hits.length * 6;
        if (g.organizationHint) {
          reasons.push(`From your Google account (${g.organizationHint})`);
        } else {
          reasons.push(`From your Google account · ${interest}`);
        }
      }
    }
    if (g.industryHint) {
      for (const [key, kws] of Object.entries(INDUSTRY_KEYWORDS)) {
        if (g.industryHint.toLowerCase().includes(key)) {
          const hits = keywordHits(text, kws);
          if (hits.length) {
            score += 20 + hits.length * 4;
            if (!reasons.some((r) => r.includes("Google"))) {
              reasons.push(`Google account suggests ${g.industryHint} training`);
            }
            break;
          }
        }
      }
    }
  }

  if (ctx.preferences.signedInWithGoogle && !reasons.length) {
    score += 6;
    reasons.push("Suggested from your Google account profile");
  }

  if (!reasons.length) {
    reasons.push("Popular with SF Trainings learners");
  }

  return { course, score, reasons: [...new Set(reasons)] };
}

export function rankExploreCourses(
  courses: ManagedCourse[],
  ctx: RecommendationContext,
): ScoredCourse[] {
  return courses
    .map((course) => scoreManagedCourse(course, ctx))
    .sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title));
}

export function rankTutorLedExplore(
  cards: TutorLedExploreCard[],
  ctx: RecommendationContext,
): Array<{ card: TutorLedExploreCard; score: number; reasons: string[] }> {
  const signals = buildProfileRecommendationSignals(ctx.profile);
  return cards
    .map((card) => {
      const text = [card.title, card.subtitle].join(" ").toLowerCase();
      let score = card.price > 0 ? 10 : 5;
      const reasons: string[] = [];
      if (ctx.enrolledSlugs.has(card.slug.toLowerCase())) score -= 80;

      if (signals.organizationLabel && /food|fraud|safety|audit|compliance/.test(text)) {
        score += 25;
        reasons.push(`Live training for ${signals.organizationLabel}`);
      }

      for (const interest of ctx.preferences.interests) {
        const kws = INTEREST_KEYWORDS[interest.toLowerCase()] ?? interest.toLowerCase().split(/\s+/);
        if (keywordHits(text, kws).length) {
          score += 20;
          reasons.push(`Aligned with ${interest}`);
        }
      }

      if (ctx.preferences.googleSignals?.youtube?.connected) {
        for (const interest of ctx.preferences.googleSignals.youtube.suggestedInterests) {
          const kws = INTEREST_KEYWORDS[interest.toLowerCase()] ?? interest.toLowerCase().split(/\s+/);
          if (keywordHits(text, kws).length) {
            score += 28;
            reasons.push(`From your YouTube activity · ${interest}`);
          }
        }
      }

      if (ctx.preferences.googleSignals) {
        for (const interest of ctx.preferences.googleSignals.suggestedInterests) {
          const kws = INTEREST_KEYWORDS[interest.toLowerCase()] ?? interest.toLowerCase().split(/\s+/);
          if (keywordHits(text, kws).length) {
            score += 24;
            const org = ctx.preferences.googleSignals.organizationHint;
            reasons.push(org ? `From your Google account (${org})` : `From your Google account · ${interest}`);
          }
        }
      }

      if (signals.industryType && keywordHits(text, INDUSTRY_KEYWORDS.food ?? []).length && /food|beverage/.test(signals.industryType.toLowerCase())) {
        score += 15;
        reasons.push(`Matches ${signals.industryType}`);
      }

      if (!reasons.length) reasons.push("Live expert-led training");
      return { card, score, reasons: [...new Set(reasons)] };
    })
    .sort((a, b) => b.score - a.score || a.card.title.localeCompare(b.card.title));
}

export function pickOrgFeaturedCourse(input: {
  exploreRanked: ScoredCourse[];
  companyName?: string | null;
}): FeaturedCoursePick | null {
  const top = input.exploreRanked.find((row) => row.course.slug?.trim());
  if (!top) return null;
  const slug = top.course.slug!.trim();
  const company = input.companyName?.trim() || "your team";
  const reason =
    top.reasons.find((r) => /team|organization|industry|featured|popular/i.test(r)) ??
    top.reasons[0] ??
    `Top pick for ${company}`;

  return {
    kind: "recommended",
    title: top.course.title,
    slug,
    image: top.course.image,
    modules: top.course.modules?.length ?? 0,
    duration: top.course.duration?.trim() || "Self-paced",
    completed: 0,
    status: "Ready to assign",
    reason,
    href: "/my-learning?tab=assign-courses",
    cta: "Assign to team",
  };
}

export function pickFeaturedCourse(input: {
  enrolled: PurchasedCourseRow[];
  exploreRanked: ScoredCourse[];
  ctx: RecommendationContext;
  learningHrefFor: (course: PurchasedCourseRow) => string;
}): FeaturedCoursePick | null {
  const inProgress =
    input.enrolled.find((c) => c.status === "In Progress") ??
    input.enrolled.find((c) => !c.status.toLowerCase().includes("completed"));

  if (inProgress?.slug?.trim()) {
    return {
      kind: "enrolled",
      title: inProgress.title,
      slug: inProgress.slug.trim(),
      image: inProgress.image,
      modules: inProgress.modules,
      duration: inProgress.duration,
      completed: inProgress.completed,
      status: inProgress.status,
      reason: "Continue where you left off",
      href: input.learningHrefFor(inProgress),
      cta: inProgress.action || "Continue Learning",
    };
  }

  const anyEnrolled = input.enrolled[0];
  if (anyEnrolled?.slug?.trim()) {
    return {
      kind: "enrolled",
      title: anyEnrolled.title,
      slug: anyEnrolled.slug.trim(),
      image: anyEnrolled.image,
      modules: anyEnrolled.modules,
      duration: anyEnrolled.duration,
      completed: anyEnrolled.completed,
      status: anyEnrolled.status,
      reason: "Your enrolled course",
      href: input.learningHrefFor(anyEnrolled),
      cta: anyEnrolled.action || "Open Course",
    };
  }

  return null;
}

export function buildRecommendationContext(input: {
  profile: LearnerAuthProfile;
  preferences: LearningPreferences;
  enrolledSlugs: Iterable<string>;
}): RecommendationContext {
  return {
    profile: input.profile,
    preferences: input.preferences,
    enrolledSlugs: new Set(
      Array.from(input.enrolledSlugs)
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean),
    ),
  };
}
