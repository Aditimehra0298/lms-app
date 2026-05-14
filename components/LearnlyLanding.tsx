"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultAdminContent, defaultHomePageConfig, type AdminContent, type HomePageConfig, type ManagedCategory, type ManagedCourse } from "@/lib/content-schema";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import {
  Play,
  Star,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Users,
  GraduationCap,
  ShieldCheck,
  Clock,
  Award,
  CheckCircle2,
  Sparkles,
  MonitorPlay,
  CircleHelp,
  Mail,
} from "lucide-react";

const fallbackCategoryLabels = [
  "Food Safety",
  "Cyber Security",
  "ESG",
  "Information Security",
  "Medical Devices",
  "Workplace Compliance",
  "Skill Development Framework",
  "Mechanical Engineering (HVAC & Refrigeration)",
];

const fallbackCategoryCards = [
  {
    title: "Food Safety",
    desc: "Practical HACCP, hygiene, audit readiness, and food handling compliance training.",
    icon: ShieldCheck,
  },
  {
    title: "Cyber Security",
    desc: "Defend digital systems with threat awareness, controls, and incident response skills.",
    icon: MonitorPlay,
  },
  {
    title: "ESG",
    desc: "Build sustainability strategy, reporting capability, and ESG risk management practices.",
    icon: Award,
  },
  {
    title: "Information Security",
    desc: "Master ISO-aligned information security fundamentals, policies, and governance.",
    icon: BookOpen,
  },
  {
    title: "Medical Devices",
    desc: "Quality, regulatory, and lifecycle training for compliant medical device operations.",
    icon: CheckCircle2,
  },
  {
    title: "Workplace Compliance",
    desc: "Child labor laws, workplace conduct, and mandatory compliance essentials.",
    icon: Users,
  },
  {
    title: "Skill Development Framework",
    desc: "Structured pathways to map, build, and validate workforce capabilities.",
    icon: GraduationCap,
  },
  {
    title: "Mechanical Engineering (HVAC & Refrigeration)",
    desc: "Core technical modules on HVAC systems, refrigeration cycles, and maintenance.",
    icon: Clock,
  },
];

type LearningPathId = "self-paced" | "interactive" | "live";

const learningFormats: {
  id: LearningPathId;
  title: string;
  icon: typeof BookOpen;
  desc: string;
  keyPoints: string[];
  cta: string;
  imageSrc: string;
}[] = [
  {
    id: "self-paced",
    title: "Self-Paced / E-Learning",
    icon: BookOpen,
    desc: "Learn anytime, anywhere with flexible online courses designed for independent learning and skill development at your own pace.",
    keyPoints: [
      "24/7 access to videos, modules & learning resources",
      "Open courses anytime and continue from where you left off",
      "Watch lessons, read study materials & complete activities",
      "Module-wise quizzes and final assessments",
      "Progress tracking across all learning modules",
      "Downloadable resources and completion certificates",
    ],
    cta: "Browse self-paced catalog",
    imageSrc: "/c1.png",
  },
  {
    id: "interactive",
    title: "Tutor Led Trainings",
    icon: MonitorPlay,
    desc: "Interactive expert-led sessions designed to deliver real-world learning through live classes, guided instruction, and practical discussions.",
    keyPoints: [
      "Live Zoom training sessions with industry experts",
      "Real-time doubt solving & interactive Q&A",
      "Structured learning pathway with guided modules",
      "Session recordings, study materials & assignments",
      "Practical workshops, case studies & assessments",
      "Certification upon successful completion",
    ],
    cta: "Choose interactive track",
    imageSrc: "/c2.png",
  },
  {
    id: "live",
    title: "LIVE Workshops",
    icon: Users,
    desc: "Participate in immersive expert-led workshops designed to provide practical industry experience through live Zoom sessions, interactive discussions, and hands-on learning.",
    keyPoints: [
      "Live instructor-led Zoom workshops",
      "Real-world case studies & practical demonstrations",
      "Interactive Q&A and doubt-solving sessions",
      "Hands-on activities and guided exercises",
      "Workshop recordings & downloadable resources",
      "Industry-focused learning with expert mentorship",
    ],
    cta: "View tutor-led sessions",
    imageSrc: "/c3.png",
  },
];

const careerHighlights = [
  {
    title: "Advance Your Professional Capabilities",
    desc: "Enhance your expertise with industry-relevant training programs by Sustainable Futures Trainings, designed to build practical skills across quality, compliance, cybersecurity, and sustainability domains.",
  },
  {
    title: "Expand Your Skillset",
    desc: "Access a comprehensive portfolio of structured courses and learning modules from Sustainable Futures Trainings, tailored for individuals and organizations aiming to achieve measurable growth and performance excellence.",
  },
  {
    title: "Achieve Recognized Certifications",
    desc: "Earn globally aligned certifications through Sustainable Futures Trainings, strengthening your professional credibility and advancing your career opportunities.",
  },
  {
    title: "Learn from Industry Experts",
    desc: "Gain insights from experienced professionals at Sustainable Futures Trainings through expert-led sessions, real-world case studies, and guided learning designed for impactful outcomes.",
  },
];

const individualPlans = [
  {
    badge: "Most Popular · Sustainable Futures Plus Monthly",
    tagline: "Complete multiple courses and earn credentials in the short term",
    desc: "Access a large catalog of professional learning programs, certifications, and job-ready training paths designed for rapid upskilling.",
    price: "₹2,099 / month",
    note: "Cancel anytime",
    features: [
      "Access 10,000+ courses and Specializations from 170+ leading companies and universities",
      "Earn unlimited certificates after your trial ends",
      "Learn job-relevant skills and tools with 1,000+ applied projects and hands-on labs",
      "Choose from 15+ Professional Certificate programs from leading industry partners",
    ],
    cta: "Get Started",
  },
  {
    badge: "Sustainable Futures Plus Annual",
    tagline: "Combine flexibility and savings with long-term learning goals",
    desc: "Everything included in the monthly plan, with annual savings for learners focused on consistent, long-term career growth.",
    price: "₹13,999 / year",
    note: "14-day money-back guarantee",
    features: [
      "Everything included in the monthly plan",
      "Save more when you pay up front for the year",
      "Enjoy maximum flexibility to achieve work/life balance",
      "Learn at your own pace with continuous access to programs",
    ],
    cta: "Get Started",
  },
];

