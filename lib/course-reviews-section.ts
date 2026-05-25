import type { ManagedCourse } from "@/lib/content-schema";

export type CourseReview = {
  id: string;
  name: string;
  rating: number;
  daysAgo: string;
  body: string;
  helpful: number;
  verified?: boolean;
};

export type RatingDistribution = { stars: number; percent: number };

export type ResolvedReviewsSection = {
  averageRating: string;
  totalReviews: string;
  distribution: RatingDistribution[];
  highlyRatedFor: string[];
  reviews: CourseReview[];
};

/** Shown as “Learners love this course” checklist. */
const DEFAULT_HIGHLY_RATED = [
  "Quality of content",
  "Practical examples",
  "Easy to understand",
  "Value for money",
];

const DEFAULT_DISTRIBUTION: RatingDistribution[] = [
  { stars: 5, percent: 72 },
  { stars: 4, percent: 21 },
  { stars: 3, percent: 5 },
  { stars: 2, percent: 1 },
  { stars: 1, percent: 1 },
];

const SAMPLE_REVIEWS: CourseReview[] = [
  {
    id: "1",
    name: "Ravi Kumar",
    rating: 5,
    daysAgo: "2 days ago",
    body: "Excellent course! The HACCP modules are very practical and easy to follow. I could apply the concepts directly at my workplace.",
    helpful: 24,
    verified: true,
  },
  {
    id: "2",
    name: "Priya Sharma",
    rating: 5,
    daysAgo: "1 week ago",
    body: "Well-structured content with clear videos and assessments. The certificate process was straightforward after completing all modules.",
    helpful: 18,
    verified: true,
  },
  {
    id: "3",
    name: "Amit Patel",
    rating: 4,
    daysAgo: "2 weeks ago",
    body: "Great overview of food safety standards. Would love more case studies from manufacturing environments, but overall very valuable.",
    helpful: 11,
    verified: true,
  },
  {
    id: "4",
    name: "Neha Desai",
    rating: 5,
    daysAgo: "3 weeks ago",
    body: "The expert team explanations made complex audit requirements simple. Highly recommend for anyone in F&B operations.",
    helpful: 9,
    verified: true,
  },
];

function reviewCountLabel(learners: string, ratingCount?: string): string {
  if (ratingCount?.trim()) {
    const n = ratingCount.replace(/[^\d]/g, "");
    return n ? `${Number(n).toLocaleString()} Reviews` : "1,250 Reviews";
  }
  const parsed = parseInt(learners.replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return `${Math.max(120, Math.round(parsed * 0.07)).toLocaleString()} Reviews`;
  }
  return "1,250 Reviews";
}

export type ResolvedReviewsCopy = {
  learnersLoveTitle: string;
  writeReviewTitle: string;
  writeReviewSubtitle: string;
  needHelpTitle: string;
  needHelpText: string;
  contactSupportLabel: string;
};

export function resolveReviewsCopy(course: ManagedCourse): ResolvedReviewsCopy {
  const r = course.reviewsSection;
  return {
    learnersLoveTitle: r?.learnersLoveTitle?.trim() || "Learners love this course",
    writeReviewTitle: r?.writeReviewTitle?.trim() || "Share your review",
    writeReviewSubtitle: r?.writeReviewSubtitle?.trim() || "Help others make the right choice.",
    needHelpTitle: r?.needHelpTitle?.trim() || "Need help?",
    needHelpText:
      r?.needHelpText?.trim() ||
      "If you have any questions or need assistance, our support team is here to help.",
    contactSupportLabel: r?.contactSupportLabel?.trim() || "Contact Support",
  };
}

export function resolveReviewsSection(
  course: ManagedCourse,
  ratingCountFromHero?: string,
): ResolvedReviewsSection {
  const averageRating = course.rating?.trim() || "4.8";
  const highlights = course.highlights?.filter(Boolean).slice(0, 4);
  const highlyFromAdmin = course.reviewsSection?.highlyRatedItems?.filter(Boolean);

  return {
    averageRating,
    totalReviews: reviewCountLabel(course.learners, ratingCountFromHero),
    distribution: DEFAULT_DISTRIBUTION,
    highlyRatedFor: highlyFromAdmin?.length
      ? highlyFromAdmin
      : highlights?.length
        ? highlights
        : DEFAULT_HIGHLY_RATED,
    reviews: SAMPLE_REVIEWS,
  };
}
