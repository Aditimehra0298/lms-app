"use client";

import type { DashboardCalendarReminder } from "@/lib/content-schema";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import type { TutorLedLiveHubRow } from "@/lib/tutor-led-live-hub-enrich";
import { MyLearningCalendarView } from "@/components/MyLearningCalendarView";

type ExamTask = {
  label: string;
  courseTitle: string;
  href: string;
  status: string;
  ready: boolean;
  unlocked?: boolean;
};

type Props = {
  tutorLedEnrollments: TutorLedLiveHubRow[];
  tutorLedPrograms: TutorLedProgramStored[];
  examTasks: ExamTask[];
  certificateAlerts: Array<{ courseTitle: string; status: string; href: string }>;
  coursesNotStarted: Array<{ title: string; href: string }>;
  adminCalendarReminders?: DashboardCalendarReminder[];
  today?: Date;
};

/** Dashboard embed — same calendar UI as /my-learning/calendar without page header. */
export function MyLearningDashboardPlanner(props: Props) {
  return <MyLearningCalendarView {...props} showPageHeader={false} />;
}

export type { DashboardCalendarEvent } from "@/lib/my-learning-dashboard-events";