const organisationPlan = {
  title: "Sustainable Futures for Teams",
  tagline: "Accelerate team performance",
  desc: "Help employees master new skills and reach their goals with access to world-class learning programs built for modern teams.",
  price: "₹24,019.74 / year",
  note: "Per user for 12 months · 14-day money-back guarantee",
  features: [
    "Upskill up to 125 employees",
    "Unlimited access to 8,500 learning opportunities",
    "Program setup and launch tools",
    "Analytics and benchmarking dashboard",
  ],
  cta: "Get Started for Teams",
};

const whyFeatures = [
  {
    title: "Expert Trainers",
    desc: "Learn from industry leaders with real-world experience across sectors.",
    icon: Users,
  },
  {
    title: "Quality Training Material",
    desc: "High-quality, up-to-date content designed for measurable outcomes.",
    icon: BookOpen,
  },
  {
    title: "Flexible Learning",
    desc: "Study at your own pace with schedules that fit working professionals.",
    icon: Clock,
  },
  {
    title: "Certification Upon Completion",
    desc: "Earn recognized certificates that support your career progression.",
    icon: Award,
  },
  {
    title: "Tutor-Led Sessions",
    desc: "Engage in tutor-led workshops, expert-led discussions, and real-time doubt-solving sessions.",
    icon: MonitorPlay,
  },
  {
    title: "Progress Tracking & Assessments",
    desc: "Monitor your learning journey with module-wise assessments, exams, and performance insights.",
    icon: CheckCircle2,
  },
];

const testimonials = [
  {
    quote:
      "The content is practical and easy to follow. I could apply what I learned immediately in daily work.",
    name: "Rohan Verma",
    role: "Security Professional",
    seed: "rohan-verma",
  },
  {
    quote:
      "Tutor-led sessions and assignments helped me build confidence with real scenarios, not just theory.",
    name: "Priya Rao",
    role: "Data Analyst",
    seed: "priya-rao",
  },
  {
    quote:
      "Great mentorship and structured learning path. The certification gave my profile a strong boost.",
    name: "Aman Kumar",
    role: "Cloud Engineer",
    seed: "aman-kumar",
  },
  {
    quote:
      "Clear modules, supportive trainers, and strong outcomes. One of the best learning platforms I used.",
    name: "Neha Sharma",
    role: "Program Coordinator",
    seed: "neha-sharma",
  },
  {
    quote:
      "The trainer-led sessions were highly practical. I improved my process audit skills and could apply them at work immediately.",
    name: "Vikram Singh",
    role: "Quality Specialist",
    seed: "vikram-singh",
  },
  {
    quote:
      "Excellent balance of self-paced modules and live expert guidance. The certifications added real value to my profile.",
    name: "Sneha Iyer",
    role: "Compliance Analyst",
    seed: "sneha-iyer",
  },
];

const faqs = [
  {
    q: "What is Sustainable Futures Trainings?",
    a: "Sustainable Futures Trainings is a professional learning platform offering industry-focused courses, live workshops, tutor-led training, and certification programs for individuals and organizations.",
  },
  {
    q: "What types of learning programs do you offer?",
    a: "We provide self-paced courses, tutor-led live training, interactive workshops, corporate training, and certification-focused learning programs.",
  },
  {
    q: "Are the courses completely online?",
    a: "Yes, all courses, tutor-led sessions, workshops, and assessments are accessible online through our learning platform.",
  },
  {
    q: "Can I learn at my own pace?",
    a: "Yes, our self-paced learning programs allow you to study anytime with flexible schedules and 24/7 access to learning materials.",
  },
  {
    q: "Do you offer live instructor-led training?",
    a: "Yes, we conduct live Zoom sessions, expert workshops, mentorship programs, and interactive Q&A sessions with trainers.",
  },
  {
    q: "Will I receive a certificate after course completion?",
    a: "Yes, certificates are issued upon successful completion of course modules, assessments, and program requirements.",
  },
  {
    q: "Are the certifications industry-recognized?",
    a: "Our training programs are aligned with industry standards and supported by professional learning and accreditation frameworks.",
  },
  {
    q: "Can I access session recordings later?",
    a: "Yes, recordings of live classes and workshops are available for enrolled learners after sessions are completed.",
  },
  {
    q: "What industries do your courses cover?",
    a: "We offer programs in Cyber Security, ESG, ISO Standards, Food Safety, Auditing, Compliance, Management Systems, and more.",
  },
  {
    q: "How do I enroll in a course?",
    a: "Simply select your course, complete the registration process, and access your learning dashboard instantly.",
  },
  {
    q: "Do you provide study materials and resources?",
    a: "Yes, courses include videos, presentations, PDFs, notes, assessments, and downloadable learning resources.",
  },
  {
    q: "Are there assessments and exams in the courses?",
    a: "Yes, module-based quizzes, assignments, and final assessments are included to track learning progress and understanding.",
  },
  {
    q: "Can organizations train their employees through Sustainable Futures Trainings?",
    a: "Yes, we provide corporate learning solutions, workforce upskilling programs, and centralized team management features.",
  },
  {
    q: "Is there a dashboard to track learning progress?",
    a: "Yes, learners can monitor enrolled courses, completed modules, assessments, certificates, and upcoming tutor-led sessions.",
  },
  {
    q: "Can trainers interact with learners during tutor-led sessions?",
    a: "Yes, learners can engage with trainers through live discussions, doubt-solving sessions, and interactive workshops.",
  },
  {
    q: "Do you provide mentorship support?",
    a: "Selected programs include expert mentorship, career guidance, and live support sessions.",
  },
  {
    q: "Are the courses suitable for beginners?",
    a: "Yes, we offer beginner-friendly as well as advanced professional training programs.",
  },
  {
    q: "Can I access the platform on mobile devices?",
    a: "Yes, the LMS is designed to work across desktops, tablets, and mobile devices.",
  },
  {
    q: "What payment methods are available?",
    a: "We support secure online payments through multiple payment gateways for easy enrollment.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes, refund eligibility depends on the selected plan and program terms.",
  },
  {
    q: "Can I upgrade my learning plan later?",
    a: "Yes, learners can upgrade their subscriptions or enroll in advanced programs anytime.",
  },
  {
    q: "Do you offer practical or hands-on training?",
    a: "Yes, many programs include real-world case studies, practical exercises, workshops, and applied learning activities.",
  },
  {
    q: "How will I know about upcoming workshops or events?",
    a: "Your dashboard and email notifications will keep you updated about upcoming tutor-led sessions, workshops, and announcements.",
  },
  {
    q: "Can I join from outside India?",
    a: "Yes, Sustainable Futures Trainings supports learners globally through online learning and virtual training sessions.",
  },
  {
    q: "How do I contact support?",
    a: "You can reach our support team through email, WhatsApp, or the Contact Us page for assistance and inquiries.",
  },
];

