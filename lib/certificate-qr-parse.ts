/** Extract verify fields from a scanned QR payload (URL or raw certificate number). */
export function parseCertificateQrPayload(raw: string): {
  email?: string;
  number?: string;
  delegate?: string;
  id?: string;
  q?: string;
} {
  const text = raw.trim();
  if (!text) return {};

  try {
    const asUrl = new URL(text);
    const email = asUrl.searchParams.get("email")?.trim() || undefined;
    const number = asUrl.searchParams.get("number")?.trim() || undefined;
    const delegate = asUrl.searchParams.get("delegate")?.trim() || undefined;
    const id = asUrl.searchParams.get("id")?.trim() || undefined;
    const q = asUrl.searchParams.get("q")?.trim() || undefined;
    if (email || number || delegate || id || q) {
      return { email, number, delegate, id, q };
    }
  } catch {
    // Not a URL — treat as certificate / delegate id.
  }

  if (/^\d{4}-\d+-\d+(-org)?$/i.test(text)) {
    return { delegate: text };
  }
  return { number: text, q: text };
}
