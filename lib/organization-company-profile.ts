import type { LearnerAuthProfile } from "@/lib/auth-profile";
import { readOrgCompanyBranding } from "@/lib/organization-achievements-branding";

export type OrganizationCompanyProfile = {
  companyName: string;
  tagline: string;
  whatWeDo: string;
  focusAreas: string[];
  trainingPriorities: string[];
  logoUrl: string;
  logoSource: "uploaded" | "default";
  industryLabel: string;
  sizeLabel: string;
  countryLabel?: string;
  foundedYear?: string;
  employeeRange?: string;
};

type IndustryTemplate = {
  match: RegExp;
  tagline: string;
  whatWeDo: string;
  focusAreas: string[];
  trainingPriorities: string[];
  defaultLogoUrl: string;
  foundedYear: string;
};

const DEFAULT_LOGO =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80";

const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    match: /food|beverage|dairy|bakery|fssc|haccp|catering|restaurant/i,
    tagline: "Safe, quality food from farm to fork",
    whatWeDo:
      "We produce and distribute food and beverage products with rigorous safety controls, supplier audits, and traceability across our supply chain. Our teams run HACCP-based operations and work toward GFSI-aligned certification.",
    focusAreas: ["Food safety & HACCP", "Supplier quality", "Packaging integrity", "Regulatory compliance"],
    trainingPriorities: ["HACCP", "Food fraud mitigation", "FSSC 22000", "Hygiene & GMP"],
    defaultLogoUrl:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=400&q=80",
    foundedYear: "1998",
  },
  {
    match: /health|hospital|clinic|pharma|medical|care/i,
    tagline: "Trusted care with clinical excellence",
    whatWeDo:
      "We deliver patient-centered healthcare services with emphasis on safety, infection control, and regulatory compliance. Clinical and support staff follow documented procedures and continuous improvement programs.",
    focusAreas: ["Patient safety", "Clinical governance", "Medical device compliance", "Workplace health"],
    trainingPriorities: ["Health & safety", "Medical device standards", "Compliance & auditing", "Leadership"],
    defaultLogoUrl:
      "https://images.unsplash.com/photo-1519494026894-425bbd709694?auto=format&fit=crop&w=400&q=80",
    foundedYear: "2005",
  },
  {
    match: /tech|software|cyber|digital|it|saas|cloud/i,
    tagline: "Secure digital products for modern enterprises",
    whatWeDo:
      "We build and operate software platforms and IT services for enterprise clients. Security, data protection, and resilient infrastructure are core to how we design, deploy, and support our solutions.",
    focusAreas: ["Information security", "Cloud operations", "Product engineering", "Client success"],
    trainingPriorities: ["Cybersecurity", "ISO 27001", "Compliance & auditing", "Leadership & management"],
    defaultLogoUrl:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=400&q=80",
    foundedYear: "2012",
  },
  {
    match: /manufactur|factory|plant|production|industrial/i,
    tagline: "Precision manufacturing with zero-compromise quality",
    whatWeDo:
      "We manufacture industrial products with ISO-aligned quality systems, workplace safety programs, and lean operations. Our plants maintain documented processes, equipment calibration, and supplier controls.",
    focusAreas: ["Quality management", "Workplace safety", "Process control", "Environmental compliance"],
    trainingPriorities: ["ISO standards", "Health & safety", "Quality management", "ESG compliance"],
    defaultLogoUrl:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80",
    foundedYear: "1987",
  },
  {
    match: /finance|bank|insurance|fintech|invest/i,
    tagline: "Responsible financial services built on trust",
    whatWeDo:
      "We provide regulated financial products and advisory services with strong governance, fraud prevention, and data protection. Teams follow compliance frameworks and audit-ready documentation.",
    focusAreas: ["Risk & compliance", "Fraud prevention", "Data protection", "Customer trust"],
    trainingPriorities: ["Compliance & auditing", "Cybersecurity", "Information security", "Leadership"],
    defaultLogoUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80",
    foundedYear: "2001",
  },
  {
    match: /hotel|hospitality|resort|travel|tourism/i,
    tagline: "Memorable guest experiences with safety at the core",
    whatWeDo:
      "We operate hospitality venues where food safety, hygiene standards, and staff training directly shape guest satisfaction. Our teams maintain consistent service quality across properties.",
    focusAreas: ["Guest safety", "Food hygiene", "Service excellence", "Team development"],
    trainingPriorities: ["Food safety & HACCP", "Health & safety", "Leadership", "Compliance"],
    defaultLogoUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099935?auto=format&fit=crop&w=400&q=80",
    foundedYear: "1995",
  },
  {
    match: /education|school|university|academy|training/i,
    tagline: "Learning that builds capable teams",
    whatWeDo:
      "We deliver education and professional development programs, helping learners and organisations build skills aligned with industry standards and workforce needs.",
    focusAreas: ["Curriculum quality", "Learner outcomes", "Faculty development", "Accreditation"],
    trainingPriorities: ["Leadership & management", "Quality management", "Compliance", "Skill development"],
    defaultLogoUrl:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=400&q=80",
    foundedYear: "2010",
  },
  {
    match: /sustain|environment|esg|green|energy/i,
    tagline: "Sustainable operations for a resilient future",
    whatWeDo:
      "We help organisations measure, report, and improve environmental and social performance. Our work spans ESG reporting, emissions reduction, and responsible supply chain practices.",
    focusAreas: ["ESG reporting", "Carbon reduction", "Responsible sourcing", "Stakeholder engagement"],
    trainingPriorities: ["ESG compliance", "Sustainability", "Compliance & auditing", "Leadership"],
    defaultLogoUrl:
      "https://images.unsplash.com/photo-1473341303090-613dca948df4?auto=format&fit=crop&w=400&q=80",
    foundedYear: "2016",
  },
];