const accreditationLogos = ["/e1.png", "/e2.png", "/e3.png", "/e4.png"];
const exploreProgramImages = [
  "/p1.png",
  "/p2.png",
  "/p3.png",
  "/p4.jpg",
  "/p5.png",
  "/p6.png",
  "/p7.png",
  "/p8.png",
];
const heroHighlights = [
  "95% Learner Satisfaction Rate",
  "Industry-Aligned Certification Programs",
  "Live Instructor-Led Training Sessions",
  "Practical Hands-On Learning Experience",
  "Recognized Accreditation & Training Partners",
];

const knownCourseImages = new Set([
  "/course-food-safety.png",
  "/c1.png",
  "/c2.png",
  "/c3.png",
  "/p1.png",
  "/p2.png",
  "/p3.png",
  "/p4.jpg",
  "/p5.png",
  "/p6.png",
  "/p7.png",
  "/p8.png",
]);

/** Published defaults so the home catalog renders immediately; `/api/courses` replaces when ready. */
function fallbackPublishedCatalog(): ManagedCourse[] {
  return (defaultAdminContent.managedCourses ?? []).filter((c) => c.published !== false);
}

const CATEGORY_ICON_FALLBACK = [
  ShieldCheck,
  MonitorPlay,
  Award,
  BookOpen,
  CheckCircle2,
  Users,
  GraduationCap,
  Clock,
] as const;

function iconForCategoryTitle(title: string) {
  const hit = fallbackCategoryCards.find((c) => c.title === title);
  if (hit) return hit.icon;
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h + title.charCodeAt(i)) % CATEGORY_ICON_FALLBACK.length;
  return CATEGORY_ICON_FALLBACK[h];
}

function resolveCourseCardImage(image: string | undefined) {
  if (image && knownCourseImages.has(image)) return image;
  return "/c1.png";
}

