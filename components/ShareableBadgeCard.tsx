"use client";

import { useEffect, useState } from "react";
import { Medal, Share2, Sparkles } from "lucide-react";
import { ShareCredentialButtons } from "@/components/ShareCredentialButtons";
import { resolveProtectedMediaUrl } from "@/lib/media-client";
import { copyCredentialShare } from "@/lib/share-credentials";

type Props = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  shareUrl: string;
  shareText: string;
  className?: string;
  courseSlug?: string;
  /** showcase = centered hero pedestal; inline = smaller for admin rows */
  variant?: "showcase" | "inline";
};

export function ShareableBadgeCard({
  title,
  subtitle,
  imageUrl,
  shareUrl,
  shareText,
  className = "",
  courseSlug,
  variant = "showcase",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [displaySrc, setDisplaySrc] = useState("");
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
    const raw = imageUrl?.trim() ?? "";
    if (!raw) {
      setDisplaySrc("");
      return;
    }
    if (raw.startsWith("/api/media/serve/") || raw.startsWith("/storage/private/")) {
      let cancelled = false;
      void resolveProtectedMediaUrl(raw, { courseSlug, scope: "learner" }).then((resolved) => {
        if (!cancelled) setDisplaySrc(resolved || raw);
      });
      return () => {
        cancelled = true;
      };
    }
    setDisplaySrc(raw);
  }, [imageUrl, courseSlug]);

  const handleBadgeClick = async () => {
    const badgeForCopy = displaySrc || imageUrl?.trim() || "";
    const copiedOk = await copyCredentialShare({
      url: shareUrl,
      text: shareText,
      badgeImageUrl: badgeForCopy,
      title,
    });
    if (copiedOk) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  const badgeSize =
    variant === "showcase" ? "h-[7.5rem] w-[7.5rem] sm:h-[8.5rem] sm:w-[8.5rem]" : "h-20 w-20";
  const ringOuter = variant === "showcase" ? "h-[9.5rem] w-[9.5rem] sm:h-[11rem] sm:w-[11rem]" : "h-24 w-24";

  const showImage = Boolean(displaySrc) && !imgFailed;
  const badgeForShare = displaySrc || imageUrl;

  return (
    <div
      className={`flex flex-col items-center text-center ${variant === "showcase" ? "py-2" : ""} ${className}`}
    >
      <button
        type="button"
        onClick={() => void handleBadgeClick()}
        className="group relative flex flex-col items-center focus:outline-none"
        title="Copy certificate link"
        aria-label={`Copy ${title} certificate link`}
      >
        {variant === "showcase" ? (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-[42%] rounded-full opacity-70 blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(245,158,11,0.28) 0%, rgba(139,92,246,0.18) 45%, transparent 72%)",
            }}
            aria-hidden
          />
        ) : null}

        <div className={`relative flex items-center justify-center ${ringOuter}`}>
          {variant === "showcase" ? (
            <>
              <span
                className="pointer-events-none absolute inset-0 rounded-full border border-amber-400/20"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-[6%] rounded-full border border-violet-400/15"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-[12%] animate-pulse rounded-full border border-amber-300/25"
                aria-hidden
              />
            </>
          ) : null}

          <div
            className={`relative block overflow-hidden rounded-full border-2 border-amber-400/50 bg-[#0d1118] shadow-[0_8px_32px_rgba(245,158,11,0.22),0_0_0_4px_rgba(245,158,11,0.06)] transition duration-300 group-hover:scale-[1.04] group-hover:border-amber-300/70 group-hover:shadow-[0_12px_40px_rgba(245,158,11,0.35)] group-focus-visible:ring-2 group-focus-visible:ring-amber-400/60 ${badgeSize}`}
          >
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displaySrc}
                alt={title}
                className="h-full w-full object-contain p-1 transition duration-300 group-hover:scale-105"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-amber-500/15 text-amber-200">
                <Medal size={variant === "showcase" ? 40 : 28} />
              </div>
            )}
          </div>

          <span className="absolute -bottom-0.5 -right-0.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-lg ring-2 ring-[#0d1118] transition group-hover:scale-110">
            <Share2 size={12} aria-hidden />
          </span>
        </div>
      </button>

      {variant === "showcase" ? (
        <div className="relative z-[1] mt-5 max-w-[260px] space-y-1.5 px-2">
          <p className="bg-gradient-to-r from-amber-200 via-white to-violet-200 bg-clip-text text-sm font-bold leading-snug text-transparent sm:text-base">
            {title}
          </p>
          {subtitle ? (
            <p className="inline-flex items-center justify-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-amber-300/80">
              <Sparkles size={10} className="shrink-0" aria-hidden />
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 max-w-[200px] space-y-0.5">
          <p className="text-xs font-semibold text-white">{title}</p>
          {subtitle ? <p className="text-[10px] text-gray-400">{subtitle}</p> : null}
        </div>
      )}

      <p
        className={`mt-3 text-[10px] font-medium tracking-wide ${copied ? "text-emerald-300" : "text-violet-300/90"} ${variant === "showcase" ? "uppercase" : ""}`}
      >
        {copied
          ? "Link copied — badge + certificate (no transcript)"
          : variant === "showcase"
            ? "Tap badge to copy link · or use icons below"
            : "Tap badge to copy · or share below"}
      </p>

      <div className="mt-4 w-full max-w-sm px-1">
        <ShareCredentialButtons
          compact={variant === "inline"}
          url={shareUrl}
          title={title}
          text={shareText}
          badgeImageUrl={badgeForShare}
        />
      </div>
    </div>
  );
}
