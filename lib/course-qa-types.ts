export type QaModerationStatus = "pending" | "approved" | "rejected";

export type StoredCourseAnswer = {
  id: string;
  authorEmail: string;
  authorName: string;
  body: string;
  isOfficial: boolean;
  status: QaModerationStatus;
  helpful: number;
  createdAt: string;
};

export type StoredCourseQuestion = {
  id: string;
  courseSlug: string;
  authorEmail: string;
  authorName: string;
  module: string;
  question: string;
  status: QaModerationStatus;
  helpful: number;
  createdAt: string;
  answers: StoredCourseAnswer[];
};

export type CourseQAStoreFile = {
  questions: StoredCourseQuestion[];
};