export default function LearnlyLanding() {
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  /** Default to self-paced so the course grid loads without an extra click (still switchable). */
  const [learningPath, setLearningPath] = useState<LearningPathId | null>("self-paced");
  const [catalogCourses, setCatalogCourses] = useState<ManagedCourse[]>(() => fallbackPublishedCatalog());
  const [planAudience, setPlanAudience] = useState<"individual" | "organisation">("individual");
  const [openFaq, setOpenFaq] = useState<string | null>(faqs[0]?.q ?? null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [liveCategories, setLiveCategories] = useState<ManagedCategory[] | null>(null);
  const [homeConfig, setHomeConfig] = useState<HomePageConfig>(defaultHomePageConfig);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const browseAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncTheme = () => {
      setIsLightTheme(document.documentElement.dataset.theme === "light");
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/content", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as AdminContent;
        if (!cancelled && data.homePage) setHomeConfig({ ...defaultHomePageConfig, ...data.homePage });
      } catch { /* use defaults */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) throw new Error("categories");
        const data = (await res.json()) as { categories?: ManagedCategory[] };
        if (!cancelled) setLiveCategories(data.categories ?? []);
      } catch {
        if (!cancelled) setLiveCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20_000);
    (async () => {
      try {
        const res = await fetch("/api/courses", { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("courses");
        const data = (await res.json()) as { courses?: ManagedCourse[] };
        if (!cancelled) setCatalogCourses(Array.isArray(data.courses) ? data.courses : []);
      } catch {
        if (!cancelled) setCatalogCourses(fallbackPublishedCatalog());
      } finally {
        window.clearTimeout(timeoutId);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (liveCategories === null || activeCategory === "All") return;
    const titles = liveCategories.map((c) => c.title);
    if (!titles.includes(activeCategory)) setActiveCategory("All");
  }, [liveCategories, activeCategory]);

  useEffect(() => {
    const el = heroVideoRef.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    const play = () => {
      void el.play().catch(() => {});
    };
    play();
    el.addEventListener("loadeddata", play);
    return () => el.removeEventListener("loadeddata", play);
  }, []);

  const goldGradient = "bg-gradient-to-b from-[#f9b14d] to-[#eb9422]";
  const goldText = isLightTheme ? "text-[#8a6412]" : "text-[#fde68a]";
  const brandDark = "bg-[#0a0a0a]";

  const liveTestimonials = homeConfig.testimonials.length > 0
    ? homeConfig.testimonials.map((t, i) => ({ quote: t.quote, name: t.name, role: t.role, seed: t.name.toLowerCase().replace(/\s+/g, "-") }))
    : testimonials;
  const liveFaqs = homeConfig.faqs.length > 0 ? homeConfig.faqs : faqs;
  const liveIndividualPlans = homeConfig.individualPlans.length > 0 ? homeConfig.individualPlans : individualPlans;
  const liveOrgPlan = homeConfig.orgPlan ?? organisationPlan;
  const liveExploreProgramImages = homeConfig.exploreProgramImages.length > 0 ? homeConfig.exploreProgramImages : exploreProgramImages;

  const useLiveCatalog = liveCategories !== null && liveCategories.length > 0;
  const catalogForPills = useLiveCatalog
    ? liveCategories.filter((c) => c.isActive)
    : fallbackCategoryLabels.map((title) => {
        const card = fallbackCategoryCards.find((c) => c.title === title);
        return {
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          title,
          subtitle: "",
          description: card?.desc ?? "",
          isActive: true,
          isFeatured: false,
          isUppercase: false,
          isBold: false,
          tone: "violet" as const,
        };
      });

  const filteredCatalog =
    activeCategory === "All"
      ? catalogForPills
      : catalogForPills.filter((c) => c.title === activeCategory);

  const activeCategorySlug = useMemo(() => {
    if (activeCategory === "All") return null;
    const hit = catalogForPills.find((c) => c.title === activeCategory);
    return hit?.slug ?? null;
  }, [activeCategory, catalogForPills]);

  const filteredCoursesForPath = useMemo(() => {
    if (catalogCourses.length === 0) return [];
    if (learningPath !== "self-paced" && learningPath !== "interactive") return [];
    let list = catalogCourses;
    if (learningPath === "self-paced") {
      list = list.filter((c) => !c.learningFormat || c.learningFormat === "self-paced");
    }
    if (learningPath === "interactive") {
      list = list.filter((c) => c.learningFormat !== "live");
    }
    if (!activeCategorySlug) return list;
    return list.filter(
      (c) => canonicalCategorySlug(c.category) === canonicalCategorySlug(activeCategorySlug),
    );
  }, [catalogCourses, activeCategorySlug, learningPath]);

  const displayedCourses = useMemo(
    () => (showAllCourses ? filteredCoursesForPath : filteredCoursesForPath.slice(0, 8)),
    [filteredCoursesForPath, showAllCourses],
  );

  const sectionShell = "mx-auto max-w-[1760px] px-4 md:px-6 xl:px-8";
  const sectionTitle =
    "text-3xl font-extrabold tracking-tight text-white md:text-4xl lg:text-5xl";
  const mutedP = "text-base leading-relaxed text-slate-400 md:text-lg";

  return (
    <div
      className={`learnly-home min-h-screen ${
        isLightTheme
          ? "bg-[radial-gradient(circle_at_12%_8%,rgba(212,160,23,.22),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(139,92,246,.16),transparent_34%),linear-gradient(180deg,#f8f4ec_0%,#f3ede3_100%)] text-slate-800"
          : `${brandDark} bg-[radial-gradient(circle_at_20%_10%,rgba(90,52,170,.22),transparent_30%),radial-gradient(circle_at_90%_0%,rgba(35,95,210,.16),transparent_32%),#05070f] text-white`
      } font-sans selection:bg-amber-500 selection:text-black`}
    >
      <div className="pointer-events-none fixed top-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-amber-500/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-amber-600/5 blur-[100px]" />
      {isLightTheme ? (
        <>
          <div className="pointer-events-none fixed left-[10%] top-[18%] h-48 w-48 rounded-full bg-amber-300/25 blur-3xl" />
          <div className="pointer-events-none fixed right-[8%] top-[30%] h-56 w-56 rounded-full bg-violet-300/20 blur-3xl" />
        </>
      ) : null}

      <main className="relative z-10">
        <div className="mx-auto flex max-w-[1760px] flex-col items-center gap-12 px-4 pb-20 pt-6 md:px-6 md:pt-8 lg:flex-row lg:items-start lg:gap-6 lg:pt-10 xl:gap-8 xl:px-8">
          <div className="w-full space-y-8 pt-2 text-center lg:max-w-none lg:shrink-0 lg:basis-[48%] lg:text-left xl:basis-[47%]">
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-6xl">
              {homeConfig.hero.heading}
              <br />
              <span className={goldText}>{homeConfig.hero.headingHighlight}</span>
            </h1>

            <p className={`mx-auto max-w-lg ${mutedP} lg:mx-0`}>
              {homeConfig.hero.subtitle}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/courses"
                className={`flex items-center gap-2 rounded-xl px-6 py-3.5 font-bold text-black shadow-[0_8px_24px_rgba(249,177,77,.35)] transition-all hover:-translate-y-0.5 hover:brightness-110 ${goldGradient}`}
              >
                <GraduationCap size={18} />
                {homeConfig.hero.ctaPrimary}
              </Link>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3.5 font-bold text-slate-200 transition-all hover:border-amber-500/40 hover:bg-amber-500/10"
              >
                <Play size={18} fill="currentColor" />
                {homeConfig.hero.ctaSecondary}
              </button>
            </div>
          </div>

          <div className="group relative w-full min-h-0 min-w-0 lg:basis-[52%] xl:basis-[53%]">
            <div
              className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-amber-500/6 opacity-60 blur-[90px] transition-opacity duration-700 group-hover:opacity-90 md:-inset-10"
              aria-hidden
            />
            <div className="relative z-20 w-full">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl md:rounded-3xl">
                <video
                  key="learnly-hero"
                  ref={heroVideoRef}
                  className="absolute inset-0 z-0 h-full w-full object-cover object-center will-change-transform transform-[translateZ(0)]"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  aria-label="Collaborative learning preview"
                >
                  <source src="/learnly-hero.mp4" type="video/mp4" />
                </video>

                <div className="absolute bottom-4 right-4 z-20 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3 shadow-none backdrop-blur-xl md:bottom-5 md:right-5 md:gap-4 md:rounded-2xl md:px-5 md:py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eb9422] shadow-[0_0_24px_rgba(235,148,34,0.35)] md:h-11 md:w-11">
                    <Star fill="black" size={20} className="md:h-[22px] md:w-[22px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/95 md:text-[10px]">
                      Trusted
                    </div>
                    <div className="text-sm font-semibold leading-tight text-white md:text-base">
                      Accredited pathways
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1760px] px-4 pb-6 md:px-6 xl:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(homeConfig.stats.length > 0 ? homeConfig.stats.map(s => `${s.value} ${s.label}`) : heroHighlights).map((item) => (
              <div
                key={item}
                className="rounded-xl border border-amber-400/60 bg-amber-500/15 px-4 py-3 text-center text-sm font-semibold text-amber-100 shadow-[0_0_30px_rgba(249,177,77,0.25)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Trusted & Accredited */}
        <section className={`${sectionShell} border-t border-white/5 py-12 md:py-16`}>
          <h2 className={`${sectionTitle} text-center`}>
            Trusted &amp; Accredited <span className={goldText}>Training Provider</span>
          </h2>
          <p className={`mx-auto mt-4 max-w-2xl text-center ${mutedP}`}>
            We collaborate with recognized bodies and industry partners to keep programs current
            and credible.
          </p>
          <div className="mx-auto mt-12 flex max-w-[1200px] items-center justify-center gap-4 overflow-x-auto pb-2 md:gap-6">
            {accreditationLogos.map((logoSrc, index) => (
              <div key={logoSrc} className="group relative isolate h-40 w-40 shrink-0 md:h-52 md:w-52">
                <div className="pointer-events-none absolute inset-1 rounded-full bg-amber-300/22 blur-xl transition-all duration-300 group-hover:bg-amber-300/35 group-hover:blur-2xl" />
                <div
                  className="absolute inset-0 border-2 border-amber-400/75 bg-transparent shadow-[0_0_22px_rgba(249,177,77,0.28)] transition-all duration-300 group-hover:border-amber-300 group-hover:shadow-[0_0_44px_rgba(249,177,77,0.5)]"
                  style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)" }}
                />
                <div className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute -inset-x-8 top-1/2 h-12 -translate-y-1/2 rotate-6 bg-linear-to-r from-transparent via-amber-200/40 to-transparent blur-lg" />
                  <div className="absolute inset-0 bg-radial-[circle_at_50%_50%] from-amber-300/20 via-transparent to-transparent" />
                </div>
                <div className="absolute inset-[8px] flex items-center justify-center overflow-hidden bg-transparent">
                  {index < 3 && (
                    <div className="absolute h-36 w-36 rounded-full bg-white/95 md:h-40 md:w-40" />
                  )}
                  <Image
                    unoptimized
                    src={logoSrc}
                    alt={`Accreditation logo ${index + 1}`}
                    width={208}
                    height={208}
                    className="relative z-10 h-full w-full object-contain p-1 opacity-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Our Courses */}
        <section className={`${sectionShell} border-t border-white/5 py-16 md:py-20`}>
          <h2 className={`${sectionTitle} text-center`}>
            Choose Your Path:{" "}
            <span className={goldText}>
              Self-Paced / E-Learning, Tutor Led Trainings, Live Workshops
            </span>
          </h2>
          <p className={`mx-auto mt-4 max-w-3xl text-center ${mutedP}`}>
            Pick <strong className="text-gray-200">Self-paced</strong> or{" "}
            <strong className="text-gray-200">Interactive E-Learning</strong> to open the full course list.
            After you choose a course, use <strong className="text-gray-200">Course Content</strong> for
            videos, readings, and exams.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {learningFormats.map((item) => {
              const Icon = item.icon;
              const selected = learningPath === item.id;
              return (
                <div
                  key={item.id}
                  className={`lh-path-card group relative overflow-hidden rounded-2xl border bg-linear-to-b from-[#1a1204] via-[#120d06] to-[#050509] p-6 transition-all duration-300 hover:shadow-[0_0_55px_rgba(249,177,77,0.55)] ${
                    selected
                      ? "border-amber-300/95 ring-2 ring-amber-300/70"
                      : "border-amber-500/60 hover:border-amber-300/90"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100">
                    <div className="absolute -inset-x-8 -top-10 h-24 rotate-6 bg-linear-to-r from-transparent via-amber-300/40 to-transparent blur-xl" />
                    <div className="absolute inset-0 bg-radial-[circle_at_20%_15%] from-amber-400/25 via-transparent to-transparent" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                      <Icon size={18} />
                    </span>
                    <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.desc}</p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-300">
                    {item.keyPoints.map((point) => (
                      <li key={point} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 overflow-hidden rounded-xl border border-amber-400/70 bg-amber-950/40 shadow-[0_0_30px_rgba(249,177,77,0.35)]">
                    <Image
                      src={item.imageSrc}
                      alt={item.title}
                      width={800}
                      height={450}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLearningPath(item.id);
                      setTimeout(() => {
                        browseAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 80);
                    }}
                    className={`lh-gold-btn mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:brightness-110 ${
                      selected ? `${goldGradient} text-black` : `border border-amber-500/40 text-amber-100 hover:bg-amber-500/10`
                    }`}
                  >
                    {item.cta} <ChevronRight size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-sm text-gray-200">
            <h3 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              How It <span className={goldText}>Works</span>
            </h3>
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
              {[
                {
                  num: "01",
                  title: "Choose Your Learning Path",
                  text: "Pick Self-Paced / E-Learning, Tutor Led Trainings, or LIVE Workshops based on how you prefer to learn.",
                },
                {
                  num: "02",
                  title: "Learn With Real-World Practice",
                  text: "Follow guided modules, tutor-led sessions, and activities—watch, read, participate, and apply concepts through exercises.",
                },
                {
                  num: "03",
                  title: "Get Certified & Move Ahead",
                  text: "Complete assessments, earn recognised certifications, and use your new skills in real projects and roles.",
                },
              ].map((step) => (
                <div key={step.num} className="space-y-2 md:flex-1">
                  <div className="inline-flex items-baseline gap-2">
                    <span className="text-5xl font-black leading-none text-amber-300 drop-shadow-[0_0_20px_rgba(249,177,77,0.8)]">
                      {step.num}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/85">
                      Step
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-white">{step.title}</h4>
                  <p className="text-[13px] leading-relaxed text-slate-200/90">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div ref={browseAnchorRef} id="browse-programs" className="scroll-mt-24 pt-4">
            {learningPath === "interactive" ? (
              <p className="mx-auto mt-8 max-w-3xl rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-center text-sm text-violet-100/95">
                <strong>Interactive E-Learning:</strong> choose a course to follow the structured path—video lessons,
                uploaded resources, and question-based assessments unlock as you progress.
              </p>
            ) : null}
            {learningPath === "live" ? (
              <p className="mx-auto mt-8 max-w-3xl rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100/95">
                <strong>Live workshops</strong> run on a schedule. Browse categories below or open the{" "}
                <Link href="/courses" className="font-semibold underline underline-offset-2 hover:text-white">
                  Courses
                </Link>{" "}
                page for upcoming tutor-led sessions.
              </p>
            ) : null}
            {!learningPath ? (
              <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-gray-500">
                Select a learning path above to show the matching course catalog, or browse categories first.
              </p>
            ) : null}
          </div>

          <h3 className={`${sectionTitle} mt-12 text-center text-2xl md:text-4xl lg:text-5xl`}>
            Explore <span className={goldText}>Our Popular Courses</span>
          </h3>

          <div className="mt-8 flex flex-wrap justify-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setActiveCategory("All")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-all md:px-5 ${
                activeCategory === "All"
                  ? `${goldGradient} text-black`
                  : "border border-white/10 bg-white/[0.04] text-gray-300 hover:border-amber-500/30 hover:text-amber-400"
              }`}
            >
              All
            </button>
            {catalogForPills.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => setActiveCategory(cat.title)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-all md:px-5 ${
                  activeCategory === cat.title
                    ? `${goldGradient} text-black`
                    : "border border-white/10 bg-white/[0.04] text-gray-300 hover:border-amber-500/30 hover:text-amber-400"
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredCatalog.length === 0 ? (
              <p className="col-span-full text-center text-sm text-gray-400">
                No categories match this filter. Choose &quot;All&quot; or add categories in Admin → Categories.
              </p>
            ) : (
              filteredCatalog.map((cat, index) => {
                const Icon = iconForCategoryTitle(cat.title);
                const desc =
                  cat.description ||
                  fallbackCategoryCards.find((c) => c.title === cat.title)?.desc ||
                  "Explore programs and courses in this category.";
                const cardImage = liveExploreProgramImages[index % liveExploreProgramImages.length];
                return (
                  <div
                    key={cat.slug}
                    className="lh-category-card flex flex-col rounded-2xl border border-amber-500/35 bg-linear-to-b from-[#1b1305] via-[#120c06] to-[#07070a] p-5 transition-all hover:border-amber-300/80 hover:shadow-[0_0_32px_rgba(249,177,77,0.3)]"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                      <Icon size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white">{cat.title}</h3>
                    {cat.subtitle ? (
                      <p className="mt-1 text-xs font-medium text-amber-200/80">{cat.subtitle}</p>
                    ) : null}
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-400">{desc}</p>
                    <div className="mt-4 overflow-hidden rounded-xl border border-amber-500/35 bg-black/30 p-1">
                      <Image
                        src={cardImage}
                        alt={`${cat.title} program`}
                        width={1200}
                        height={800}
                        className="h-auto w-full object-contain"
                      />
                    </div>
                    <Link
                      href={`/courses/category/${cat.slug}`}
                      className={`mt-6 inline-flex items-center gap-1 text-sm font-bold ${goldText} hover:underline`}
                    >
                      View courses <ChevronRight size={16} />
                    </Link>
                  </div>
                );
              })
            )}
          </div>

          {(learningPath === "self-paced" || learningPath === "interactive") && (
            <div className="mt-16 border-t border-white/10 pt-12">
              <h4 className="text-center text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                📚 Explore <span className={goldText}>Professional Learning Programs</span>
              </h4>
              <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-500">
                Discover industry-focused courses designed to help you build practical skills
                through videos, study materials, assessments, and certification-based learning.
                Filter courses by category and access structured modules, tutor-led sessions, and
                examinations — all in one modern learning platform.
              </p>
              {filteredCoursesForPath.length === 0 ? (
                <p className="mt-8 text-center text-sm text-gray-500">
                  No published courses match this category yet. Try &quot;All&quot; or add courses in Admin.
                </p>
              ) : (
                <>
                  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {displayedCourses.map((course) => (
                      <article
                        key={course.slug}
                        className="lh-course-card flex flex-col overflow-hidden rounded-2xl border border-amber-500/35 bg-linear-to-b from-[#1b1305] via-[#120c06] to-[#07070a] transition-all hover:border-amber-300/80 hover:shadow-[0_0_28px_rgba(249,177,77,0.24)]"
                      >
                        <div className="relative aspect-[16/10] bg-black/40">
                          <Image
                            src={resolveCourseCardImage(course.image)}
                            alt=""
                            width={1200}
                            height={750}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80">
                            {course.level} · {course.duration}
                          </p>
                          <h5 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-white">{course.title}</h5>
                          <p className="mt-2 line-clamp-2 text-xs text-gray-500">{course.subtitle}</p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-amber-200/90">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" size={14} />
                            {course.rating}
                          </div>
                          <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3">
                            <span className="text-lg font-bold text-amber-400">{course.price}</span>
                            <Link
                              href={`/courses/${course.slug}?tab=course-content`}
                              className={`text-xs font-bold ${goldText} hover:underline`}
                            >
                              View curriculum →
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {filteredCoursesForPath.length > 8 ? (
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShowAllCourses((prev) => !prev)}
                        className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all hover:brightness-110 ${
                          showAllCourses
                            ? "border border-amber-500/50 text-amber-100 hover:bg-amber-500/10"
                            : `${goldGradient} text-black`
                        }`}
                      >
                        {showAllCourses ? "Show Less" : "View All"}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </section>

        <section className={`${sectionShell} py-12 md:py-16`}>
          <div className="lh-invest-shell rounded-3xl border border-amber-400/60 bg-linear-to-br from-[#221706] via-[#171006] to-[#0a0808] p-6 shadow-[0_0_58px_rgba(249,177,77,.3)] md:p-8">
            <h2 className="text-center text-2xl font-bold text-white md:text-3xl">
              Invest in your <span className={goldText}>career</span>
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {careerHighlights.map((item) => (
                <article
                  key={item.title}
                  className="lh-invest-card rounded-2xl border border-amber-400/55 bg-linear-to-b from-[#251807] via-[#1a1208] to-[#110d09] p-5 shadow-[0_0_34px_rgba(249,177,77,0.2)] transition-all hover:-translate-y-0.5 hover:border-amber-300/90 hover:shadow-[0_0_44px_rgba(249,177,77,0.35)]"
                >
                  <h3 className="text-base font-bold text-amber-100">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${sectionShell} border-t border-white/5 py-16 md:py-20`}>
          <h2 className={`${sectionTitle} text-center`}>
            Choose the Right <span className={goldText}>Plan</span> for You
          </h2>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-xl border border-white/10 bg-[#11172c] p-1">
              <button
                type="button"
                onClick={() => setPlanAudience("individual")}
                className={`rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
                  planAudience === "individual" ? `${goldGradient} text-black` : "text-gray-300"
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setPlanAudience("organisation")}
                className={`rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
                  planAudience === "organisation" ? `${goldGradient} text-black` : "text-gray-300"
                }`}
              >
                Organisation
              </button>
            </div>
          </div>

          {planAudience === "individual" ? (
            <>
              <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-2">
                {liveIndividualPlans.map((plan) => (
                  <article
                    key={plan.badge}
                    className="lh-plan-card flex h-full flex-col rounded-2xl border border-amber-500/40 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] p-6 shadow-[0_0_30px_rgba(249,177,77,0.2)] transition-all hover:-translate-y-0.5 hover:border-amber-300/75 hover:shadow-[0_0_42px_rgba(249,177,77,0.3)]"
                  >
                    <p className="text-sm font-semibold text-amber-300">{plan.badge}</p>
                    <p className="mt-1 text-sm text-gray-300">{plan.tagline}</p>
                    <p className="mt-4 text-sm leading-relaxed text-gray-400">{plan.desc}</p>
                    <p className="mt-5 text-2xl font-bold text-white">{plan.price}</p>
                    {plan.note ? <p className="mt-1 text-xs text-amber-100/90">{plan.note}</p> : null}
                    <ul className="mt-5 space-y-2 text-sm text-gray-200">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 ${goldGradient}`}
                    >
                      {plan.cta} <ChevronRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
              <div className="lh-help-card mx-auto mt-6 max-w-6xl rounded-2xl border border-amber-500/45 bg-linear-to-r from-amber-500/16 via-amber-400/10 to-amber-500/16 p-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/70 bg-amber-400/20 text-amber-100 shadow-[0_0_20px_rgba(249,177,77,0.35)]">
                    <CircleHelp size={20} />
                  </span>
                  <p className="text-sm font-semibold text-amber-100 md:text-base">
                    Need help selecting the right Individual plan? Tell us your role, budget, and
                    learning goals — we will recommend the best fit for you.
                  </p>
                  <Link
                    href="#"
                    className={`mt-1 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 ${goldGradient}`}
                  >
                    Contact Us <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="mx-auto mt-10 max-w-4xl">
              <article className="lh-plan-card flex h-full flex-col rounded-2xl border border-amber-500/40 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] p-6 shadow-[0_0_30px_rgba(249,177,77,0.2)] transition-all hover:-translate-y-0.5 hover:border-amber-300/75 hover:shadow-[0_0_42px_rgba(249,177,77,0.3)]">
                <p className="text-sm font-semibold text-amber-300">{liveOrgPlan.title}</p>
                <p className="mt-1 text-sm text-gray-300">{liveOrgPlan.tagline}</p>
                <p className="mt-4 text-sm leading-relaxed text-gray-400">{liveOrgPlan.desc}</p>
                <p className="mt-5 text-2xl font-bold text-white">{liveOrgPlan.price}</p>
                <p className="mt-1 text-xs text-amber-100/90">{liveOrgPlan.note}</p>
                <ul className="mt-5 space-y-2 text-sm text-gray-200">
                  {liveOrgPlan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 ${goldGradient}`}
                >
                  {liveOrgPlan.cta} <ChevronRight size={16} />
                </button>
              </article>
              <div className="lh-help-card mt-6 rounded-2xl border border-amber-500/45 bg-linear-to-r from-amber-500/16 via-amber-400/10 to-amber-500/16 p-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/70 bg-amber-400/20 text-amber-100 shadow-[0_0_20px_rgba(249,177,77,0.35)]">
                    <CircleHelp size={20} />
                  </span>
                  <p className="text-sm font-semibold text-amber-100 md:text-base">
                    Need support choosing an Organisation plan? Share your team size, goals, and
                    required outcomes — we will help you set up the right enterprise learning path.
                  </p>
                  <Link
                    href="#"
                    className={`mt-1 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 ${goldGradient}`}
                  >
                    Contact Sales <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Why Choose Us */}
        <section className={`${sectionShell} border-t border-white/5 py-16 md:py-20`}>
          <div className="mb-4 flex justify-center lg:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Sparkles size={14} />
              Why choose us?
            </span>
          </div>
          <h2 className={`${sectionTitle} text-center lg:text-left`}>
            Why Choose <span className={goldText}>Sustainable Futures Trainings</span>?
          </h2>
          <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <p className={mutedP}>
                We combine rigorous instructional design with flexible delivery—so teams and
                individuals gain skills that transfer directly to the workplace.
              </p>
              <div className="w-full overflow-hidden rounded-2xl border border-white/10">
                <Image
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80"
                  alt="Team collaborating in a professional workshop"
                  width={900}
                  height={675}
                  className="h-auto w-full object-cover"
                />
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {whyFeatures.map(({ title, desc, icon: Icon }) => (
                <div
                  key={title}
                  className="lh-why-card rounded-2xl border border-amber-500/35 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] p-5 md:p-6 shadow-[0_0_24px_rgba(249,177,77,0.16)] transition-all hover:border-amber-300/70 hover:shadow-[0_0_32px_rgba(249,177,77,0.24)]"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm text-gray-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className={`${sectionShell} border-t border-white/5 py-16 md:py-20`}>
          <div className="mb-4 flex justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              What Our Learners Say
            </span>
          </div>
          <h2 className={`${sectionTitle} text-center`}>
            What Our Learners <span className={goldText}>Say</span>
          </h2>
          <p className={`mx-auto mt-4 max-w-3xl text-center ${mutedP}`}>
            Real experiences from professionals who have advanced their skills with Sustainable
            Futures Trainings.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {liveTestimonials.map((t) => (
              <blockquote
                key={t.seed}
                className="lh-testimonial-card flex flex-col rounded-2xl border border-amber-500/35 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808] p-6 shadow-[0_0_24px_rgba(249,177,77,0.16)] transition-all hover:border-amber-300/70 hover:shadow-[0_0_32px_rgba(249,177,77,0.24)]"
              >
                <p className="flex-1 text-sm leading-relaxed text-gray-300">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
                  <div className="h-11 w-11 overflow-hidden rounded-full border border-amber-500/20 bg-gray-800">
                    <Image
                      unoptimized
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.seed}`}
                      alt=""
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-white">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* Mid CTA */}
        <section className={`${sectionShell} py-16 md:py-20`}>
          <div className="lh-unlock-shell rounded-3xl border border-amber-300/60 bg-linear-to-br from-amber-500/30 via-[#2a1b08] to-[#120c08] px-6 py-12 text-center shadow-[0_0_46px_rgba(249,177,77,.35)] md:px-12 md:py-16">
            <h2 className="mx-auto max-w-3xl text-2xl font-bold leading-tight text-white md:text-3xl">
              Start Your Learning Journey Today!
            </h2>
            <p className={`mx-auto mt-4 max-w-2xl ${mutedP}`}>
              Join thousands of learners building future-ready skills with Sustainable Futures
              Training—starting is simple.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                type="button"
                className={`rounded-full px-8 py-4 font-bold text-black shadow-lg transition-all hover:brightness-110 ${goldGradient}`}
              >
                Start Learning
              </button>
              <button
                type="button"
                className="rounded-full border border-amber-500/40 px-8 py-4 font-bold text-[#fde68a] transition-all hover:bg-amber-500/5"
              >
                Explore Courses
              </button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={`${sectionShell} border-t border-white/5 py-16 md:py-20`}>
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
            <div className="w-full lg:flex-1">
              <h2 className={sectionTitle}>Frequently Asked Questions</h2>
              <p className={`mt-4 ${mutedP}`}>
                Quick answers about programs, access, and accreditation. Reach out anytime for
                personal guidance.
              </p>
              <div className="mt-8 space-y-2">
                {(showAllFaqs ? liveFaqs : liveFaqs.slice(0, 5)).map((item) => {
                  const open = openFaq === item.q;
                  return (
                    <div
                      key={item.q}
                      className="lh-faq-card overflow-hidden rounded-xl border border-amber-500/35 bg-linear-to-b from-[#1b1306] via-[#120d07] to-[#0a0808]"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left font-bold text-white transition-colors hover:text-amber-400"
                        onClick={() => setOpenFaq(open ? null : item.q)}
                        aria-expanded={open}
                      >
                        <span>{item.q}</span>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 text-amber-500 transition-transform ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                      {open && (
                        <div className="border-t border-white/10 px-4 py-4 text-sm leading-relaxed text-gray-400">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
                {liveFaqs.length > 5 ? (
                  <div className="pt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAllFaqs((prev) => !prev)}
                      className={`rounded-full px-6 py-2 text-sm font-bold transition-all hover:brightness-110 ${
                        showAllFaqs
                          ? "border border-amber-500/50 text-amber-100 hover:bg-amber-500/10"
                          : `${goldGradient} text-black`
                      }`}
                    >
                      {showAllFaqs ? "Show Less" : "View All"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex w-full justify-center lg:w-[380px] lg:justify-end">
              <Image
                src="/Untitled (Instagram Post (45)).png"
                alt="FAQ visual"
                width={360}
                height={520}
                className="h-auto max-w-full object-contain"
                unoptimized
              />
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className={`${sectionShell} py-10 md:py-12`}>
          <div className="lh-newsletter-shell rounded-2xl border border-amber-500/35 bg-linear-to-r from-[#1b1306] via-[#120d07] to-[#0a0808] p-5 shadow-[0_0_32px_rgba(249,177,77,0.18)] md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/60 bg-amber-500/15 text-amber-200">
                  <Mail size={18} />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white md:text-xl">Subscribe to our Newsletter</h3>
                  <p className="mt-1 text-sm text-gray-300">
                    Write your email to subscribe for latest updates and announcements.
                  </p>
                </div>
              </div>
              <form
                className="flex w-full max-w-xl flex-col gap-2 sm:flex-row"
                onSubmit={(event) => event.preventDefault()}
              >
                <input
                  type="email"
                  placeholder="Write your email"
                  className="lh-newsletter-input w-full rounded-full border border-amber-500/40 bg-black/35 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-amber-300/80"
                />
                <button
                  type="submit"
                  className={`rounded-full px-6 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 ${goldGradient}`}
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Footer CTA strip */}
        <section className="lh-unlock-strip border-t border-amber-500/20 bg-linear-to-r from-[#120d08] via-[#0c0908] to-[#120d08] py-16 md:py-20">
          <div className={sectionShell}>
            <div className="lh-unlock-grid overflow-hidden rounded-3xl border border-amber-500/35 bg-linear-to-br from-[#1a1208] via-[#110d09] to-[#0a0808] p-6 shadow-[0_0_44px_rgba(249,177,77,0.2)] md:p-8">
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div className="lh-unlock-image-shell relative overflow-hidden rounded-2xl border border-amber-400/40 bg-black/35">
                  <Image
                    src="/q.png"
                    alt="Unlock potential visual"
                    width={1024}
                    height={576}
                    className="h-auto w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="text-center lg:text-left">
                  <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                    Unlock Potential, <span className={goldText}>Achieve Success</span>
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-300 md:text-base">
                    Build future-ready capabilities through industry-aligned learning, expert-led
                    training, and practical pathways designed for real career outcomes.
                  </p>
                  <button
                    type="button"
                    className={`mt-8 rounded-full px-10 py-4 font-bold text-black shadow-lg transition-all hover:brightness-110 ${goldGradient}`}
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
