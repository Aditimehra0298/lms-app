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
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    copy: url,
  };
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

export function downloadUrlAsFile(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
