"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
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
  label: string;
  letter: string;
  bg: string;
}> = [
  { id: "linkedin", label: "LinkedIn", letter: "in", bg: "bg-[#0A66C2] hover:bg-[#0958a8]" },
  { id: "twitter", label: "X (Twitter)", letter: "𝕏", bg: "bg-zinc-800 hover:bg-zinc-700" },
  { id: "facebook", label: "Facebook", letter: "f", bg: "bg-[#1877F2] hover:bg-[#166fe0]" },
  { id: "whatsapp", label: "WhatsApp", letter: "wa", bg: "bg-[#25D366] hover:bg-[#20bd5c]" },
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

  const iconSize = compact ? "h-9 w-9 text-[10px]" : "h-10 w-10 text-[11px]";
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
            className={`inline-flex shrink-0 items-center justify-center rounded-full font-black uppercase text-white shadow-md transition ${iconSize} ${platform.bg}`}
            aria-label={`Share on ${platform.label}`}
            title={platform.label}
          >
            {platform.letter}
          </button>
        ))}
        <button
          type="button"
          onClick={() => open("copy")}
          className={`inline-flex shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/15 font-semibold text-amber-100 shadow-md transition hover:border-amber-300/60 hover:bg-amber-500/25 ${iconSize}`}
          aria-label={copyLabel}
          title={copyLabel}
        >
          <Copy size={compact ? 14 : 16} aria-hidden />
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
