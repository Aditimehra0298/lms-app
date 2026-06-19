import type { SocialBrand } from "@/components/SocialBrandIcon";
import { SFT_EMAILS, SFT_SOCIAL } from "@/lib/contact-site-data";

export type CommunityConnectIcon = SocialBrand | "email";

export type CommunityConnectTone = "emerald" | "blue" | "sky" | "violet" | "pink";

export type CommunityConnectCard = {
  id: string;
  icon: CommunityConnectIcon;
  title: string;
  description: string;
  cta: string;
  href: string;
  tone: CommunityConnectTone;
  published?: boolean;
};

export const COMMUNITY_GUIDELINES = [
  "Be respectful and supportive to fellow learners and trainers.",
  "Share course-related questions, feedback, and learning wins.",
  "No spam, promotions, or unrelated advertising.",
  "Protect privacy — do not share personal contact details publicly.",
  "Report inappropriate content to support.",
] as const;

const COMMUNITY_CONNECT_BASE = [
  {
    id: "whatsapp",
    icon: "whatsapp" as const,
    title: "WhatsApp Group",
    description: "Join live updates, batch reminders, and peer discussions.",
    cta: "Join Group",
    href: SFT_SOCIAL.whatsapp,
    tone: "emerald" as const,
  },
  {
    id: "facebook",
    icon: "facebook" as const,
    title: "Facebook Page",
    description: "Follow workshops, success stories, and community events.",
    cta: "Follow Page",
    href: "https://www.facebook.com/sftrainings",
    tone: "blue" as const,
  },
  {
    id: "linkedin",
    icon: "linkedin" as const,
    title: "LinkedIn Page",
    description: "Connect with professionals and see industry insights.",
    cta: "Follow Page",
    href: SFT_SOCIAL.linkedin,
    tone: "sky" as const,
  },
  {
    id: "instagram",
    icon: "instagram" as const,
    title: "Instagram",
    description: "Photos, reels, and highlights from live batches and events.",
    cta: "Follow",
    href: SFT_SOCIAL.instagram,
    tone: "pink" as const,
  },
  {
    id: "email",
    icon: "email" as const,
    title: "Email Updates",
    description: "Get batch alerts, exam reminders, and newsletters.",
    cta: "Subscribe",
    href: `mailto:${SFT_EMAILS.info}?subject=Community%20email%20updates`,
    tone: "violet" as const,
  },
] as const;

export const COMMUNITY_CONNECT: CommunityConnectCard[] = COMMUNITY_CONNECT_BASE.map((card) => ({
  ...card,
  published: true,
}));

/** Admin overrides with built-in defaults as fallback. */
export function resolveCommunityConnect(adminCards?: CommunityConnectCard[]): CommunityConnectCard[] {
  const live = (adminCards ?? [])
    .filter((c) => c.published !== false && c.title?.trim() && c.href?.trim())
    .map((c) => ({
      ...c,
      id: c.id?.trim() || `connect-${c.icon}`,
      title: c.title.trim(),
      description: c.description?.trim() || "",
      cta: c.cta?.trim() || "Open",
      href: c.href.trim(),
    }));
  return live.length > 0 ? live : COMMUNITY_CONNECT;
}

export const DEFAULT_COMMUNITY_ANNOUNCEMENTS = [
  {
    id: "a1",
    title: "New tutor-led batch starting soon",
    body: "Check the Calendar tab for live session dates on your enrolled programs.",
    date: "Jun 10, 2026",
    tone: "violet" as const,
  },
  {
    id: "a2",
    title: "Certificate downloads",
    body: "Completed a course? Your certificate appears under Certificate Records.",
    date: "Jun 8, 2026",
    tone: "amber" as const,
  },
  {
    id: "a3",
    title: "Community Q&A",
    body: "Ask trainers and peers — helpful answers are highlighted on course pages.",
    date: "Jun 5, 2026",
    tone: "emerald" as const,
  },
] as const;
