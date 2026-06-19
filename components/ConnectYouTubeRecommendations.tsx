"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { CheckCircle2, Loader2, Video } from "lucide-react";
import type { GoogleAccountRecommendationSignals } from "@/lib/google-account-recommendation-signals";
import {
  GOOGLE_GSI_SCRIPT,
  GOOGLE_YOUTUBE_SCOPES,
  getGoogleClientId,
  requestGoogleScopedAccessToken,
  waitForGoogleOAuth2,
} from "@/lib/google-sign-in-client";
import {
  applyGoogleRecommendationSignals,
  readLearningPreferences,
  writeLearningPreferences,
} from "@/lib/learner-learning-preferences";
import { getLearnerEmail } from "@/lib/learner-session-client";
import { readJsonResponse } from "@/lib/safe-json";

type Props = {
  compact?: boolean;
  onConnected?: () => void;
};

export function ConnectYouTubeRecommendations({ compact = false, onConnected }: Props) {
  const clientId = getGoogleClientId();
  const [scriptReady, setScriptReady] = useState(false);
  const [oauthReady, setOauthReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [signals, setSignals] = useState<GoogleAccountRecommendationSignals | null>(null);

  const refresh = useCallback(() => {
    const prefs = readLearningPreferences();
    const yt = prefs.googleSignals?.youtube;
    setConnected(Boolean(yt?.connected));
    setSignals(prefs.googleSignals);
  }, []);

  useEffect(() => {
    refresh();
    const onPrefs = () => refresh();
    window.addEventListener("sft_learning_prefs_updated", onPrefs);
    return () => window.removeEventListener("sft_learning_prefs_updated", onPrefs);
  }, [refresh]);

  useEffect(() => {
    if (!scriptReady) return;
    void waitForGoogleOAuth2().then(setOauthReady);
  }, [scriptReady]);

  const connect = () => {
    if (!clientId) {
      setError("Google is not configured on this server.");
      return;
    }
    if (!oauthReady) {
      setError("Google is still loading. Try again in a moment.");
      return;
    }

    setConnecting(true);
    setError(null);

    const email = getLearnerEmail()?.trim().toLowerCase() ?? "";
    const existing = readLearningPreferences().googleSignals;

    requestGoogleScopedAccessToken(
      GOOGLE_YOUTUBE_SCOPES,
      async (accessToken) => {
        try {
          const res = await fetch("/api/learner/youtube-signals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken,
              email,
              existingSignals: existing ?? undefined,
            }),
          });
          const data = await readJsonResponse(res, {} as {
            ok?: boolean;
            message?: string;
            googleRecommendationSignals?: GoogleAccountRecommendationSignals;
          });

          if (!res.ok || !data.ok || !data.googleRecommendationSignals) {
            setError(data.message ?? "Could not read YouTube activity.");
            return;
          }

          applyGoogleRecommendationSignals(data.googleRecommendationSignals);

          const prefs = readLearningPreferences();
          const mergedInterests = new Set([
            ...prefs.interests,
            ...data.googleRecommendationSignals.suggestedInterests,
          ]);
          if (data.googleRecommendationSignals.youtube?.suggestedInterests.length) {
            writeLearningPreferences({ interests: [...mergedInterests] });
          }

          setConnected(true);
          setSignals(data.googleRecommendationSignals);
          onConnected?.();
        } catch {
          setError("Network error while connecting YouTube.");
        } finally {
          setConnecting(false);
        }
      },
      (message) => {
        setError(message);
        setConnecting(false);
      },
      { prompt: "consent", loginHint: email || undefined },
    );
  };

  const youtube = signals?.youtube;

  return (
    <>
      {clientId ? (
        <Script
          src={GOOGLE_GSI_SCRIPT}
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
        />
      ) : null}

      <section
        className={`rounded-2xl border border-red-500/25 bg-linear-to-br from-red-500/10 via-black/30 to-black/40 ${
          compact ? "p-4" : "p-5 md:p-6"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="inline-flex items-center gap-2 text-base font-bold text-white">
              <Video size={18} className="text-red-400" />
              YouTube activity recommendations
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-gray-400">
              Optionally connect YouTube (read-only) so we can suggest courses from your
              subscriptions and liked videos. We never post or change anything on your account.
            </p>
          </div>
          {connected ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
              <CheckCircle2 size={12} />
              Connected
            </span>
          ) : null}
        </div>

        {connected && youtube ? (
          <div className="mt-3 space-y-2">
            {youtube.activityHints.map((hint) => (
              <p key={hint} className="text-[11px] text-gray-300">
                · {hint}
              </p>
            ))}
            {youtube.channelSamples.length > 0 ? (
              <p className="text-[10px] text-gray-500">
                Channels sampled: {youtube.channelSamples.slice(0, 4).join(", ")}
              </p>
            ) : null}
            <button
              type="button"
              onClick={connect}
              disabled={connecting}
              className="mt-2 text-xs text-amber-200 underline hover:text-amber-100 disabled:opacity-50"
            >
              Refresh YouTube signals
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={connecting || !clientId}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connecting ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
            {connecting ? "Connecting…" : "Connect YouTube for recommendations"}
          </button>
        )}

        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

        {!clientId ? (
          <p className="mt-2 text-[11px] text-gray-500">
            Requires <code className="text-xs">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and YouTube Data
            API v3 enabled in Google Cloud.
          </p>
        ) : null}
      </section>
    </>
  );
}
