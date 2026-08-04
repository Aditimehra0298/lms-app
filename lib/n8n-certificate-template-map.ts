import { canonicalCourseSlug } from "@/lib/course-slug-aliases";

/**
 * Exact `courseName` values accepted by the n8n certificate workflow (PDF template matching).
 * POST bodies must use one of these strings — not the LMS display title.
 */
export const N8N_CERTIFICATE_COURSE_NAMES = [
  "Advanced Food Fraud Mitigation and Auditing FSSC 220002018 VERSION 6",
  "Carbon Trading & Reporting",
  "Cybersecurity awareness phishness",
  "DIPLOMA in Cybersecurity & Ethical Hacking (FOUNDATIONS)",
  "DIPLOMA IN HACCP FOOD SAFETY STANDARDS (LEVEL 2)",
  "ESG Management Development Training Program",
  "EU Cybersecurity Compliance Core (NIS2 & DORA)",
  "Food Defense Training Aligned with FSSC 22000 2018 Requirements",
  "FSSC 22000 Category E PRP Implementation and Audit Training for Catering Operations",
  "GDPR - EU Data Protection Foundation Course",
  "ISO 140012015 EMS Internal Auditor",
  "ISO 140012015 EMS Internal Auditor Course",
  "ISO 140012015 EMS Lead Auditor Course",
  "ISO 14064 Mastering GHG Accounting & Verification",
  "ISO 149712019- Application of Risk Management to medical Devices",
  "ISO 190112018 - Guidelines for Auditing Management Systems",
  "ISOIEC 27001 2022 Awareness Course",
  "Mastering EU MDR Essentials Practical Compliance for Medical Devices",
  "PRP Requirements for Feed and Animal Food Production as per ISOTS 22002-62016",
  "PRP Requirements for Transport and Storage as per ISOTS 22002-52019",
  "Training on ISO 27001 Annex 8",
] as const;

export type N8nCertificateCourseName = (typeof N8N_CERTIFICATE_COURSE_NAMES)[number];

const ALLOWED_COURSE_NAMES = new Set<string>(N8N_CERTIFICATE_COURSE_NAMES);

export function isAllowedN8nCertificateCourseName(name: string | null | undefined): name is N8nCertificateCourseName {
  const trimmed = name?.trim();
  return Boolean(trimmed && ALLOWED_COURSE_NAMES.has(trimmed));
}

/**
 * n8n certificate PDF template names — matched in the n8n workflow when generating certificates.
 * Keys are LMS course slugs (see admin catalog / `lms_course.slug`).
 */
