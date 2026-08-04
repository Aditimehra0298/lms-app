/** Public certificate tracker URL (QR on PDF + LinkedIn share). */
export function buildCertificateVerifyUrl(
  baseUrl: string,
  input: { delegateNumber?: string | null; certificateNumber?: string | null },
): string {
  const base = baseUrl.replace(/\/$/, "");
  if (input.delegateNumber?.trim()) {
    return `${base}/certificates/verify?delegate=${encodeURIComponent(input.delegateNumber.trim())}`;
  }
  if (input.certificateNumber?.trim()) {
    return `${base}/certificates/verify?number=${encodeURIComponent(input.certificateNumber.trim())}`;
  }
  return `${base}/certificates/verify`;
}

/**
 * URL encoded in the QR printed on the certificate.
 * Prefers certificate number so /certificates/verify can autofill the form.
 */
export function buildCertificateQrVerifyUrl(
  baseUrl: string,
  input: { certificateNumber?: string | null; delegateNumber?: string | null },
): string {
  const base = baseUrl.replace(/\/$/, "");
  if (input.certificateNumber?.trim()) {
    return `${base}/certificates/verify?number=${encodeURIComponent(input.certificateNumber.trim())}`;
  }
  if (input.delegateNumber?.trim()) {
    return `${base}/certificates/verify?delegate=${encodeURIComponent(input.delegateNumber.trim())}`;
  }
  return `${base}/certificates/verify`;
}

export function buildLinkedInShareUrl(pageUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
}
