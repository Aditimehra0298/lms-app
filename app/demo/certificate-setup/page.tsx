"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DEMO = {
  email: "aditimehra0298@gmail.com",
  courseSlug: "cybersecurity",
  courseTitle: "Cyber Security Phishing Awareness Trainings",
  modules: 4,
  duration: "2h 00m",
  certificateId: "cmq0f0p9c0009tdicxf7yidqd",
};

export default function DemoCertificateSetupPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const examScores: Record<string, unknown> = {};
    for (let i = 1; i <= DEMO.modules; i++) {
      examScores[String(i)] = {
        correct: 10,
        total: 10,
        percent: 100,
        passed: true,
        updatedAt: new Date().toISOString(),
      };
    }

    localStorage.setItem("sft_logged_in", "true");
    localStorage.setItem("sft_learner_email", DEMO.email);
    localStorage.setItem(
      "sft_purchased_courses",
      JSON.stringify([
        {
          slug: DEMO.courseSlug,
          title: DEMO.courseTitle,
          modules: DEMO.modules,
          duration: DEMO.duration,
          completed: DEMO.modules,
          status: "Completed",
          action: "View Certificate",
          tone: "emerald",
          deliveryKind: "managed",
          image: "",
        },
      ]),
    );
    localStorage.setItem(
      `sft_completed_modules_${DEMO.courseSlug}`,
      JSON.stringify(Array.from({ length: DEMO.modules }, (_, i) => i + 1)),
    );
    localStorage.setItem(`sft_module_exam_scores_${DEMO.courseSlug}`, JSON.stringify(examScores));
    localStorage.setItem(`sft_cert_requested_${DEMO.courseSlug}`, "1");
    window.dispatchEvent(new Event("sft_auth_updated"));
    window.dispatchEvent(new Event("sft_purchases_updated"));
    setDone(true);
  }, []);

  if (!done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <p className="text-gray-400">Preparing demo learner session…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-emerald-500/30 bg-black/40 p-6">
        <h1 className="text-2xl font-bold">Demo course completed</h1>
        <p className="text-sm text-gray-300">
          <strong className="text-white">{DEMO.courseTitle}</strong> is marked complete for{" "}
          <strong className="text-white">{DEMO.email}</strong>. A certificate with PDF download is ready.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/my-learning?tab=certificates"
            className="rounded-lg bg-amber-500 px-4 py-3 text-center text-sm font-bold text-black hover:bg-amber-400"
          >
            My Certificates (download PDF)
          </Link>
          <Link
            href={`/my-learning/certificates/${DEMO.certificateId}`}
            className="rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-semibold text-amber-100 hover:bg-white/5"
          >
            View certificate in LMS
          </Link>
          <Link
            href={`/my-learning/course/${DEMO.courseSlug}`}
            className="rounded-lg border border-white/15 px-4 py-3 text-center text-sm text-gray-300 hover:bg-white/5"
          >
            Open completed course player
          </Link>
        </div>
      </div>
    </div>
  );
}