export const N8N_CERTIFICATE_TEMPLATE_BY_SLUG: Record<string, N8nCertificateCourseName> = {
  "fssc-22000-v6-food-fraud-mitigation-auditing":
    "Advanced Food Fraud Mitigation and Auditing FSSC 220002018 VERSION 6",
  "carbon-trading-reporting": "Carbon Trading & Reporting",
  "essentials-of-carbon-trading-and-reporting": "Carbon Trading & Reporting",
  "cyber-security-phishing-awareness-training": "Cybersecurity awareness phishness",
  cybersecurity: "Cybersecurity awareness phishness",
  "diploma-cybersecurity-ethical-hacking-foundations":
    "DIPLOMA in Cybersecurity & Ethical Hacking (FOUNDATIONS)",
  "advanced-cyber-security-professional":
    "DIPLOMA in Cybersecurity & Ethical Hacking (FOUNDATIONS)",
  "food-safety-masterclass": "DIPLOMA IN HACCP FOOD SAFETY STANDARDS (LEVEL 2)",
  "cousers-esg-esg-management-development-training-program":
    "ESG Management Development Training Program",
  "eu-cybersecurity-compliance-nis2-dora": "EU Cybersecurity Compliance Core (NIS2 & DORA)",
  "food-defense-fssc-22000-2018":
    "Food Defense Training Aligned with FSSC 22000 2018 Requirements",
  "fssc-22000-category-e-prp-catering":
    "FSSC 22000 Category E PRP Implementation and Audit Training for Catering Operations",
  "gdpr-eu-data-protection-foundation": "GDPR - EU Data Protection Foundation Course",
  "iso-14001-2015-ems-internal-auditor": "ISO 140012015 EMS Internal Auditor",
  "iso-14001-2015-ems-internal-auditor-course": "ISO 140012015 EMS Internal Auditor Course",
  "iso-14001-2015-ems-lead-auditor": "ISO 140012015 EMS Lead Auditor Course",
  "iso-14064-ghg-accounting-verification": "ISO 14064 Mastering GHG Accounting & Verification",
  "iso-14971-2019-medical-device-risk":
    "ISO 149712019- Application of Risk Management to medical Devices",
  "iso-19011-2018-auditing-management-systems":
    "ISO 190112018 - Guidelines for Auditing Management Systems",
  "iso-iec-27001-2022-awareness": "ISOIEC 27001 2022 Awareness Course",
  "information-security-governance": "ISOIEC 27001 2022 Awareness Course",
  "eu-mdr-medical-device-compliance":
    "Mastering EU MDR Essentials Practical Compliance for Medical Devices",
  "medical-device-quality-regulatory":
    "Mastering EU MDR Essentials Practical Compliance for Medical Devices",
  "prp-feed-animal-food-iso-ts-22002-6":
    "PRP Requirements for Feed and Animal Food Production as per ISOTS 22002-62016",
  "prp-transport-storage-iso-ts-22002-5":
    "PRP Requirements for Transport and Storage as per ISOTS 22002-52019",
  "iso-27001-annex-a-8-training": "Training on ISO 27001 Annex 8",
};

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[:\u2013\u2014]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Title → template name (fallback when slug is not in the map yet). */
const N8N_CERTIFICATE_TEMPLATE_BY_TITLE: Record<string, N8nCertificateCourseName> = Object.fromEntries(
  N8N_CERTIFICATE_COURSE_NAMES.map((name) => [normalizeTitleKey(name), name]),
) as Record<string, N8nCertificateCourseName>;

/**
 * Resolve the n8n `courseName` for certificate generation.
 * Returns one of {@link N8N_CERTIFICATE_COURSE_NAMES} or null when the course is not mapped.
 */
export function resolveN8nCertificateTemplateName(input: {
  courseSlug: string;
  courseTitle?: string | null;
  /** Per-course override from Admin → Certificate settings. */
  configTemplateName?: string | null;
}): N8nCertificateCourseName | null {
  const override = input.configTemplateName?.trim();
  if (override && isAllowedN8nCertificateCourseName(override)) return override;

  const slug = canonicalCourseSlug(input.courseSlug);
  const fromSlug = N8N_CERTIFICATE_TEMPLATE_BY_SLUG[slug];
  if (fromSlug) return fromSlug;

  const titleKey = normalizeTitleKey(input.courseTitle ?? "");
  if (titleKey) {
    const fromTitle = N8N_CERTIFICATE_TEMPLATE_BY_TITLE[titleKey];
    if (fromTitle) return fromTitle;

    for (const [slugKey, templateName] of Object.entries(N8N_CERTIFICATE_TEMPLATE_BY_SLUG)) {
      const slugNorm = normalizeTitleKey(slugKey.replace(/-/g, " "));
      if (titleKey.includes(slugNorm) || slugNorm.includes(titleKey)) {
        return templateName;
      }
    }
  }

  return null;
}

export function listN8nCertificateTemplateMappings(): Array<{ slug: string; templateName: N8nCertificateCourseName }> {
  const seen = new Set<string>();
  const rows: Array<{ slug: string; templateName: N8nCertificateCourseName }> = [];
  for (const [slug, templateName] of Object.entries(N8N_CERTIFICATE_TEMPLATE_BY_SLUG)) {
    if (slug === "cybersecurity") continue;
    if (seen.has(templateName)) continue;
    seen.add(templateName);
    rows.push({ slug, templateName });
  }
  return rows.sort((a, b) => a.templateName.localeCompare(b.templateName));
}
