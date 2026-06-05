"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { readJsonResponse } from "@/lib/safe-json";

type CourseApiRow = {
  slug: string;
  title?: string;
  duration?: string;
  image?: string;
  curriculum?: unknown[];
};

function moduleCount(course: CourseApiRow): number {
  const n = Array.isArray(course.curriculum) ? course.curriculum.length : 0;
  return Math.max(1, n || 3);
}

export default function DemoDashboardSetupPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  const email = useMemo(() => {
    const raw = searchParams.get("email")?.trim().toLowerCase();
    return raw || "aditimehra0298@gmail.com";
  }, [searchParams]);

  const slugs = useMemo(() => {
    const raw = searchParams.get("slugs")?.trim();
    if (raw) {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [
      "cybersecurity",
      "food-safety-masterclass",
      "cousers-esg-esg-management-development-training-program",
    ];
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/courses", { cache: "no-store" });
        const data = await readJsonResponse(res, {} as { courses?: CourseApiRow[] });
        const catalog = Array.isArray(data.courses) ? data.courses : [];

        const picked = slugs
          .map((slug) => catalog.find((c) => c.slug === slug))
          .filter(Boolean) as CourseApiRow[];

        if (!picked.length) {
          throw new Error("No matching courses found.");
        }

        // Build purchased rows + progress storage.
        const purchasedRows = picked.map((c) => {
          const modules = moduleCount(c);
          return {
            slug: c.slug,
            title: c.title || c.slug,
            modules,
            duration: c.duration || "—",
            completed: modules,
            status: "Completed",
            action: "View Certificate",
            tone: "emerald",
            deliveryKind: "managed",
            image: c.image || "",
          };
        });

        const examScoresByCourse: Record<string, Record<string, unknown>> = {};
        for (const c of picked) {
          const modules = moduleCount(c);
          const examScores: Record<string, unknown> = {};
          for (let i = 1; i <= modules; i++) {
            examScores[String(i)] = {
              correct: 10,
              total: 10,
              percent: 100,
              passed: true,
              updatedAt: new Date().toISOString(),
            };
          }
          examScoresByCourse[c.slug] = examScores;
        }

        if (cancelled) return;

        // Write local session + purchases.
        localStorage.setItem("sft_logged_in", "true");
        localStorage.setItem("sft_learner_email", email);
        localStorage.setItem("sft_purchased_courses", JSON.stringify(purchasedRows));

        for (const row of purchasedRows) {
          const completed = Array.from({ length: row.modules }, (_, i) => i + 1);
          localStorage.setItem(`sft_completed_modules_${row.slug}`, JSON.stringify(completed));
          localStorage.setItem(
            `sft_module_exam_scores_${row.slug}`,
            JSON.stringify(examScoresByCourse[row.slug] || {}),
          );
          localStorage.setItem(`sft_cert_requested_${row.slug}`, "1");
        }

        window.dispatchEvent(new Event("sft_auth_updated"));
        window.dispatchEvent(new Event("sft_purchases_updated"));

        setStatus("done");
        setMessage(`Added ${purchasedRows.length} completed course(s) for ${email}.`);

        // Go to dashboard so the user immediately sees it.
        window.setTimeout(() => {
          location.href = "/my-learning?tab=dashboard";
        }, 400);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Setup failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, slugs]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 text-white">
        <p className="text-gray-400">Setting up completed courses on your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12 text-white">
      <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-white/10 bg-black/40 p-6">
        <h1 className="text-2xl font-bold">
          {status === "done" ? "Dashboard ready" : "Dashboard setup failed"}
        </h1>
        <p className="text-sm text-gray-300">{message}</p>
        <div className="flex flex-col gap-2">
          <Link
            href="/my-learning?tab=dashboard"
            className="rounded-lg bg-amber-500 px-4 py-3 text-center text-sm font-bold text-black hover:bg-amber-400"
          >
            Open My Learning dashboard
          </Link>
          <Link
            href="/my-learning?tab=certificates"
            className="rounded-lg border border-white/15 px-4 py-3 text-center text-sm font-semibold text-amber-100 hover:bg-white/5"
          >
            Certificates
          </Link>
        </div>
        <p className="text-xs text-gray-500">
          Tip: you can pass custom slugs via{" "}
          <code className="rounded bg-white/10 px-1 py-0.5">?slugs=cybersecurity,food-safety-masterclass</code>.
        </p>
      </div>
    </div>
  );
}

