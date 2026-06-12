/** Organisation premium branding — company logo, custom badges, employee credentials (localStorage demo). */

export const ORG_BRANDING_EVENT = "sft_org_branding_updated";

export type OrgCompanyBadge = {
  id: string;
  url: string;
  name: string;
  uploadedAt: string;
};

export type OrgCompanyBranding = {
  logoUrl?: string;
  logoName?: string;
  logoUploadedAt?: string;
  badges: OrgCompanyBadge[];
};

export type OrgEmployeeCredential = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeUserId: string;
  url: string;
  name: string;
  /** How they earned it / impact for the company */
  story?: string;
  uploadedAt: string;
};

const BRANDING_KEY = "sft_org_company_branding";
const EMPLOYEE_CREDS_KEY = "sft_org_employee_credentials";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ORG_BRANDING_EVENT));
}

export function readOrgCompanyBranding(): OrgCompanyBranding {
  if (typeof window === "undefined") return { badges: [] };
  try {
    const raw = window.localStorage.getItem(BRANDING_KEY);
    if (!raw) return { badges: [] };
    const parsed = JSON.parse(raw) as OrgCompanyBranding;
    return {
      logoUrl: parsed.logoUrl?.trim() || undefined,
      logoName: parsed.logoName?.trim() || undefined,
      logoUploadedAt: parsed.logoUploadedAt,
      badges: Array.isArray(parsed.badges) ? parsed.badges.filter((b) => b.url && b.name) : [],
    };
  } catch {
    return { badges: [] };
  }
}

function writeBranding(data: OrgCompanyBranding) {
  window.localStorage.setItem(BRANDING_KEY, JSON.stringify(data));
  emit();
}

export function saveOrgCompanyLogo(url: string, name: string) {
  const current = readOrgCompanyBranding();
  writeBranding({
    ...current,
    logoUrl: url.trim(),
    logoName: name.trim(),
    logoUploadedAt: new Date().toISOString(),
  });
}

export function clearOrgCompanyLogo() {
  const current = readOrgCompanyBranding();
  writeBranding({
    ...current,
    logoUrl: undefined,
    logoName: undefined,
    logoUploadedAt: undefined,
  });
}

export function addOrgCompanyBadge(url: string, name: string) {
  const current = readOrgCompanyBranding();
  const badge: OrgCompanyBadge = {
    id: newId("ob"),
    url: url.trim(),
    name: name.trim(),
    uploadedAt: new Date().toISOString(),
  };
  writeBranding({
    ...current,
    badges: [badge, ...current.badges].slice(0, 12),
  });
}

export function readOrgEmployeeCredentials(): OrgEmployeeCredential[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EMPLOYEE_CREDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrgEmployeeCredential[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r.url && r.name && r.employeeName);
  } catch {
    return [];
  }
}

function writeEmployeeCredentials(rows: OrgEmployeeCredential[]) {
  window.localStorage.setItem(EMPLOYEE_CREDS_KEY, JSON.stringify(rows));
  emit();
}

export function addOrgEmployeeCredential(input: {
  employeeId: string;
  employeeName: string;
  employeeUserId: string;
  url: string;
  name: string;
  story?: string;
}): OrgEmployeeCredential[] {
  const row: OrgEmployeeCredential = {
    id: newId("ec"),
    employeeId: input.employeeId,
    employeeName: input.employeeName.trim(),
    employeeUserId: input.employeeUserId,
    url: input.url.trim(),
    name: input.name.trim(),
    story: input.story?.trim() || undefined,
    uploadedAt: new Date().toISOString(),
  };
  const next = [row, ...readOrgEmployeeCredentials()].slice(0, 24);
  writeEmployeeCredentials(next);
  return next;
}

export function isOrgCredentialPdf(name: string, url: string): boolean {
  return /\.pdf$/i.test(name) || /\.pdf($|\?)/i.test(url);
}

/** Preview badges shown until the org uploads their own (premium branding demo). */
export function organizationBrandingSamples(): OrgCompanyBadge[] {
  return [
    {
      id: "sample-badge-excellence",
      url: "https://res.cloudinary.com/dwnnakrrh/image/upload/v1781164540/ChatGPT_Image_Jun_11_2026_01_25_11_PM_s4a0fx.png",
      name: "Team Excellence Badge",
      uploadedAt: new Date().toISOString(),
    },
    {
      id: "sample-badge-compliance",
      url: "https://res.cloudinary.com/dwnnakrrh/image/upload/v1781164540/ChatGPT_Image_Jun_11_2026_01_25_11_PM_s4a0fx.png",
      name: "Compliance Champion",
      uploadedAt: new Date().toISOString(),
    },
  ];
}
