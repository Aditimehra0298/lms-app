import { inferInterestsFromYoutubeText } from "@/lib/youtube-topic-mapping";
import type { YoutubeRecommendationPayload } from "@/lib/youtube-recommendation-types";

export type { YoutubeRecommendationPayload };

type YoutubeListResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      resourceId?: { channelId?: string };
    };
  }>;
  error?: { message?: string; code?: number };
};

function youtubeApiKey(): string | undefined {
  return process.env.GOOGLE_YOUTUBE_API_KEY?.trim() || undefined;
}

async function youtubeGet(path: string, accessToken: string): Promise<YoutubeListResponse> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  const key = youtubeApiKey();
  if (key) url.searchParams.set("key", key);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await res.json()) as YoutubeListResponse;
  if (!res.ok) {
    const msg = data.error?.message ?? `YouTube API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function collectTextFromItems(
  items: YoutubeListResponse["items"],
  mode: "subscription" | "video",
): { lines: string[]; channels: string[]; videos: string[] } {
  const lines: string[] = [];
  const channels: string[] = [];
  const videos: string[] = [];

  for (const item of items ?? []) {
    const sn = item.snippet;
    if (!sn) continue;
    const title = sn.title?.trim();
    const desc = sn.description?.trim();
    const channel = sn.channelTitle?.trim();

    if (mode === "subscription" && title) {
      channels.push(title);
      lines.push(title, desc ?? "");
    }
    if (mode === "video" && title) {
      videos.push(title);
      lines.push(title, desc ?? "", channel ?? "");
      if (channel) channels.push(channel);
    }
  }

  return { lines, channels: [...new Set(channels)], videos };
}

export async function fetchYoutubeRecommendationSignals(
  accessToken: string,
): Promise<YoutubeRecommendationPayload> {
  const token = accessToken.trim();
  if (!token) throw new Error("Missing YouTube access token");

  const [subsRes, likesRes] = await Promise.all([
    youtubeGet("subscriptions?part=snippet&mine=true&maxResults=15&order=relevance", token).catch(
      () => ({ items: [] }),
    ),
    youtubeGet("videos?part=snippet&myRating=like&maxResults=15", token).catch(() => ({ items: [] })),
  ]);

  const subs = collectTextFromItems(subsRes.items, "subscription");
  const likes = collectTextFromItems(likesRes.items, "video");
  const allLines = [...subs.lines, ...likes.lines];
  const corpus = allLines.join("\n");

  const inferred = inferInterestsFromYoutubeText(corpus);
  const channelSamples = [...new Set([...subs.channels, ...likes.channels])].slice(0, 6);
  const videoSamples = likes.videos.slice(0, 5);

  const activityHints: string[] = [];
  if (channelSamples.length) {
    activityHints.push(
      `YouTube subscriptions include ${channelSamples.slice(0, 2).join(", ")}${channelSamples.length > 2 ? "…" : ""}`,
    );
  }
  if (videoSamples.length) {
    activityHints.push(`Recent liked videos suggest ${inferred.interests[0] ?? "training topics you follow"}`);
  }
  if (!activityHints.length) {
    activityHints.push("YouTube connected — add subscriptions or likes for sharper course picks");
  }

  return {
    connected: true,
    connectedAt: new Date().toISOString(),
    channelSamples,
    videoSamples,
    topicKeywords: inferred.keywords,
    suggestedInterests: inferred.interests,
    activityHints: activityHints.slice(0, 3),
  };
}
