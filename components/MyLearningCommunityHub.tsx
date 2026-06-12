"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Building2,
  ChevronRight,
  FileQuestion,
  Headphones,
  HelpCircle,
  Lightbulb,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Shield,
  Star,
  Users,
} from "lucide-react";
import type { DashboardCalendarReminder } from "@/lib/content-schema";
import type { CommunityConnectCard } from "@/lib/my-learning-community-defaults";
import { CommunityAskQuestionPanel } from "@/components/CommunityAskQuestionPanel";
import { CommunityFileUploadZone } from "@/components/CommunityFileUploadZone";
import { CommunitySuccessSubmitForm } from "@/components/CommunitySuccessSubmitForm";
import {
  CommunitySuccessWall,
  type CommunityWallSubmission,
} from "@/components/CommunitySuccessWall";
import type { CertificateRowDto } from "@/lib/certificate-types";
import type { LearnerBadge } from "@/lib/learner-badges";
import { getLearnerDisplayName, qaApiHeaders } from "@/lib/course-qa-client";
import type { CourseQAItem } from "@/lib/course-qa-section";
import { getLearnerEmail, isLearnerLoggedIn } from "@/lib/learner-session-client";
import {
  COMMUNITY_GUIDELINES,
  DEFAULT_COMMUNITY_ANNOUNCEMENTS,
  resolveCommunityConnect,
} from "@/lib/my-learning-community-defaults";
import { SocialBrandIcon, SOCIAL_BRAND_BUTTON_CLASS } from "@/components/SocialBrandIcon";
import type { CommunityConnectIcon } from "@/lib/my-learning-community-defaults";
import { SFT_EMAILS } from "@/lib/contact-site-data";
import { readJsonResponse } from "@/lib/safe-json";
import {
  addOrgCommunityPost,
  formatOrgPostTimeLabel,
  mergeOrgCommunityPosts,
  ORG_COMMUNITY_POSTS_EVENT,
  readOrgCommunityPosts,
  type OrgCommunityAudience,
  type OrgCommunityPost,
} from "@/lib/organization-community-posts";
import { formatOrgEmployeeUserId } from "@/lib/organization-dashboard";

type FeedKind = "review" | "question" | "suggestion" | "discussion";
type OrgFeedScope = "all" | "employee" | "organization";

type FeedItem = {
  id: string;
  kind: FeedKind;
  user: string;
  courseTitle: string;
  courseSlug: string;
  title: string;
  body: string;
  rating?: number;
  timeLabel: string;
  helpful?: number;
  href: string;
  orgAudience?: OrgCommunityAudience;
  authorUserId?: string;
};

type Props = {
  enrolledSlugs: string[];
  courseTitles: Record<string, string>;
  focusCourseSlug?: string | null;
  completedCourses: Array<{
    title: string;
    slug?: string;
    image?: string;
    completed: number;
    modules: number;
  }>;
  certificates: CertificateRowDto[];
  earnedBadges?: LearnerBadge[];
  globalBadgeImage?: string;
  calendarReminders?: DashboardCalendarReminder[];
  communityConnect?: CommunityConnectCard[];
  /** Team hub — employees and organisation share views both ways */
  organizationMode?: boolean;
  companyName?: string;
  posterDisplayName?: string;
};

