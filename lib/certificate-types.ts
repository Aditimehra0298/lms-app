export type SupplementaryDoc = { title: string; url: string };

export type IssuedCertificateDto = {
  id: string;
  certificateNumber: string;
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
};

export type CertificateRowDto = IssuedCertificateDto & {
  status: string;
  visibleToLearner: boolean;
  pdfUrl: string | null;
  issuedVia: string;
};
