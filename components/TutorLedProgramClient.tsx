"use client";

import { useEffect, useState } from "react";
import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { mapTutorLedProgramToPageCourse } from "@/lib/tutor-led-program-map";
import TutorLedCourseHero from "@/components/TutorLedCourseHero";
import TutorLedLearnerDashboard from "@/components/TutorLedLearnerDashboard";
import TutorLedPostHeroSections from "@/components/TutorLedPostHeroSections";

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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const crumbs = program.breadcrumb;
  const heroCourse = {
    title: course.title,
    subtitle: course.subtitle,
    badge: course.badge,
    trainer: {
      name: course.trainer.name,
      role: course.trainer.role,
      experience: course.trainer.experience,
      avatar: program.trainer.avatar,
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

  const breadcrumbs = enrolledLearning
    ? [
        { label: "My Learning", href: "/my-learning?tab=overview" },
        { label: "Tutor Led", href: "/my-learning?tab=live" },
        { label: program.title, href: `/my-learning/course/${program.slug}` },
      ]
    : [
        { label: crumbs[0] ?? "Home", href: "/" },
        { label: crumbs[1] ?? "Live Trainings", href: "/courses" },
        { label: crumbs[2] ?? program.title, href: `/tutor-led/${program.slug}` },
      ];

  if (enrolledLearning) {
    return <TutorLedLearnerDashboard program={program} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <TutorLedCourseHero
        breadcrumbs={breadcrumbs}
        course={heroCourse}
        countdown={cd}
        heroSrc={program.heroSrc ?? "/h1.png"}
        heroAlt={program.heroAlt ?? "Live tutor-led training"}
        primaryCta={{ kind: "register", slug: program.slug, label: "Reserve Your Seat" }}
      />

      <TutorLedPostHeroSections
        course={{
          trainer: { ...course.trainer, avatar: program.trainer.avatar },
          highlights: course.highlights,
          curriculum: course.curriculum,
          whyChoose: course.whyChoose,
          faqs: course.faqs,
          features: course.features,
        }}
        openFaq={openFaq}
        setOpenFaq={setOpenFaq}
        tutorLedCheckoutSlug={program.slug}
        tutorLedSchedule={{
          curriculum: program.curriculum,
          curriculumMode: program.curriculumMode,
        }}
        tutorLedCertificate={{
          programTitle: program.title,
          trainerName: program.trainer.name,
        }}
        tutorLedBatch={{
          batchId: "Batch 18",
          startDate: course.nextBatchDate,
          sessionDays: "Tue, Thu, Sat",
          timeIst: "7:00 PM - 9:00 PM",
          duration: "12 Weeks",
          mode: "Online Live",
        }}
      />

      <div className="h-8" />
    </div>
  );
}
