export type CommunitySuccessSubmissionStatus = "pending" | "approved" | "rejected";

export type StoredCommunitySuccessSubmission = {
  id: string;
  authorEmail: string;
  authorName: string;
  /** Enrolled course slug, or `external` for third-party certificates. */
  courseSlug: string;
  courseTitle: string;
  externalPlatform?: string;
  body?: string;
  attachmentUrl: string;
  status: CommunitySuccessSubmissionStatus;
  createdAt: string;
};

export type CommunitySuccessSubmissionsStoreFile = {
  submissions: StoredCommunitySuccessSubmission[];
};
