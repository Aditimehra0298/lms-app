import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReadStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

/** Files are NOT under public/ — only reachable via /api/media/serve with a signed token. */
export const PRIVATE_MEDIA_DIR = path.join(process.cwd(), "storage", "private", "admin");

const LEGACY_PUBLIC_DIR = path.join(process.cwd(), "public", "uploads", "admin");

/** Normalize stored URL or legacy path to internal storage file name (basename only). */
export function storageFileNameFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      pathname = new URL(trimmed).pathname;
    }
  } catch {
    return null;
  }

  const servePrefix = "/api/media/serve/";
  if (pathname.startsWith(servePrefix)) {
    try {
      const segment = pathname.slice(servePrefix.length).split("?")[0] ?? "";
      const base = path.basename(decodeURIComponent(segment));
      return base && !base.includes("..") ? base : null;
    } catch {
      return null;
    }
  }

  const legacyPrefix = "/uploads/admin/";
  if (pathname.startsWith(legacyPrefix)) {
    const base = path.basename(pathname);
    return base && !base.includes("..") ? base : null;
  }

  if (pathname.startsWith("/storage/private/admin/")) {
    const base = path.basename(pathname);
    return base && !base.includes("..") ? base : null;
  }

  return null;
}

export function isManagedLocalMediaUrl(url: string): boolean {
  const t = url.trim();
  if (t.startsWith("/api/media/serve/")) return true;
  return storageFileNameFromUrl(t) !== null;
}

export function protectedMediaServePath(fileName: string): string {
  return `/api/media/serve/${encodeURIComponent(fileName)}`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Resolve readable path: private store first, then legacy public folder. */
export async function resolveMediaFilePath(fileName: string): Promise<string | null> {
  const safe = path.basename(fileName);
  if (!safe || safe !== fileName || safe.includes("..")) return null;

  const privatePath = path.join(PRIVATE_MEDIA_DIR, safe);
  if (await fileExists(privatePath)) return privatePath;

  const legacyPath = path.join(LEGACY_PUBLIC_DIR, safe);
  if (await fileExists(legacyPath)) return legacyPath;

  return null;
}

export async function savePrivateMediaFile(fileName: string, data: Buffer): Promise<void> {
  const safe = path.basename(fileName);
  if (!safe || safe !== fileName) throw new Error("Invalid file name");
  await mkdir(PRIVATE_MEDIA_DIR, { recursive: true });
  await writeFile(path.join(PRIVATE_MEDIA_DIR, safe), data);
}

export async function savePrivateMediaBlob(fileName: string, blob: Blob): Promise<void> {
  const safe = path.basename(fileName);
  if (!safe || safe !== fileName) throw new Error("Invalid file name");
  await mkdir(PRIVATE_MEDIA_DIR, { recursive: true });
  const outPath = path.join(PRIVATE_MEDIA_DIR, safe);
  await pipeline(Readable.fromWeb(blob.stream() as globalThis.ReadableStream), createWriteStream(outPath));
}

export function openMediaReadStream(filePath: string): ReadStream {
  return createReadStream(filePath);
}

export function mimeFromFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".pdf": "application/pdf",
    ".epub": "application/epub+zip",
    ".csv": "text/csv",
    ".txt": "text/plain",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[ext] ?? "application/octet-stream";
}
