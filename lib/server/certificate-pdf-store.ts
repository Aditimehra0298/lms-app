import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/** Permanent certificate PDFs — not temporary n8n / Drive links. */
export const CERTIFICATE_PDF_DIR = path.join(process.cwd(), "storage", "private", "certificates");

/** Real n8n certificates are multi-page PDFs — reject tiny placeholders. */
export const N8N_ARCHIVED_PDF_MIN_BYTES = 4096;

export function certificatePdfFileName(certificateId: string): string {
  const safe = certificateId.trim();
  if (!safe || safe.includes("..") || safe.includes("/")) {
    throw new Error("Invalid certificate id");
  }
  return `${safe}.pdf`;
}

/** Public LMS URL stored in MySQL `pdfUrl`. */
export function certificatePdfServePath(certificateId: string): string {
  return `/api/certificates/${encodeURIComponent(certificateId.trim())}/pdf`;
}

export async function certificatePdfExists(certificateId: string): Promise<boolean> {
  try {
    await access(path.join(CERTIFICATE_PDF_DIR, certificatePdfFileName(certificateId)));
    return true;
  } catch {
    return false;
  }
}

/** True when a non-empty PDF with a valid header is stored on disk. */
export async function isValidArchivedCertificatePdf(
  certificateId: string,
  options?: { minBytes?: number },
): Promise<boolean> {
  const minBytes = options?.minBytes ?? 128;
  const filePath = await resolveCertificatePdfPath(certificateId);
  if (!filePath) return false;
  try {
    const info = await stat(filePath);
    if (info.size < minBytes) return false;
    const header = await readFile(filePath, { encoding: null, flag: "r" });
    return header.subarray(0, 5).toString("utf8") === "%PDF-";
  } catch {
    return false;
  }
}

export async function readCertificatePdfBuffer(
  certificateId: string,
  options?: { minBytes?: number },
): Promise<Buffer | null> {
  const minBytes = options?.minBytes ?? 128;
  const filePath = await resolveCertificatePdfPath(certificateId);
  if (!filePath) return null;
  try {
    const buffer = await readFile(filePath);
    if (buffer.length < minBytes || buffer.subarray(0, 5).toString("utf8") !== "%PDF-") {
      return null;
    }
    return buffer;
  } catch {
    return null;
  }
}

export async function resolveCertificatePdfPath(certificateId: string): Promise<string | null> {
  const filePath = path.join(CERTIFICATE_PDF_DIR, certificatePdfFileName(certificateId));
  try {
    await access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

/**
 * Download PDF from n8n (temporary URL) or decode base64, then save permanently on LMS disk.
 */
export async function persistCertificatePdf(input: {
  certificateId: string;
  remoteUrl?: string | null;
  pdfBase64?: string | null;
}): Promise<{ ok: true; storedUrl: string } | { ok: false; message: string }> {
  const id = input.certificateId.trim();
  if (!id) return { ok: false, message: "certificateId required" };

  let buffer: Buffer;
  try {
    if (input.pdfBase64?.trim()) {
      buffer = Buffer.from(input.pdfBase64.trim(), "base64");
    } else if (input.remoteUrl?.trim()) {
      const res = await fetch(input.remoteUrl.trim(), {
        signal: AbortSignal.timeout(120_000),
        headers: { Accept: "application/pdf,*/*" },
      });
      if (!res.ok) {
        return { ok: false, message: `Could not download PDF from n8n (${res.status}).` };
      }
      buffer = Buffer.from(await res.arrayBuffer());
      const minBytes = N8N_ARCHIVED_PDF_MIN_BYTES;
      if (
        buffer.length < minBytes ||
        buffer.subarray(0, 5).toString("utf8") !== "%PDF-"
      ) {
        return { ok: false, message: "Downloaded PDF from n8n is empty or invalid." };
      }
    } else {
      return { ok: false, message: "Provide pdfUrl or pdfBase64 from n8n." };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF download failed";
    return { ok: false, message: msg };
  }

  if (buffer.length < 128 || buffer.subarray(0, 5).toString("utf8") !== "%PDF-") {
    return { ok: false, message: "Downloaded PDF is empty or invalid." };
  }

  await mkdir(CERTIFICATE_PDF_DIR, { recursive: true });
  await writeFile(path.join(CERTIFICATE_PDF_DIR, certificatePdfFileName(id)), buffer);

  return { ok: true, storedUrl: certificatePdfServePath(id) };
}

/** If file exists on disk, return LMS serve URL; otherwise keep existing DB URL. */
export async function resolveStoredCertificatePdfUrl(
  certificateId: string,
  currentPdfUrl: string | null,
): Promise<string | null> {
  if (await isValidArchivedCertificatePdf(certificateId, { minBytes: N8N_ARCHIVED_PDF_MIN_BYTES })) {
    return certificatePdfServePath(certificateId);
  }
  if (currentPdfUrl?.startsWith("/api/certificates/")) {
    return null;
  }
  return currentPdfUrl;
}
