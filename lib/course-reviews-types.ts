export type ReviewModerationStatus = "pending" | "approved" | "rejected";

export type StoredCourseReview = {
  id: string;
  courseSlug: string;
  authorEmail: string;
  authorName: string;
  rating: number;
  body: string;
  status: ReviewModerationStatus;
  helpful: number;
  createdAt: string;
};

export type CourseReviewsStoreFile = {
  reviews: StoredCourseReview[];
};
