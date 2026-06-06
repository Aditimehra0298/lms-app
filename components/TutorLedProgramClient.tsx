"use client";

import { useEffect, useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  buildTutorLedBatchRow,
  mapTutorLedProgramToPageCourse,
} from "@/lib/tutor-led-program-map";
import {
  TUTOR_LED_CLASSROOM_IMAGE_SRC,
  TUTOR_LED_HIGHLIGHTS_BADGE_SRC,
} from "@/lib/tutor-led-marketing-assets";
import TutorLedCourseHero from "@/components/TutorLedCourseHero";
import TutorLedLearnerDashboard from "@/components/TutorLedLearnerDashboard";
import TutorLedPostHeroSections from "@/components/TutorLedPostHeroSections";
import CourseLandingVisit from "@/components/CourseLandingVisit";

type Props = { program: TutorLedProgramStored; enrolledLearning?: boolean };

function useCountdown(initial: { days: number; hours: number; mins: number; secs: number }) {
  const [time, setTime] = useState(initial);
  useEffect(() => {
    setTime(initial);
  }, [initial.days, initial.hours, initial.mins, initial.secs]);

  useEffect(() => {
    const t = setInterval(() => {
      setTime((p) => {
        let { days, hours, mins, secs } = p;
        secs--;
        if (secs < 0) {
          secs = 59;
          mins--;
        }
        if (mins < 0) {
          mins = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
          days--;
        }
        if (days < 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
        return { days, hours, mins, secs };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [initial.days, initial.hours, initial.mins, initial.secs]);

  return time;
}

export default function TutorLedProgramClient({ program, enrolledLearning = false }: Props) {
  const course = mapTutorLedProgramToPageCourse(program);
  const cd = useCountdown(program.countdown);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  /** Marketing landing on `/tutor-led/[slug]`; learner dashboard only from My Learning when enrolled. */
  const showLearnerDashboard = enrolledLearning;

  const crumbs = program.breadcrumb;
  const heroCourse = {
    title: course.title,
    subtitle: course.subtitle,
    badge: course.badge,
    trainer: {
      name: course.trainer.name,
      role: course.trainer.role,
      experience: course.trainer.experience,
      avatar: course.trainer.avatar,
    },
    nextBatchDate: course.nextBatchDate,
    schedule: course.schedule,
    language: course.language,
    batchLabel: course.batchLabel,
    seatsFilling: course.seatsFilling,
    price: course.price,
    originalPrice: course.originalPrice,
    discount: course.discount,
    batchDetails: course.batchDetails,
    seatsLeft: course.seatsLeft,
    features: course.features,
  };

  const breadcrumbs = showLearnerDashboard
    ? [
        { label: "My Learning", href: "/my-learning?tab=dashboard" },
        { label: "Tutor Led", href: "/my-learning?tab=live" },
        { label: program.title, href: `/my-learning/course/${program.slug}` },
      ]
    : [
        { label: crumbs[0] ?? "Home", href: "/" },
        { label: crumbs[1] ?? "Live Trainings", href: "/courses" },
        { label: crumbs[2] ?? program.title, href: `/tutor-led/${program.slug}` },
      ];

  if (showLearnerDashboard) {
    return <TutorLedLearnerDashboard program={program} />;
  }

  const heroSrc = program.heroSrc?.trim() || "/h1.png";
  const classroomSrc = TUTOR_LED_CLASSROOM_IMAGE_SRC;
  const highlightsSrc = program.heroSrc?.trim() || TUTOR_LED_HIGHLIGHTS_BADGE_SRC;

  return (
    <div className="tutor-led-marketing min-h-screen bg-black text-white">
      <CourseLandingVisit slug={program.slug} enrollAnchorId="course-enroll" />
      <TutorLedCourseHero
        breadcrumbs={breadcrumbs}
        course={heroCourse}
        countdown={cd}
        heroSrc={heroSrc}
        heroAlt={program.heroAlt ?? "Live tutor-led training"}
        thumbnailSrc={heroSrc}
        primaryCta={{ kind: "register", slug: program.slug, label: "Reserve Your Seat" }}
      />

      <div id="course-details" className="scroll-mt-24">
        <TutorLedPostHeroSections
          variant="tutor-led"
          course={course}
          openFaq={openFaq}
          setOpenFaq={setOpenFaq}
          highlightsImageSrc={highlightsSrc}
          classroomImageSrc={classroomSrc}
          tutorLedCheckoutSlug={program.slug}
          tutorLedCertificate={{
            programTitle: program.title,
            trainerName: program.trainer.name,
          }}
          tutorLedBatch={buildTutorLedBatchRow(program)}
          tutorLedSchedule={program}
          tutorLedCountdown={cd}
          enrolledLearning={false}
        />
      </div>
    </div>
  );
}
