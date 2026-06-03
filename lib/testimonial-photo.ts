import type { HomePageTestimonial } from "@/lib/content-schema";

export function testimonialAvatarUrl(t: Pick<HomePageTestimonial, "name" | "photo">): string {
  const photo = t.photo?.trim();
  if (photo) return photo;
  const seed = t.name.trim().toLowerCase().replace(/\s+/g, "-") || "learner";
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function testimonialPhotoIsExternal(url: string): boolean {
  return url.startsWith("http") || url.startsWith("//");
}