function pickIndustryTemplate(industryType: string, companyName: string): IndustryTemplate | null {
  const haystack = `${industryType} ${companyName}`.trim();
  if (!haystack) return null;
  return INDUSTRY_TEMPLATES.find((t) => t.match.test(haystack)) ?? null;
}

function genericProfile(companyName: string): Pick<
  IndustryTemplate,
  "tagline" | "whatWeDo" | "focusAreas" | "trainingPriorities" | "defaultLogoUrl" | "foundedYear"
> {
  const label = companyName.trim() || "Your organisation";
  return {
    tagline: "Building capability through continuous learning",
    whatWeDo: `${label} invests in workforce development, compliance, and operational excellence. We use structured training to keep teams audit-ready and aligned with industry standards.`,
    focusAreas: ["Team development", "Compliance", "Operational excellence", "Quality culture"],
    trainingPriorities: ["Compliance & auditing", "Leadership & management", "Health & safety", "Quality management"],
    defaultLogoUrl: DEFAULT_LOGO,
    foundedYear: "2008",
  };
}

function parseEmployeeRange(companySize?: string | null): string | undefined {
  const raw = companySize?.trim();
  if (!raw) return undefined;
  if (/\d/.test(raw)) return raw;
  return undefined;
}

export function buildOrganizationCompanyProfile(input: {
  profile: Pick<
    LearnerAuthProfile,
    "companyName" | "name" | "industryType" | "companySize" | "countryName" | "countryCode"
  >;
  brandingLogoUrl?: string | null;
}): OrganizationCompanyProfile {
  const companyName =
    input.profile.companyName?.trim() ||
    input.profile.name?.trim() ||
    "Your Organisation";
  const industryType = input.profile.industryType?.trim() ?? "";
  const template =
    pickIndustryTemplate(industryType, companyName) ?? genericProfile(companyName);

  const uploadedLogo = input.brandingLogoUrl?.trim();
  const clientLogo =
    typeof window !== "undefined" ? readOrgCompanyBranding().logoUrl?.trim() : undefined;
  const logoUrl = uploadedLogo || clientLogo || template.defaultLogoUrl;

  return {
    companyName,
    tagline: template.tagline,
    whatWeDo: template.whatWeDo,
    focusAreas: template.focusAreas,
    trainingPriorities: template.trainingPriorities,
    logoUrl,
    logoSource: uploadedLogo || clientLogo ? "uploaded" : "default",
    industryLabel: industryType || "General business",
    sizeLabel: input.profile.companySize?.trim() || "Growing team",
    countryLabel: input.profile.countryName?.trim() || undefined,
    foundedYear: template.foundedYear,
    employeeRange: parseEmployeeRange(input.profile.companySize),
  };
}
