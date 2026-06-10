/** Learner-uploaded external badges / certificates (Subscriptions + Achievements). */

export const LEARNER_OTHER_CREDENTIALS_KEY = "sft_subscription_other_credentials";

export const LEARNER_OTHER_CREDENTIALS_EVENT = "sft_other_credentials_updated";

export type LearnerOtherCredential = {
  id: string;
  url: string;
  name: string;
  uploadedAt: string;
};

function newId(): string {
  return `oc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function readLearnerOtherCredentials(): LearnerOtherCredential[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEARNER_OTHER_CREDENTIALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LearnerOtherCredential[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => ({
        id: item.id || `legacy-${index}-${item.uploadedAt ?? index}`,
        url: String(item.url ?? "").trim(),
        name: String(item.name ?? "Credential").trim(),
        uploadedAt: item.uploadedAt ?? new Date().toISOString(),
      }))
      .filter((item) => item.url && item.name);
  } catch {
    return [];
  }
}

function writeLearnerOtherCredentials(items: LearnerOtherCredential[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEARNER_OTHER_CREDENTIALS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(LEARNER_OTHER_CREDENTIALS_EVENT));
}

export function addLearnerOtherCredential(url: string, name: string): LearnerOtherCredential[] {
  const item: LearnerOtherCredential = {
    id: newId(),
    url: url.trim(),
    name: name.trim(),
    uploadedAt: new Date().toISOString(),
  };
  const next = [item, ...readLearnerOtherCredentials()].slice(0, 20);
  writeLearnerOtherCredentials(next);
  return next;
}

export function isPdfCredential(name: string, url: string): boolean {
  return /\.pdf$/i.test(name) || /\.pdf($|\?)/i.test(url);
}
