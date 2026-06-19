export type SupplementaryDoc = { title: string; url: string };

export type IssuedCertificateDto = {
  id: string;
  certificateNumber: string;
  /** Public tracker ID: YYYY-verifyNumber-userId (QR on certificate). */
  delegateNumber?: string | null;
  verifyNumber?: number | null;
  /** Full URL for QR + social share. */
  verifyUrl?: string | null;
  identificationNumber: number;
  holderType: "individual" | "organisation";
  organizationId: string | null;
  companyName: string | null;
  learnerName: string;
  learnerEmail: string;
  courseSlug: string;
  courseTitle: string;
  issuedAt: string;
  scorePercent: number | null;
  templateImage: string | null;
  badgeImage: string | null;
  supplementaryDocs: SupplementaryDoc[];
  nameTopPercent?: number;
  numberTopPercent?: number;
  dateTopPercent?: number;
  /** True when n8n PDF is archived on LMS disk (MySQL + storage). */
  pdfReady?: boolean;
  pdfUrl?: string | null;
};

export type CertificateRowDto = IssuedCertificateDto & {
  status: string;
  visibleToLearner: boolean;
  pdfUrl: string | null;
  issuedVia: string;
  /** True when a valid PDF is saved on LMS disk (instant download, no n8n). */
  pdfReady?: boolean;
};

/** Admin list row — MySQL user profile + learner download access. */
export type AdminCertificateRowDto = CertificateRowDto & {
  phone: string | null;
  userRole: string;
  userType: string;
  learnerAccess: "allowed" | "blocked" | "pending";
};
