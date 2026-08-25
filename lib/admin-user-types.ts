export type AdminUserPurchaseRow = {
  courseSlug: string;
  title: string;
  enrolledAt: string;
};

export type AdminUserOrganizationRow = {
  identificationNumber: number;
  companyName: string;
  workEmail: string;
  industryType: string | null;
  companySize: string | null;
  registrationMonthYear: string | null;
};

export type AdminUserCourseProgressRow = {
  courseSlug: string;
  title: string;
  enrolledAt: string | null;
  completedModules: number;
  totalModules: number;
  percent: number;
  status: "Not Started" | "In Progress" | "Completed";
  examPassedCount: number;
  examAttemptCount: number;
  lastExamPercent: number | null;
  updatedAt: string | null;
  certificateStatus: "none" | "pending" | "ready" | "failed";
  certificateNumber: string | null;
};

export type AdminUserCertificateRow = {
  courseSlug: string;
  courseTitle: string;
  certificateNumber: string;
  status: string;
  issuedAt: string;
  scorePercent: number | null;
};

export type AdminUserListRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accountType: string | null;
  phone: string | null;
  personalEmail: string | null;
  companyName: string | null;
  industryType: string | null;
  companySize: string | null;
  countryCode: string | null;
  countryName: string | null;
  identificationNumber: number | null;
  registrationMonth: number | null;
  registrationYear: number | null;
  registrationMonthYear: string | null;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  purchaseCount: number;
  certificateCount: number;
  isMainAdmin: boolean;
  panelAccess: "full" | "none";
  organization: AdminUserOrganizationRow | null;
  recentPurchases: AdminUserPurchaseRow[];
  /** Full course progress for enrollments + any stored progress rows. */
  courseProgress: AdminUserCourseProgressRow[];
  certificates: AdminUserCertificateRow[];
};

export type AdminUserListStats = {
  totalUsers: number;
  byRole: Record<string, number>;
  byAccountType: Record<string, number>;
  withPurchases: number;
  withCertificates: number;
};
