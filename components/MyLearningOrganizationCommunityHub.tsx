"use client";

import { MyLearningCommunityHub } from "@/components/MyLearningCommunityHub";
import type { DashboardCalendarReminder } from "@/lib/content-schema";
import type { CommunityConnectCard } from "@/lib/my-learning-community-defaults";
import type { CertificateRowDto } from "@/lib/certificate-types";
import type { LearnerBadge } from "@/lib/learner-badges";

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
  companyName?: string | null;
  adminDisplayName?: string;
};

/** Team community — same hub as individual with employee ↔ organisation sharing. */
export function MyLearningOrganizationCommunityHub(props: Props) {
  return (
    <MyLearningCommunityHub
      enrolledSlugs={props.enrolledSlugs}
      courseTitles={props.courseTitles}
      focusCourseSlug={props.focusCourseSlug}
      completedCourses={props.completedCourses}
      certificates={props.certificates}
      earnedBadges={props.earnedBadges}
      globalBadgeImage={props.globalBadgeImage}
      calendarReminders={props.calendarReminders}
      communityConnect={props.communityConnect}
      organizationMode
      companyName={props.companyName ?? undefined}
      posterDisplayName={props.adminDisplayName}
    />
  );
}
