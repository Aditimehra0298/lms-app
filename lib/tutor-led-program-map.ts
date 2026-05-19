"use client";

import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpen,
  Brain,
  Calendar,
  Clock,
  Globe,
  GraduationCap,
  Handshake,
  MessageCircle,
  Mic,
  Monitor,
  MonitorPlay,
  Rocket,
  Shield,
  Star,
  TrendingUp,
  UserRound,
  Users,
  Video,
  Zap,
} from "lucide-react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

export const TUTOR_LED_ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BookOpen,
  Brain,
  Calendar,
  Clock,
  Globe,
  GraduationCap,
  Handshake,
  MessageCircle,
  Mic,
  Monitor,
  MonitorPlay,
  Rocket,
  Shield,
  Star,
  TrendingUp,
  UserRound,
  Users,
  Video,
  Zap,
};

export const TUTOR_LED_ICON_NAMES = Object.keys(TUTOR_LED_ICON_MAP).sort();

export function tutorLedIcon(name: string): LucideIcon {
  return TUTOR_LED_ICON_MAP[name] ?? Clock;
}

/** Merged object passed to both TutorLedCourseHero and TutorLedPostHeroSections. */
export function tutorLedLearnerBannerSrc(stored: TutorLedProgramStored): string {
  return stored.learnerHeroSrc?.trim() || stored.heroSrc?.trim() || "/h1.png";
}

export function tutorLedEnrolledPrice(stored: TutorLedProgramStored): number {
  return stored.priceAfterPayment ?? stored.price;
}

export function mapTutorLedProgramToPageCourse(stored: TutorLedProgramStored) {
  return {
    title: stored.title,
    subtitle: stored.subtitle,
    breadcrumb: stored.breadcrumb,
    badge: stored.badge,
    price: stored.price,
    originalPrice: stored.originalPrice,
    priceAfterPayment: stored.priceAfterPayment ?? stored.price,
    learnerHeroSrc: stored.learnerHeroSrc,
    learnerHeroAlt: stored.learnerHeroAlt,
    discount: stored.discount,
    batchLabel: stored.batchLabel,
    seatsFilling: stored.seatsFilling,
    seatsLeft: stored.seatsLeft,
    trainer: { ...stored.trainer },
    nextBatchDate: stored.nextBatchDate,
    schedule: stored.schedule,
    language: stored.language,
    countdown: { ...stored.countdown },
    batchDetails: stored.batchDetails.map((r) => ({
      icon: tutorLedIcon(r.icon),
      label: r.label,
      value: r.value,
    })),
    features: stored.features.map((f) => ({
      icon: tutorLedIcon(f.icon),
      title: f.title,
      desc: f.desc,
    })),
    highlights: [...stored.highlights],
    curriculum: stored.curriculum.map((c) => ({ ...c })),
    whyChoose: stored.whyChoose.map((w) => ({
      icon: tutorLedIcon(w.icon),
      title: w.title,
      desc: w.desc,
    })),
    faqs: stored.faqs.map((f) => ({ ...f })),
  };
}
