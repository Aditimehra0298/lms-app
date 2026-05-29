/** Build download URL for stored LMS certificate PDFs (requires ?email=). */
export function certificatePdfDownloadHref(
  pdfUrl: string | null | undefined,
  email: string | null | undefined,
): string | null {
  if (!pdfUrl?.trim()) return null;
  const url = pdfUrl.trim();
  if (url.startsWith("/api/certificates/") && email?.trim()) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}email=${encodeURIComponent(email.trim().toLowerCase())}`;
  }
  return url;
}
