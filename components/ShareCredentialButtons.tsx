"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import {
  buildCredentialShareLinks,
  copyShareText,
  shareNative,
  type SharePlatform,
} from "@/lib/share-credentials";

type Props = {
  url: string;
  title: string;
  text?: string;
  compact?: boolean;
};

export function ShareCredentialButtons({ url, title, text, compact = false }: Props) {
  const [copied, setCopied] = useState(false);
  const links = buildCredentialShareLinks({ url, title, text });

  const open = (platform: SharePlatform) => {
    if (platform === "copy") {
      void copyShareText(`${text ?? title}\n${url}`).then((ok) => {
        if (ok) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }
      });
      return;
    }
    window.open(links[platform], "_blank", "noopener,noreferrer");
  };

  const onShare = async () => {
    const ok = await shareNative({ title, text: text ?? title, url });
    if (!ok) open("copy");
  };

  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:border-amber-300/40 hover:text-amber-100";

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void onShare()} className={btn}>
          <Share2 size={14} /> Share
        </button>
        <button type="button" onClick={() => open("copy")} className={btn}>
          <Copy size={14} /> {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => void onShare()} className={btn}>
        <Share2 size={14} /> Share
      </button>
      <button type="button" onClick={() => open("linkedin")} className={btn}>
        <Share2 size={14} /> LinkedIn
      </button>
      <button type="button" onClick={() => open("twitter")} className={btn}>
        𝕏 Twitter
      </button>
      <button type="button" onClick={() => open("facebook")} className={btn}>
        Facebook
      </button>
      <button type="button" onClick={() => open("whatsapp")} className={btn}>
        WhatsApp
      </button>
      <button type="button" onClick={() => open("copy")} className={btn}>
        <Copy size={14} /> {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
