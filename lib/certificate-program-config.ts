/** Per-program certificate assets — self-paced courses and tutor-led programs (same shape). */

export type ManagedCourseCertificateConfig = {
  enabled?: boolean;
  provider?: "builtin" | "api";
  /** Override CERTIFICATE_GENERATOR_API_URL for a single course (optional). */
  certificateGeneratorApiUrl?: string;
  showInLearnerDashboard?: boolean;
  autoVisibleWhenReady?: boolean;
  requireAdminApproval?: boolean;
  title?: string;
  /** Per-course/program certificate background sample. */
  templateImage?: string;
  /** Per-course/program badge — same for every learner. */
  badgeImage?: string;
  /** Per-course/program transcript PDF or image. */
  transcriptFile?: string;
  nameTopPercent?: number;
  numberTopPercent?: number;
  dateTopPercent?: number;
  /** When false, course title is not drawn on the certificate overlay. */
  overlayCourseTitle?: boolean;
  /** When false, score/grade is not drawn on the certificate overlay. */
  overlayScore?: boolean;
  /** When false, badge image is not drawn on the certificate. */
  overlayBadge?: boolean;
  supplementaryDocs?: { title: string; url: string }[];
};
