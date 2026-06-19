import { buildCertificateVerifyUrl } from "@/lib/certificate-verify-url";

export type CertificateShareLookup = {
  id?: string | null;
  delegateNumber?: string | null;
  certificateNumber?: string | null;
  learnerName?: string | null;
  courseTitle?: string | null;
};

/** Public share page — OG badge preview + certificate only (no transcript). */
export function buildCertificateEarnedPageUrl(
  baseUrl: string,
  cert: CertificateShareLookup,
): string {
  const base = baseUrl.replace(/\/$/, "");
  let path = "";
  if (cert.delegateNumber?.trim()) {
    path = `/certificates/earned?delegate=${encodeURIComponent(cert.delegateNumber.trim())}`;
  } else {
    const number = cert.certificateNumber?.trim();
    if (number && !number.startsWith("TEMP-")) {
      path = `/certificates/earned?number=${encodeURIComponent(number)}`;
    } else if (cert.id?.trim()) {
      path = `/certificates/earned?id=${encodeURIComponent(cert.id.trim())}`;
    } else {
      return buildCertificateVerifyUrl(base, cert);
    }
  }
  return `${base}${path}&certificateOnly=1`;
}

/** Direct link to the learner's saved certificate PDF (public via delegate / cert number). */
export function buildCertificatePublicPdfUrl(
  baseUrl: string,
  cert: CertificateShareLookup,
): string {
  const base = baseUrl.replace(/\/$/, "");
  if (cert.delegateNumber?.trim()) {
    return `${base}/api/certificates/public-pdf?delegate=${encodeURIComponent(cert.delegateNumber.trim())}`;
  }
  const number = cert.certificateNumber?.trim();
  if (number && !number.startsWith("TEMP-")) {
    return `${base}/api/certificates/public-pdf?number=${encodeURIComponent(number)}`;
  }
  return "";
}

export function buildBadgeShareText(cert: {
  learnerName?: string | null;
  courseTitle: string;
}): string {
  const who = cert.learnerName?.trim();
  if (who) {
    return `${who} earned a certificate in ${cert.courseTitle} at SF Trainings! View the official certificate:`;
  }
  return `I completed ${cert.courseTitle} at SF Trainings! View my official certificate:`;
}
