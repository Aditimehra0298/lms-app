export type YoutubeRecommendationPayload = {
  connected: boolean;
  connectedAt: string;
  channelSamples: string[];
  videoSamples: string[];
  topicKeywords: string[];
  suggestedInterests: string[];
  activityHints: string[];
};
