import { buildLinkedInShareUrl } from "@/lib/certificate-verify-url";

export type SharePlatform = "linkedin" | "twitter" | "facebook" | "whatsapp" | "copy";

export function buildCredentialShareLinks(input: {
  url: string;
  title: string;
  text?: string;
}): Record<SharePlatform, string> {
  const url = input.url.trim();
  const text = (input.text ?? input.title).trim();
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return {
    linkedin: buildLinkedInShareUrl(url),
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    copy: url,
  };
}

export function toAbsoluteShareUrl(pathOrUrl: string, origin?: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (origin ?? (typeof window !== "undefined" ? window.location.origin : ""))
    .replace(/\/$/, "");
  if (!base) return raw;
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Copy share text + link; when badge URL is set, rich clipboard includes the badge image. */
export async function copyCredentialShare(input: {
  url: string;
  text: string;
  badgeImageUrl?: string;
  title?: string;
}): Promise<boolean> {
  const url = input.url.trim();
  const text = input.text.trim();
  const plain = `${text}\n\n${url}`;

  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }

  const badgeAbs = input.badgeImageUrl?.trim()
    ? toAbsoluteShareUrl(input.badgeImageUrl.trim())
    : "";

  if (badgeAbs && navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
    try {
      const title = escapeHtml(input.title?.trim() || "SF Trainings certificate");
      const html = [
        `<p>${escapeHtml(text)}</p>`,
        `<p><a href="${escapeHtml(url)}"><img src="${escapeHtml(badgeAbs)}" alt="${title}" width="220" height="220" style="border-radius:50%;max-width:220px"/></a></p>`,
        `<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`,
      ].join("");

      const items: Record<string, Blob> = {
        "text/plain": new Blob([plain], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      };

      try {
        const imgRes = await fetch(badgeAbs, { cache: "no-store" });
        if (imgRes.ok) {
          const imgBlob = await imgRes.blob();
          if (imgBlob.size > 0) {
            items[imgBlob.type?.startsWith("image/") ? imgBlob.type : "image/png"] = imgBlob;
          }
        }
      } catch {
        /* HTML + plain still useful */
      }

      await navigator.clipboard.write([new ClipboardItem(items)]);
      return true;
    } catch {
      /* fall through to plain text */
    }
  }

  try {
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    return false;
  }
}

export async function copyShareText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export async function shareNative(input: {
  title: string;
  text: string;
  url: string;
}): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share({
      title: input.title,
      text: input.text,
      url: input.url,
    });
    return true;
  } catch {
    return false;
  }
}

export async function downloadUrlAsFile(url: string, filename: string): Promise<void> {
  try {
    const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const blob = await res.blob();
    if (!blob.size) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename.replace(/[^\w.-]+/g, "_") || "certificate.pdf";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
