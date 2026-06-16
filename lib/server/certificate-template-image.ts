import { readFile } from "node:fs/promises";
import path from "node:path";
import { appBaseUrl, toAbsoluteAppUrl } from "@/lib/server/certificate-app-url";
import { createMediaAccessToken } from "@/lib/server/media-access-token";
import {
  resolveMediaFilePath,
  storageFileNameFromUrl,
} from "@/lib/server/private-media-storage";

async function fetchTemplateBytes(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
  } catch {
    /* fall through */
  }
  return null;
}

/** Load certificate template / badge bytes from private media, public/, or remote URL. */
export async function loadCertificateTemplateBytes(
  templateUrl: string,
): Promise<Buffer | null> {
  const trimmed = templateUrl.trim();
  if (!trimmed) return null;

  const fileName = storageFileNameFromUrl(trimmed);
  if (fileName) {
    const filePath = await resolveMediaFilePath(fileName);
    if (filePath) return readFile(filePath);

    const token = createMediaAccessToken({
      f: fileName,
      scope: "workflow",
      ttlSeconds: 60 * 10,
    });
    const servePath = `/api/media/serve/${encodeURIComponent(fileName)}?t=${encodeURIComponent(token)}`;
    const signedUrl = toAbsoluteAppUrl(servePath, appBaseUrl());
    const fetched = await fetchTemplateBytes(signedUrl);
    if (fetched) return fetched;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("/api/")) {
    const publicPath = path.join(process.cwd(), "public", trimmed.replace(/^\//, ""));
    try {
      return await readFile(publicPath);
    } catch {
      /* try next resolver */
    }
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return fetchTemplateBytes(trimmed);
  }

  return null;
}

export function isPngImage(bytes: Buffer): boolean {
  return bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50;
}