function kindMeta(kind: FeedKind) {
  switch (kind) {
    case "review":
      return {
        label: "Course Review",
        className: "bg-violet-500/20 text-violet-200",
        Icon: Star,
      };
    case "question":
      return {
        label: "Question",
        className: "bg-amber-500/20 text-amber-200",
        Icon: HelpCircle,
      };
    case "suggestion":
      return {
        label: "Suggestion",
        className: "bg-emerald-500/20 text-emerald-200",
        Icon: Lightbulb,
      };
    default:
      return {
        label: "Discussion",
        className: "bg-sky-500/20 text-sky-200",
        Icon: MessageCircle,
      };
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3 w-3 ${n <= value ? "fill-[#FFC107] text-[#FFC107]" : "text-zinc-600"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

function connectToneClass(tone: CommunityConnectCard["tone"]) {
  switch (tone) {
    case "emerald":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "blue":
      return "border-blue-500/30 bg-blue-500/10";
    case "sky":
      return "border-sky-500/30 bg-sky-500/10";
    case "pink":
      return "border-pink-500/30 bg-pink-500/10";
    default:
      return "border-violet-500/30 bg-violet-500/10";
  }
}

function ConnectPlatformIcon({ icon, size = 22 }: { icon: CommunityConnectIcon; size?: number }) {
  if (icon === "email") {
    return <Mail className="text-white" style={{ width: size, height: size }} aria-hidden />;
  }
  return (
    <SocialBrandIcon
      brand={icon}
      size={size}
      className="text-white"
    />
  );
}

function connectIconBg(icon: CommunityConnectIcon): string {
  if (icon === "email") return "bg-violet-600";
  return SOCIAL_BRAND_BUTTON_CLASS[icon];
}

export function MyLearningCommunityHub({
  enrolledSlugs,
  courseTitles,
  focusCourseSlug,
  completedCourses,
  certificates,
  earnedBadges = [],
  globalBadgeImage,
  calendarReminders = [],
  communityConnect,
  organizationMode = false,
  companyName,
  posterDisplayName,
}: Props) {
  const feedbackRef = useRef<HTMLDivElement>(null);
  const askQuestionRef = useRef<HTMLDivElement>(null);
  const [showAllFeed, setShowAllFeed] = useState(false);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [feedbackBody, setFeedbackBody] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackAttachmentUrl, setFeedbackAttachmentUrl] = useState("");
  const [feedbackAttachmentName, setFeedbackAttachmentName] = useState("");
  const [wallSubmissions, setWallSubmissions] = useState<CommunityWallSubmission[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [orgPosts, setOrgPosts] = useState<OrgCommunityPost[]>([]);
  const [feedScope, setFeedScope] = useState<OrgFeedScope>("all");
  const [shareAudience, setShareAudience] = useState<OrgCommunityAudience>("employee");

  const displayCompany = companyName?.trim() || "Your organisation";

  const slugs = useMemo(
    () => Array.from(new Set(enrolledSlugs.map((s) => s.trim()).filter(Boolean))),
    [enrolledSlugs],
  );

  useEffect(() => {
    if (!selectedCourse && slugs.length) {
      setSelectedCourse(focusCourseSlug && slugs.includes(focusCourseSlug) ? focusCourseSlug : slugs[0]);
    }
  }, [slugs, selectedCourse, focusCourseSlug]);

  const loadFeed = useCallback(async () => {
    if (!slugs.length) {
      setFeed([]);
      setLoadingFeed(false);
      return;
    }
    setLoadingFeed(true);
    const email = getLearnerEmail();
    const headers = qaApiHeaders();
    const merged: FeedItem[] = [];

    await Promise.all(
      slugs.map(async (slug) => {
        const courseTitle = courseTitles[slug] ?? slug;
        try {
          const revQs = email ? `?email=${encodeURIComponent(email)}` : "";
          const [revRes, qaRes] = await Promise.all([
            fetch(`/api/courses/${encodeURIComponent(slug)}/reviews${revQs}`, {
              cache: "no-store",
              headers,
            }),
            fetch(
              `/api/courses/${encodeURIComponent(slug)}/qa${email ? `?email=${encodeURIComponent(email)}` : ""}`,
              { cache: "no-store", headers },
            ),
          ]);
          const revData = await readJsonResponse(revRes, {} as { reviews?: Array<{ id: string; name: string; rating: number; body: string; daysAgo: string; helpful?: number }> });
          const qaData = await readJsonResponse(qaRes, {} as { questions?: CourseQAItem[] });

          for (const r of revData.reviews ?? []) {
            if (!r.body?.trim() && r.rating < 1) continue;
            merged.push({
              id: `rev-${slug}-${r.id}`,
              kind: "review",
              user: r.name,
              courseTitle,
              courseSlug: slug,
              title: courseTitle,
              body: r.body?.trim() || "Shared a rating for this course.",
              rating: r.rating,
              timeLabel: r.daysAgo,
              helpful: r.helpful ?? 0,
              href: `/courses/${encodeURIComponent(slug)}#reviews`,
            });
          }

          for (const q of qaData.questions ?? []) {
            merged.push({
              id: `qa-${slug}-${q.id}`,
              kind: q.answerCount > 0 ? "discussion" : "question",
              user: q.name,
              courseTitle,
              courseSlug: slug,
              title: q.question,
              body:
                q.answerCount > 0
                  ? `${q.answerCount} answer${q.answerCount === 1 ? "" : "s"} in thread`
                  : "Awaiting answers from trainers and peers",
              timeLabel: q.daysAgo,
              href: `/courses/${encodeURIComponent(slug)}#qa`,
            });
          }
        } catch {
          /* skip */
        }
      }),
    );

    merged.sort((a, b) => {
      const score = (k: FeedKind) => (k === "review" ? 2 : 1);
      return score(b.kind) - score(a.kind);
    });

    setFeed(merged);
    setLoadingFeed(false);
  }, [slugs, courseTitles]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const loadWallSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/community/success-submissions", {
        cache: "no-store",
        headers: qaApiHeaders(),
      });
      const data = await readJsonResponse(
        res,
        {} as { ok?: boolean; submissions?: CommunityWallSubmission[] },
      );
      if (data.ok && Array.isArray(data.submissions)) {
        setWallSubmissions(data.submissions);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadWallSubmissions();
  }, [loadWallSubmissions]);

  const refreshOrgPosts = useCallback(() => {
    if (!organizationMode) return;
    setOrgPosts(mergeOrgCommunityPosts(readOrgCommunityPosts(), displayCompany));
  }, [organizationMode, displayCompany]);

  useEffect(() => {
    refreshOrgPosts();
    if (!organizationMode) return;
    window.addEventListener(ORG_COMMUNITY_POSTS_EVENT, refreshOrgPosts);
    return () => window.removeEventListener(ORG_COMMUNITY_POSTS_EVENT, refreshOrgPosts);
  }, [organizationMode, refreshOrgPosts]);

  const orgFeedItems = useMemo((): FeedItem[] => {
    if (!organizationMode) return [];
    return orgPosts.map((p) => ({
      id: `org-${p.id}`,
      kind: p.rating ? "review" : "discussion",
      user: p.authorName,
      courseTitle: p.courseTitle,
      courseSlug: p.courseSlug,
      title: p.title,
      body: p.body,
      rating: p.rating,
      timeLabel: formatOrgPostTimeLabel(p.createdAt),
      href: `/my-learning?tab=community`,
      orgAudience: p.audience,
      authorUserId: p.authorUserId,
    }));
  }, [organizationMode, orgPosts]);

  const mergedFeed = useMemo(() => {
    if (!organizationMode) return feed;
    const apiIds = new Set(feed.map((f) => f.id));
    const extra = orgFeedItems.filter((f) => !apiIds.has(f.id));
    return [...feed, ...extra].sort((a, b) => {
      const score = (item: FeedItem) =>
        (item.orgAudience === "organization" ? 3 : item.orgAudience === "employee" ? 2 : 1) +
        (item.kind === "review" ? 1 : 0);
      return score(b) - score(a);
    });
  }, [organizationMode, feed, orgFeedItems]);

  const scopedFeed = useMemo(() => {
    if (!organizationMode || feedScope === "all") return mergedFeed;
    if (feedScope === "organization") {
      return mergedFeed.filter((f) => f.orgAudience === "organization");
    }
    return mergedFeed.filter((f) => f.orgAudience === "employee" || !f.orgAudience);
  }, [organizationMode, feedScope, mergedFeed]);

  const visibleFeed = focusCourseSlug
    ? scopedFeed.filter((f) => f.courseSlug === focusCourseSlug)
    : scopedFeed;

  const successTestimonials = useMemo(
    () =>
      (organizationMode ? mergedFeed : feed)
        .filter((f) => f.kind === "review" && f.rating && f.rating >= 4 && f.body.trim())
        .map((f) => ({
          id: f.id,
          user: f.user,
          courseTitle: f.courseTitle,
          body: f.body,
          rating: f.rating!,
          courseSlug: f.courseSlug,
        })),
    [feed, mergedFeed, organizationMode],
  );

  const connectCards = useMemo(
    () => resolveCommunityConnect(communityConnect),
    [communityConnect],
  );

  const announcements = useMemo(() => {
    const fromAdmin = calendarReminders
      .filter((r) => r.published !== false && r.title?.trim())
      .slice(0, 4)
      .map((r, i) => ({
        id: r.id,
        title: r.title,
        body: r.body?.trim() || "See your dashboard calendar for details.",
        date: r.date,
        tone: (["violet", "amber", "emerald", "sky"] as const)[i % 4],
      }));
    return fromAdmin.length > 0 ? fromAdmin : [...DEFAULT_COMMUNITY_ANNOUNCEMENTS];
  }, [calendarReminders]);

  const submitFeedback = async () => {
    setFeedbackMessage(null);
    if (!isLearnerLoggedIn()) {
      setFeedbackMessage("Sign in to submit feedback.");
      return;
    }
    if (!selectedCourse) {
      setFeedbackMessage("Select a course.");
      return;
    }
    const rating = feedbackRating > 0 ? feedbackRating : 5;
    const reviewText = feedbackBody.trim();
    if (reviewText.length < 20 && !feedbackAttachmentUrl) {
      setFeedbackMessage("Write at least 20 characters or attach a file.");
      return;
    }
    const reviewWithAttachment = feedbackAttachmentUrl
      ? `${reviewText || "Shared feedback with an attachment."}\n\n📎 Attachment: ${feedbackAttachmentUrl}`
      : reviewText;
    setFeedbackSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(selectedCourse)}/reviews`, {
        method: "POST",
        headers: qaApiHeaders(),
        body: JSON.stringify({ rating, review: reviewWithAttachment }),
      });
      const data = await readJsonResponse(res, {} as { ok?: boolean; message?: string });
      if (!res.ok || !data.ok) {
        setFeedbackMessage(data.message ?? "Could not submit feedback.");
        return;
      }
      setFeedbackBody("");
      setFeedbackRating(0);
      setFeedbackAttachmentUrl("");
      setFeedbackAttachmentName("");
      if (organizationMode) {
        const courseTitle = courseTitles[selectedCourse] ?? selectedCourse;
        addOrgCommunityPost({
          audience: shareAudience,
          authorName:
            shareAudience === "organization"
              ? `${displayCompany} · ${posterDisplayName?.trim() || "Admin"}`
              : posterDisplayName?.trim() || getLearnerDisplayName(),
          authorUserId:
            shareAudience === "employee" ? formatOrgEmployeeUserId("1") : undefined,
          courseTitle,
          courseSlug: selectedCourse,
          title: shareAudience === "organization" ? "Organisation update" : "Team member share",
          body: reviewWithAttachment,
          rating: rating > 0 ? rating : undefined,
        });
        refreshOrgPosts();
      }
      setFeedbackMessage(
        organizationMode
          ? "Shared with the team — employees and organisation can both see this view."
          : "Thank you — your feedback was shared with the community.",
      );
      void loadFeed();
    } catch {
      setFeedbackMessage("Could not reach the server. Try again.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const scrollToAskQuestion = () => {
    askQuestionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!isLearnerLoggedIn()) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-8 text-center">
        <p className="text-sm text-gray-400">
          <Link href="/account?mode=login" className="font-semibold text-[#FFC107] hover:underline">
            Sign in
          </Link>{" "}
          to join the Community Hub.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            {organizationMode ? "Team Community Hub" : "Community Hub"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            {organizationMode
              ? `Employees and ${displayCompany} share views here — post as a team member or as the organisation. Everyone sees each other's updates.`
              : "Share feedback, connect with learners, and stay updated with official community channels."}
          </p>
          {focusCourseSlug ? (
            <p className="mt-2 text-xs text-zinc-500">
              Filtered for{" "}
              <span className="text-[#FFC107]">{courseTitles[focusCourseSlug] ?? focusCourseSlug}</span>
              .{" "}
              <Link href="/my-learning?tab=community" className="text-violet-300 hover:underline">
                View all
              </Link>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => feedbackRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FFC107] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#FFD54F]"
          >
            <Star className="h-4 w-4" aria-hidden />
            Share Your Review
          </button>
          <button
            type="button"
            onClick={scrollToAskQuestion}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-sm font-semibold text-white hover:border-[#FFC107]/40"
          >
            <MessageSquare className="h-4 w-4 text-[#FFC107]" aria-hidden />
            Ask a Question
          </button>
        </div>
      </div>

      <article
        ref={askQuestionRef}
        className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-black/40 to-black p-4"
      >
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-white">
          <MessageSquare className="h-4 w-4 text-violet-300" aria-hidden />
          Ask a Question
        </h2>
        <p className="mt-1 text-[11px] text-zinc-400">
          Select your course, pick a topic, and post — answers appear in discussions below.
        </p>
        <div className="mt-3">
          <CommunityAskQuestionPanel
            slugs={slugs}
            courseTitles={courseTitles}
            focusCourseSlug={focusCourseSlug}
            onSubmitted={() => void loadFeed()}
          />
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Left — reviews & discussions */}
        <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
            <MessageCircle className="h-5 w-5 text-violet-300" aria-hidden />
            {organizationMode ? "Team & Organisation Views" : "Learner Reviews & Discussions"}
          </h2>
          {organizationMode ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "All views", Users],
                  ["employee", "Employees", Users],
                  ["organization", "Organisation", Building2],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFeedScope(id)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    feedScope === id
                      ? "bg-[#FFC107]/20 text-[#FFC107]"
                      : "border border-white/10 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            {loadingFeed ? (
              <p className="text-sm text-zinc-500">Loading community posts…</p>
            ) : visibleFeed.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-zinc-500">
                No posts yet. Share a review or use Ask a Question above.
              </p>
            ) : (
              (showAllFeed ? visibleFeed : visibleFeed.slice(0, 6)).map((item) => {
                const meta = kindMeta(item.kind);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-black/30 p-3 transition hover:border-[#FFC107]/20"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-200">
                        {initials(item.user)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">{item.user}</span>
                          {item.authorUserId ? (
                            <span className="font-mono text-[10px] text-amber-200/80">
                              {item.authorUserId}
                            </span>
                          ) : null}
                          {item.orgAudience ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                item.orgAudience === "organization"
                                  ? "bg-amber-500/20 text-amber-200"
                                  : "bg-sky-500/20 text-sky-200"
                              }`}
                            >
                              {item.orgAudience === "organization" ? (
                                <Building2 className="h-3 w-3" aria-hidden />
                              ) : (
                                <Users className="h-3 w-3" aria-hidden />
                              )}
                              {item.orgAudience === "organization" ? "Organisation" : "Employee"}
                            </span>
                          ) : null}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
                          >
                            <meta.Icon className="h-3 w-3 shrink-0" aria-hidden />
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-[#FFC107]">{item.courseTitle}</p>
                        {item.rating ? (
                          <div className="mt-1">
                            <Stars value={item.rating} />
                          </div>
                        ) : null}
                        <p className="mt-1 text-sm font-medium text-zinc-200">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{item.body}</p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500">
                          <span>{item.timeLabel}</span>
                          <Link
                            href={item.href}
                            className="inline-flex items-center gap-1 font-semibold text-[#FFC107] hover:underline"
                          >
                            View thread
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {visibleFeed.length > 6 && !showAllFeed ? (
            <button
              type="button"
              onClick={() => setShowAllFeed(true)}
              className="mt-4 flex w-full items-center justify-center rounded-lg border border-white/10 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5"
            >
              View more discussions
            </button>
          ) : null}
        </article>

        {/* Center column */}
        <div className="space-y-4">
          <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <h2 className="text-lg font-bold text-white">Connect With Us</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {connectCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-xl border p-3 ${connectToneClass(card.tone)}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg ${connectIconBg(card.icon)}`}
                      aria-hidden
                    >
                      <ConnectPlatformIcon icon={card.icon} />
                    </span>
                    <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{card.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-zinc-400">{card.description}</p>
                  {card.id === "email" ? (
                    <div className="mt-2 flex gap-1.5">
                      <input
                        type="email"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-zinc-600"
                      />
                      <a
                        href={`mailto:${SFT_EMAILS.info}?subject=Community%20email%20updates${newsletterEmail ? `&body=${encodeURIComponent(`Please add me to updates: ${newsletterEmail}`)}` : ""}`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-bold text-white"
                      >
                        <Mail className="h-3 w-3" aria-hidden />
                        {card.cta}
                      </a>
                    </div>
                  ) : (
                    <a
                      href={card.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/10 hover:ring-[#FFC107]/40"
                    >
                      <ConnectPlatformIcon icon={card.icon} size={14} />
                      {card.cta}
                    </a>
                  )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <h2 className="text-lg font-bold text-white">Course Proof &amp; Success Wall</h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {organizationMode
                ? "Team certificates, badges, and wins — share proof with the organisation"
                : "Your certificates, course badges, and completed programs"}
            </p>
            <CommunitySuccessWall
              certificates={certificates}
              earnedBadges={earnedBadges}
              completedCourses={completedCourses}
              testimonials={successTestimonials}
              submissions={wallSubmissions}
              globalBadgeImage={globalBadgeImage}
            />
          </article>

          <CommunitySuccessSubmitForm
            slugs={slugs}
            courseTitles={courseTitles}
            onSubmitted={() => void loadWallSubmissions()}
          />

          <article
            ref={feedbackRef}
            className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-black/40 to-black p-4"
          >
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-white">
              <MessageSquare className="h-5 w-5 text-violet-300" aria-hidden />
              {organizationMode ? "Share a team or organisation view" : "Feedback & Suggestions"}
            </h2>
            {organizationMode ? (
              <p className="mt-1 text-[11px] text-zinc-400">
                Post as an employee (team view) or as the organisation — both sides see shared posts.
              </p>
            ) : null}
            {slugs.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                {organizationMode
                  ? "Assign a team course to start sharing views."
                  : "Enroll in a course to leave feedback."}
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {organizationMode ? (
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Share as
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {(
                        [
                          ["employee", "Employee view", Users],
                          ["organization", "Organisation view", Building2],
                        ] as const
                      ).map(([id, label, Icon]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setShareAudience(id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                            shareAudience === id
                              ? "bg-violet-600 text-white"
                              : "border border-white/15 text-zinc-300 hover:border-violet-400/40"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <label className="block">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    Select course
                  </span>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Choose a course</option>
                    {slugs.map((slug) => (
                      <option key={slug} value={slug}>
                        {courseTitles[slug] ?? slug}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                  <label className="block">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      Your feedback
                    </span>
                    <textarea
                      value={feedbackBody}
                      onChange={(e) => setFeedbackBody(e.target.value)}
                      rows={5}
                      placeholder="Share your feedback, suggestions, or ideas to help us improve…"
                      className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
                    />
                    <div className="mt-2 flex items-center gap-1" role="group" aria-label="Optional rating">
                      <span className="text-[10px] text-zinc-500">Rating:</span>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFeedbackRating(n)}
                          className="rounded p-0.5"
                          aria-label={`${n} stars`}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              n <= feedbackRating ? "fill-[#FFC107] text-[#FFC107]" : "text-zinc-600"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </label>

                  <CommunityFileUploadZone
                    label="Attach screenshot / file (optional)"
                    courseSlug={selectedCourse || undefined}
                    fileUrl={feedbackAttachmentUrl}
                    fileName={feedbackAttachmentName}
                    onUploaded={(url, name) => {
                      setFeedbackAttachmentUrl(url);
                      setFeedbackAttachmentName(name);
                    }}
                    onClear={() => {
                      setFeedbackAttachmentUrl("");
                      setFeedbackAttachmentName("");
                    }}
                    disabled={feedbackSubmitting}
                  />
                </div>

                {feedbackMessage ? (
                  <p className="text-xs text-violet-200">{feedbackMessage}</p>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void submitFeedback()}
                    disabled={feedbackSubmitting}
                    className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-60"
                  >
                    {feedbackSubmitting ? "Submitting…" : "Submit Feedback"}
                  </button>
                </div>
              </div>
            )}
          </article>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <h2 className="inline-flex items-center gap-2 text-base font-bold text-white">
            <Shield className="h-4 w-4 text-sky-300" aria-hidden />
            Community Guidelines
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
            {COMMUNITY_GUIDELINES.map((rule) => (
              <li key={rule} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#FFC107]" aria-hidden />
                {rule}
              </li>
            ))}
          </ul>
          <Link href="/faq" className="mt-3 inline-flex text-xs font-semibold text-[#FFC107] hover:underline">
            View full guidelines
          </Link>
        </article>

        <article className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-black p-4">
          <h2 className="inline-flex items-center gap-2 text-base font-bold text-white">
            <HelpCircle className="h-4 w-4 text-violet-300" aria-hidden />
            Need help?
          </h2>
          <div className="mt-3 space-y-2">
            {[
              { href: "/contact", label: "Contact support", desc: "Email our team", icon: Mail },
              { href: "/faq", label: "Community FAQ", desc: "Common questions", icon: FileQuestion },
              { href: "/contact", label: "Report issue", desc: "Flag a problem", icon: Headphones },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-2.5 transition hover:border-violet-400/35"
              >
                <item.icon className="h-4 w-4 shrink-0 text-violet-300" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-white">{item.label}</span>
                  <span className="block text-[10px] text-zinc-500">{item.desc}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-zinc-500" aria-hidden />
              </Link>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-base font-bold text-white">
            <Bell className="h-4 w-4 text-[#FFC107]" aria-hidden />
            Announcements
          </h2>
          <Link href="/my-learning?tab=calendar" className="text-[10px] font-semibold text-[#FFC107] hover:underline">
            View all on calendar
          </Link>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {announcements.map((a) => (
            <li key={a.id} className="flex gap-2.5 rounded-lg border border-white/10 bg-black/30 p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFC107]/15 text-[#FFC107]">
                <Megaphone className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <p className="text-sm font-semibold text-white">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-400">{a.body}</p>
                <p className="mt-1 text-[10px] text-zinc-500">{a.date}</p>
              </span>
            </li>
          ))}
        </ul>
      </article>

      <p className="text-center text-[10px] text-zinc-600">
        Signed in as {getLearnerDisplayName()}. Posts may be reviewed before they appear for everyone.
      </p>
    </div>
  );
}
