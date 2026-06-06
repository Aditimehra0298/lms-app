"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import {
  SocialBrandIcon,
  SOCIAL_BRAND_BUTTON_CLASS,
  SOCIAL_BRAND_LABEL,
  type SocialBrand,
} from "@/components/SocialBrandIcon";
import {
  buildCredentialShareLinks,
  copyCredentialShare,
  type SharePlatform,
} from "@/lib/share-credentials";

type Props = {
  url: string;
  title: string;
  text?: string;
  /** Badge image — copied with link (rich clipboard + social link preview). */
  badgeImageUrl?: string;
  compact?: boolean;
};

const SOCIAL_PLATFORMS: Array<{
  id: Exclude<SharePlatform, "copy">;
  brand: SocialBrand;
}> = [
  { id: "linkedin", brand: "linkedin" },
  { id: "twitter", brand: "twitter" },
  { id: "facebook", brand: "facebook" },
  { id: "whatsapp", brand: "whatsapp" },
];

export function ShareCredentialButtons({
  url,
  title,
  text,
  badgeImageUrl,
  compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const links = buildCredentialShareLinks({ url, title, text });
  const shareText = text ?? title;

  const copyLink = () => {
    void copyCredentialShare({
      url,
      text: shareText,
      badgeImageUrl,
      title,
    }).then((ok) => {
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }
    });
  };

  const open = (platform: SharePlatform) => {
    if (platform === "copy") {
      copyLink();
      return;
    }
    window.open(links[platform], "_blank", "noopener,noreferrer");
  };

  const buttonSize = compact ? "h-9 w-9" : "h-10 w-10";
  const iconSize = compact ? 16 : 18;
  const copyLabel = copied
    ? badgeImageUrl
      ? "Copied with badge!"
      : "Copied!"
    : badgeImageUrl
      ? "Copy link + badge"
      : "Copy link";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex flex-wrap items-center justify-center gap-2 ${compact ? "" : "gap-2.5"}`}>
        {SOCIAL_PLATFORMS.map((platform) => (
          <button
            key={platform.id}
            type="button"
            onClick={() => open(platform.id)}
            className={`inline-flex shrink-0 items-center justify-center rounded-full text-white shadow-md transition ${buttonSize} ${SOCIAL_BRAND_BUTTON_CLASS[platform.brand]}`}
            aria-label={`Share on ${SOCIAL_BRAND_LABEL[platform.brand]}`}
            title={SOCIAL_BRAND_LABEL[platform.brand]}
          >
            <SocialBrandIcon brand={platform.brand} size={iconSize} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => open("copy")}
          className={`inline-flex shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15 text-amber-100 shadow-md transition hover:border-amber-300/60 hover:bg-amber-500/25 ${buttonSize}`}
          aria-label={copyLabel}
          title={copyLabel}
        >
          <Copy size={iconSize} aria-hidden />
        </button>
      </div>
      {!compact ? (
        <p className="text-center text-[10px] text-gray-500">
          {copied ? (
            <span className="text-emerald-300">{copyLabel}</span>
          ) : (
            "Share on any platform or copy the certificate link"
          )}
        </p>
      ) : copied ? (
        <p className="text-center text-[10px] text-emerald-300">{copyLabel}</p>
      ) : null}
    </div>
  );
}
