import { open } from "node:fs/promises";

/**
 * Magic-byte / content sniffing for admin uploads (POC-C-07).
 * Extension + client MIME alone are not trusted.
 */

export type DetectedKind =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "application/pdf"
  | "application/zip"
  | "video/mp4"
  | "video/webm"
  | "video/quicktime"
  | "audio/mpeg"
  | "audio/wav"
  | "audio/ogg"
  | "text/plain"
  | "unknown"
  | "dangerous";

function headLooksLikeSvgOrHtml(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 1024)).toString("utf8").toLowerCase();
  const trimmed = sample.replace(/^\uFEFF/, "").trimStart();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) return true;
  if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) return true;
  if (sample.includes("<svg") && sample.includes("onload")) return true;
  if (sample.includes("<script")) return true;
  return false;
}

export function detectContentKind(buf: Buffer): DetectedKind {
  if (!buf.length) return "unknown";
  if (headLooksLikeSvgOrHtml(buf)) return "dangerous";

  // JPEG
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF
  if (buf.length >= 6) {
    const sig = buf.subarray(0, 6).toString("ascii");
    if (sig === "GIF87a" || sig === "GIF89a") return "image/gif";
  }
  // WEBP (RIFF....WEBP)
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  // WAV
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return "audio/wav";
  }
  // PDF
  if (buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  // ZIP / OOXML / EPUB
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)) {
    return "application/zip";
  }
  // WebM / Matroska
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return "video/webm";
  }
  // MP4 / MOV / M4A / M4V — ftyp box
  if (buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii").toLowerCase();
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4";
  }
  // MP3
  if (buf.length >= 3 && buf.subarray(0, 3).toString("ascii") === "ID3") return "audio/mpeg";
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "audio/mpeg";
  // OGG
  if (buf.length >= 4 && buf.subarray(0, 4).toString("ascii") === "OggS") return "audio/ogg";

  // Plain text (printable / whitespace only in sample) — still reject if SVG-ish above
  const sample = buf.subarray(0, Math.min(buf.length, 512));
  let textish = true;
  for (let i = 0; i < sample.length; i++) {
    const c = sample[i]!;
    if (c === 0) {
      textish = false;
      break;
    }
    if (c < 7 || (c > 14 && c < 32 && c !== 9 && c !== 10 && c !== 13)) {
      textish = false;
      break;
    }
  }
  if (textish) return "text/plain";

  return "unknown";
}

const IMAGE_KINDS = new Set<DetectedKind>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_TO_EXPECTED: Record<string, DetectedKind[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
  ".pdf": ["application/pdf"],
  ".zip": ["application/zip"],
  ".epub": ["application/zip"],
  ".docx": ["application/zip"],
  ".pptx": ["application/zip"],
  ".doc": ["application/zip", "unknown", "text/plain"], // legacy OLE often unknown
  ".ppt": ["application/zip", "unknown"],
  ".mp4": ["video/mp4"],
  ".m4v": ["video/mp4"],
  ".m4a": ["video/mp4", "audio/mpeg"],
  ".mov": ["video/quicktime", "video/mp4"],
  ".webm": ["video/webm"],
  ".mp3": ["audio/mpeg"],
  ".wav": ["audio/wav"],
  ".ogg": ["audio/ogg"],
  ".aac": ["audio/mpeg", "unknown", "video/mp4"],
  ".txt": ["text/plain"],
  ".csv": ["text/plain"],
  ".vtt": ["text/plain"],
  ".srt": ["text/plain"],
};

export function extFromName(name: string): string {
  const m = name.match(/(\.[a-z0-9]+)$/i);
  return m ? m[1]!.toLowerCase() : "";
}

export type ContentValidationResult =
  | { ok: true; detected: DetectedKind; mime: string }
  | { ok: false; message: string };

/** Validate buffer against claimed extension / MIME for cover images. */
export function validateImageUpload(buf: Buffer, fileName: string): ContentValidationResult {
  const detected = detectContentKind(buf);
  if (detected === "dangerous") {
    return { ok: false, message: "File content looks like SVG/HTML/script and is not allowed." };
  }
  if (!IMAGE_KINDS.has(detected)) {
    return {
      ok: false,
      message: "File content is not a valid JPEG, PNG, WebP, or GIF image.",
    };
  }
  const ext = extFromName(fileName);
  const expected = EXT_TO_EXPECTED[ext];
  if (expected && !expected.includes(detected)) {
    return {
      ok: false,
      message: `File extension ${ext || "(none)"} does not match detected image type.`,
    };
  }
  return { ok: true, detected, mime: detected };
}

/** Validate general admin media upload content vs filename extension. */
export function validateAdminMediaUpload(buf: Buffer, fileName: string): ContentValidationResult {
  const detected = detectContentKind(buf);
  if (detected === "dangerous") {
    return { ok: false, message: "File content looks like SVG/HTML/script and is not allowed." };
  }

  const ext = extFromName(fileName);
  const expected = EXT_TO_EXPECTED[ext];
  if (!expected) {
    return { ok: false, message: "Unsupported file extension." };
  }

  // Legacy .doc/.ppt often lack a clear modern magic — allow unknown for those only.
  if (detected === "unknown" && (ext === ".doc" || ext === ".ppt" || ext === ".aac")) {
    return { ok: true, detected, mime: "application/octet-stream" };
  }

  if (!expected.includes(detected)) {
    return {
      ok: false,
      message: `File content does not match extension ${ext}. Detected: ${detected}.`,
    };
  }

  const mime =
    detected === "application/zip"
      ? ext === ".pdf"
        ? "application/pdf"
        : ext === ".docx"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : ext === ".pptx"
            ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            : ext === ".epub"
              ? "application/epub+zip"
              : "application/zip"
      : detected === "text/plain"
        ? ext === ".csv"
          ? "text/csv"
          : ext === ".vtt"
            ? "text/vtt"
            : ext === ".srt"
              ? "application/x-subrip"
              : "text/plain"
        : detected;

  return { ok: true, detected, mime };
}

/** Read the first N bytes of a file on disk for sniffing. */
export async function readFileHead(filePath: string, maxBytes = 4096): Promise<Buffer> {
  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(maxBytes);
    const { bytesRead } = await fh.read(buf, 0, maxBytes, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}
