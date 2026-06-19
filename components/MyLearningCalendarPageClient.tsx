"use client";

import { useEffect, useMemo, useState } from "react";
import { isOrganisationLearner, readLearnerProfileFromStorage } from "@/lib/auth-profile";
import { defaultAdminContent, type AdminContent } from "@/lib/content-schema";
import { MyLearningCalendarView } from "@/components/MyLearningCalendarView";
import { enrichTutorLedLiveHubRow, mergeTutorLedPrograms } from "@/lib/tutor-led-live-hub-enrich";
import {
  buildMyLearningAssignments,
  filterLearnerVisibleAssignments,
} from "@/lib/my-learning-assignments";
import { readPurchasedCoursesFromStorage } from "@/lib/learner-course-progress";
import { readJsonResponse } from "@/lib/safe-json";

const toCourseSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function MyLearningCalendarPageClient() {
  const [adminContent, setAdminContent] = useState<AdminContent>(defaultAdminContent);
  const [purchased, setPurchased] = useState(readPurchasedCoursesFromStorage());
  const [learnerProfile, setLearnerProfile] = useState(readLearnerProfileFromStorage);

  const isOrgLearner = isOrganisationLearner(learnerProfile);
  const defaultAddedByName = useMemo(() => {
    const name = learnerProfile.name?.trim();
    if (name) return name;
    const email = learnerProfile.email?.trim();
    if (email) return email.split("@")[0] ?? "";
    return "";
  }, [learnerProfile.name, learnerProfile.email]);

  useEffect(() => {
    const syncProfile = () => setLearnerProfile(readLearnerProfileFromStorage());
    syncProfile();
    window.addEventListener("storage", syncProfile);
    window.addEventListener("sft_learner_profile_updated", syncProfile);
    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("sft_learner_profile_updated", syncProfile);
    };
  }, []);

  useEffect(() => {
    const load = () => setPurchased(readPurchasedCoursesFromStorage());
    load();
    window.addEventListener("sft_purchased_courses_updated", load);
    return () => window.removeEventListener("sft_purchased_courses_updated", load);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
        if (!res.ok) return;
        const data = await readJsonResponse(res, defaultAdminContent);
        if (!cancelled) setAdminContent({ ...defaultAdminContent, ...data });
      } catch {
        /* defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const programs = useMemo(
    () => mergeTutorLedPrograms(adminContent.tutorLedPrograms),
    [adminContent.tutorLedPrograms],
  );

  const tutorLedEnrollments = useMemo(() => {
    return purchased
      .filter(
        (c) =>
          (c.deliveryKind === "tutor-led" || c.deliveryKind === "workshop") && c.slug?.trim(),
      )
      .map((c) =>
        enrichTutorLedLiveHubRow(c.slug!.trim(), { title: c.title, image: c.image }, programs),
      );
  }, [purchased, programs]);

  const catalog = adminContent.managedCourses ?? [];
  const examTasks = useMemo(() => {
    return filterLearnerVisibleAssignments(
      buildMyLearningAssignments({
        purchased,
        catalog,
        tutorLedHubRows: tutorLedEnrollments,
        tutorLedPrograms: programs,
        titleToSlug: toCourseSlug,
      }),
    ).map((row) => ({
      label: row.assessment,
      courseTitle: row.courseTitle,
      href: row.href,
      status:
        row.status === "passed"
          ? "Completed"
          : row.status === "awaiting-file"
            ? "Awaiting file"
            : "Pending",
      ready: row.ready,
      unlocked: row.unlocked,
    }));
  }, [purchased, catalog, tutorLedEnrollments, programs]);

  const coursesNotStarted = useMemo(
    () =>
      purchased
        .filter((c) => c.status?.toLowerCase().includes("not started"))
        .map((c) => ({
          title: c.title,
          href: c.slug ? `/my-learning/course/${c.slug}` : "/my-learning?tab=learning",
        })),
    [purchased],
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="mx-auto max-w-[1760px] px-3 py-4 md:px-5 md:py-6 xl:px-8">
        <MyLearningCalendarView
          tutorLedEnrollments={tutorLedEnrollments}
          tutorLedPrograms={programs}
          examTasks={examTasks}
          certificateAlerts={[]}
          coursesNotStarted={coursesNotStarted}
          adminCalendarReminders={adminContent.dashboard?.calendarReminders ?? []}
          variant={isOrgLearner ? "organization" : "individual"}
          defaultAddedByName={defaultAddedByName}
        />
      </main>
    </div>
  );
}
