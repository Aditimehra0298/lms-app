"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, User } from "lucide-react";
import { IndividualPlanCard } from "@/components/IndividualPlanCard";
import { OrgPlanCard } from "@/components/OrgPlanCard";
import type { HomePageOrgPlan, HomePagePlan } from "@/lib/content-schema";
import {
  IND_PLAN_CATEGORY_PARAM,
  IND_PLAN_CHECKOUT_PARAM,
  ORG_PLAN_CHECKOUT_PARAM,
  ORG_PLAN_SEATS_PARAM,
  individualPlanLoginHref,
  orgPlanLoginHref,
  startIndividualPlanCheckout,
  startOrgPlanCheckout,
  type OrgPlanCheckoutResult,
} from "@/lib/org-plan-checkout-client";

const RETURN_PATH = "/subscriptions";
const goldGradient = "bg-gradient-to-b from-[#f9b14d] to-[#eb9422]";

type Props = {
  individualPlans: HomePagePlan[];
  orgPlans: HomePageOrgPlan[];
  categories: { slug: string; title: string; courseCount: number }[];
  totalCourses: number;
};

const AUDIENCE_INFO = {
  individual: {
    image: "/lms-blog-selfpaced.png",
    title: "For individual",
    highlight: "learners",
    text: "Pick one category or unlock the whole library for a full year. Learn at your own pace and earn a certificate for every course you complete.",
    points: ["12 months of unlimited access", "New courses added automatically", "Certificates on completion"],
  },
  organisation: {
    image: "/o1.png",
    title: "For teams &",
    highlight: "organisations",
    text: "Give your whole team access to every self-paced course. Choose a seat tier, assign learners from your dashboard, and track progress in one place.",
    points: ["Seat tiers for up to 200 learners, or a custom plan", "Progress tracking dashboard", "50% off on renewal"],
  },
} as const;

export function SubscriptionPlans({ individualPlans, orgPlans, categories, totalCourses }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [audience, setAudience] = useState<"individual" | "organisation">("individual");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [resumedCategory, setResumedCategory] = useState<string | undefined>(undefined);
  const resumed = useRef(false);

  const buyOrgPlan = async (planKey: string, seats?: number) => {
    setMessage(null);
    setBusy(planKey);
    const result = await startOrgPlanCheckout(planKey, seats).catch(
      (err): OrgPlanCheckoutResult => ({ status: "error", message: err instanceof Error ? err.message : "Payment failed." }),
    );
    setBusy(null);
    if (result.status === "login") {
      router.push(orgPlanLoginHref(planKey, seats, RETURN_PATH));
    } else if (result.status === "not-organisation") {
      setMessage({
        ok: false,
        text: "Team plans are for organisation accounts. Sign out and sign in (or register) as an Organisation.",
      });
    } else if (result.status === "paid") {
      setMessage({ ok: true, text: "Payment successful! Opening your organisation dashboard…" });
      router.push("/my-learning?tab=dashboard");
    } else if (result.status === "error") {
      setMessage({ ok: false, text: result.message });
    }
  };

  const buyIndividualPlan = async (planKey: string, categorySlug?: string) => {
    setMessage(null);
    setBusy(planKey);
    const result = await startIndividualPlanCheckout(planKey, categorySlug).catch(
      (err): OrgPlanCheckoutResult => ({ status: "error", message: err instanceof Error ? err.message : "Payment failed." }),
    );
    setBusy(null);
    if (result.status === "login") {
      router.push(individualPlanLoginHref(planKey, categorySlug, RETURN_PATH));
    } else if (result.status === "paid") {
      setMessage({ ok: true, text: "Payment successful! Your courses are unlocked — opening My Learning…" });
      router.push("/my-learning");
    } else if (result.status === "error") {
      setMessage({ ok: false, text: result.message });
    }
  };

  useEffect(() => {
    if (resumed.current) return;
    const indKey = searchParams.get(IND_PLAN_CHECKOUT_PARAM)?.trim();
    const orgKey = searchParams.get(ORG_PLAN_CHECKOUT_PARAM)?.trim();
    if (!indKey && !orgKey) return;
    resumed.current = true;
    const category = searchParams.get(IND_PLAN_CATEGORY_PARAM)?.trim() || undefined;
    const seats = Number(searchParams.get(ORG_PLAN_SEATS_PARAM)) || undefined;
    window.history.replaceState(null, "", `${RETURN_PATH}#pricing`);
    const timer = window.setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
      if (indKey) {
        setAudience("individual");
        setResumedCategory(category);
        void buyIndividualPlan(indKey, category);
      } else if (orgKey) {
        setAudience("organisation");
        void buyOrgPlan(orgKey, seats);
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const info = AUDIENCE_INFO[audience];

  return (
    <section id="pricing" className="scroll-mt-24">
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-white/15 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => setAudience("individual")}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
              audience === "individual" ? `${goldGradient} text-black` : "text-gray-300 hover:text-white"
            }`}
          >
            <User size={15} /> Individual
          </button>
          <button
            type="button"
            onClick={() => setAudience("organisation")}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
              audience === "organisation" ? `${goldGradient} text-black` : "text-gray-300 hover:text-white"
            }`}
          >
            <Building2 size={15} /> Organisation
          </button>
        </div>
      </div>

      <div className="mt-8 grid items-center gap-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 md:grid-cols-[1fr_1.2fr] md:p-6">
        <div className="relative aspect-16/10 overflow-hidden rounded-xl border border-white/10">
          <Image src={info.image} alt={`${info.title} ${info.highlight}`} fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
        </div>
        <div>
          <h2 className="text-2xl font-bold md:text-3xl">
            {info.title} <span className="text-amber-300">{info.highlight}</span>
          </h2>
          <p className="mt-3 text-sm leading-7 text-gray-300">{info.text}</p>
          <ul className="mt-4 space-y-2">
            {info.points.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm text-gray-200">
                <CheckCircle2 size={16} className="shrink-0 text-amber-300" /> {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {audience === "individual" ? (
        <div className="mx-auto mt-8 grid max-w-6xl gap-6 md:grid-cols-2">
          {individualPlans.map((plan) => (
            <IndividualPlanCard
              key={plan.badge}
              plan={plan}
              categories={categories}
              totalCourses={totalCourses}
              goldGradient={goldGradient}
              busy={busy === plan.checkoutKey}
              disabled={busy !== null}
              initialCategory={resumedCategory}
              onBuy={(key, category) => void buyIndividualPlan(key, category)}
            />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-8 grid max-w-6xl gap-6 md:grid-cols-2">
          {orgPlans.map((plan) => (
            <OrgPlanCard
              key={plan.title}
              plan={plan}
              goldGradient={goldGradient}
              busy={busy === plan.checkoutKey?.trim()}
              disabled={busy !== null}
              onBuy={(key, seats) => void buyOrgPlan(key, seats)}
            />
          ))}
        </div>
      )}

      {message ? (
        <p
          className={`mx-auto mt-5 max-w-6xl rounded-lg border px-4 py-3 text-center text-sm ${
            message.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/40 bg-rose-500/10 text-rose-200"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
