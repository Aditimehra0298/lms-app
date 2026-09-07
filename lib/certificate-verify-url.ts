function verifyPath(
  baseUrl: string,
  query: string,
): string {
  const base = baseUrl.replace(/\/$/, "");
  // Relative paths avoid leaking private/LAN hosts when no public base is configured.
  if (!base) return query ? `/certificates/verify?${query}` : "/certificates/verify";
  return query ? `${base}/certificates/verify?${query}` : `${base}/certificates/verify`;
}

/** Public certificate tracker URL (QR on PDF + LinkedIn share). */
export function buildCertificateVerifyUrl(
  baseUrl: string,
  input: { delegateNumber?: string | null; certificateNumber?: string | null },
): string {
  if (input.delegateNumber?.trim()) {
    return verifyPath(baseUrl, `delegate=${encodeURIComponent(input.delegateNumber.trim())}`);
  }
  if (input.certificateNumber?.trim()) {
    return verifyPath(baseUrl, `number=${encodeURIComponent(input.certificateNumber.trim())}`);
  }
  return verifyPath(baseUrl, "");
}

/**
 * URL encoded in the QR printed on the certificate.
 * Prefers certificate number so /certificates/verify can autofill the form.
 */
export function buildCertificateQrVerifyUrl(
  baseUrl: string,
  input: { certificateNumber?: string | null; delegateNumber?: string | null },
): string {
  if (input.certificateNumber?.trim()) {
    return verifyPath(baseUrl, `number=${encodeURIComponent(input.certificateNumber.trim())}`);
  }
  if (input.delegateNumber?.trim()) {
    return verifyPath(baseUrl, `delegate=${encodeURIComponent(input.delegateNumber.trim())}`);
  }
  return verifyPath(baseUrl, "");
}

export function buildLinkedInShareUrl(pageUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
}
