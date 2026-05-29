const LOCALE = "en-US";

export function formatLiveDateTime(d: Date): { dateLine: string; timeLine: string } {
  return {
    dateLine: d.toLocaleDateString(LOCALE, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    timeLine: d.toLocaleTimeString(LOCALE, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
}

/** Formats seconds as HH:MM:SS (or MM:SS when under one hour). */
export function formatDurationHms(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
