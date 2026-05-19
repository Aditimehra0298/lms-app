/** Cloud recording row synced from Zoom API into a tutor-led program. */
export type ZoomSessionRecording = {
  id: string;
  topic: string;
  playUrl: string;
  downloadUrl?: string;
  recordedAt?: string;
  durationMinutes?: number;
};
