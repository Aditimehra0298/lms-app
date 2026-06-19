/** Default text positions on certificate template (% from top). */
export const DEFAULT_CERTIFICATE_NAME_TOP_PERCENT = 38;
export const DEFAULT_CERTIFICATE_NUMBER_TOP_PERCENT = 52;
export const DEFAULT_CERTIFICATE_DATE_TOP_PERCENT = 62;

export type CertificateTemplateLayout = {
  nameTopPercent: number;
  numberTopPercent: number;
  dateTopPercent: number;
};

export type CertificateTemplateOverlayOptions = {
  overlayCourseTitle: boolean;
  overlayScore: boolean;
  overlayBadge: boolean;
};

export type CertificateTemplateLayoutConfig = CertificateTemplateLayout &
  CertificateTemplateOverlayOptions;

export function resolveCertificateTemplateLayout(
  config?: {
    nameTopPercent?: number;
    numberTopPercent?: number;
    dateTopPercent?: number;
    overlayCourseTitle?: boolean;
    overlayScore?: boolean;
    overlayBadge?: boolean;
  } | null,
): CertificateTemplateLayoutConfig {
  return {
    nameTopPercent: config?.nameTopPercent ?? DEFAULT_CERTIFICATE_NAME_TOP_PERCENT,
    numberTopPercent: config?.numberTopPercent ?? DEFAULT_CERTIFICATE_NUMBER_TOP_PERCENT,
    dateTopPercent: config?.dateTopPercent ?? DEFAULT_CERTIFICATE_DATE_TOP_PERCENT,
    overlayCourseTitle: config?.overlayCourseTitle !== false,
    overlayScore: config?.overlayScore !== false,
    overlayBadge: config?.overlayBadge !== false,
  };
}
