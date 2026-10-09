import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { PRIVATE_MEDIA_DIR, storageFileNameFromUrl } from "@/lib/server/private-media-storage";

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi"]);

const VIDEO_DIRS = [
  PRIVATE_MEDIA_DIR,
  path.join(process.cwd(), "public", "uploads", "admin"),
  path.join(process.cwd(), "data", "uploads", "admin"),
];

export type AdminVideoFile = {
  fileName: string;
  /** Name shown to the admin and used when saving to the computer. */
  downloadName: string;
  originalName: string | null;
  courseSlug: string | null;
  sizeBytes: number;
  uploadedAt: string;
};

export function isVideoFileName(fileName: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function safeDownloadName(originalName: string | null, fileName: string): string {
  const ext = path.extname(fileName);
  const base = (originalName ?? "").replace(/[\\/:*?"<>|\r\n]+/g, "_").trim();
  if (!base) return fileName;
  return path.extname(base) ? base : `${base}${ext}`;
}

export async function listAdminVideoFiles(): Promise<AdminVideoFile[]> {
  const onDisk = new Map<string, { sizeBytes: number; mtime: Date }>();
  for (const dir of VIDEO_DIRS) {
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (onDisk.has(name) || !isVideoFileName(name)) continue;
      try {
        const info = await stat(path.join(dir, name));
        if (info.isFile()) onDisk.set(name, { sizeBytes: info.size, mtime: info.mtime });
      } catch {
        // file removed while listing
      }
    }
  }

  const meta = new Map<string, { originalName: string | null; courseSlug: string | null; createdAt: Date }>();
  try {
    const assets = await prisma.lmsMediaAsset.findMany({
      where: { kind: "video" },
      select: { url: true, originalName: true, courseSlug: true, createdAt: true },
    });
    for (const a of assets) {
      const name = storageFileNameFromUrl(a.url);
      if (name && !meta.has(name)) {
        meta.set(name, { originalName: a.originalName, courseSlug: a.courseSlug, createdAt: a.createdAt });
      }
    }
  } catch {
    // MySQL down: still list files from disk
  }

  const rows: AdminVideoFile[] = [];
  const usedNames = new Set<string>();
  for (const [fileName, disk] of onDisk) {
    const m = meta.get(fileName);
    let downloadName = safeDownloadName(m?.originalName ?? null, fileName);
    if (usedNames.has(downloadName.toLowerCase())) {
      const ext = path.extname(downloadName);
      downloadName = `${downloadName.slice(0, -ext.length || undefined)} (${fileName.slice(0, 8)})${ext}`;
    }
    usedNames.add(downloadName.toLowerCase());
    rows.push({
      fileName,
      downloadName,
      originalName: m?.originalName ?? null,
      courseSlug: m?.courseSlug ?? null,
      sizeBytes: disk.sizeBytes,
      uploadedAt: (m?.createdAt ?? disk.mtime).toISOString(),
    });
  }

  rows.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return rows;
}
