import { createMediaAccessToken } from "@/lib/server/media-access-token";
import { storageFileNameFromUrl } from "@/lib/server/private-media-storage";
import { n8nCallbackBaseUrl, toAbsoluteAppUrl } from "@/lib/server/certificate-app-url";

/** Long enough for n8n to download certificate assets in one workflow run. */
const N8N_ASSET_TOKEN_TTL_SECONDS = 60 * 60;

/**
 * Absolute URL n8n can GET — includes signed token for /api/media/serve/... paths.
 */
export function toAbsoluteN8nAssetUrl(pathOrUrl: string, base = n8nCallbackBaseUrl()): string {
  const raw = pathOrUrl.trim();
  if (!raw) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const fileName = storageFileNameFromUrl(raw);
  if (fileName) {
    const token = createMediaAccessToken({
      f: fileName,
      scope: "workflow",
      ttlSeconds: N8N_ASSET_TOKEN_TTL_SECONDS,
    });
    const servePath = `/api/media/serve/${encodeURIComponent(fileName)}`;
    return `${toAbsoluteAppUrl(servePath, base)}?t=${encodeURIComponent(token)}`;
  }

  return toAbsoluteAppUrl(raw, base);
}
