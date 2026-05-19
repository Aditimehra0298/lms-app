import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  Leaf,
  Search,
  Star,
  Users,
  ScrollText,
} from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import { CoursePrice } from "@/components/CoursePrice";
import CategoryFaqAccordion from "@/components/CategoryFaqAccordion";
import LevelFilterSelect from "@/components/LevelFilterSelect";
import type { CategoryWhyTone, CourseLearningFormat } from "@/lib/content-schema";
import {
  canonicalCategorySlug,
  getCategoryWorkshopPlaceholders,
  mergeCategoryPageConfig,
  whyLearnToRows,
} from "@/lib/category-page-resolve";
import { getManagedCourses } from "@/lib/server/course-catalog";
import { readAdminContent } from "@/lib/server/content-store";
import { courseBrowseHref, liveTutorCourseHref } from "@/lib/tutor-led-routes";

export const dynamic = "force-dynamic";

/** Same asset as `ChatGPT Image May 2, 2026, 09_36_25 AM.png`, copied to a URL-safe name. */
const FOOD_SAFETY_HERO = "/food-safety-category-hero.png";

const categories: Record<
  string,
  {
    title: string;
    subtitle: string;
    heroImage: string;
  }
> = {
  "food-safety": {
    title: "Food Safety",
    subtitle:
      "Master HACCP, hygiene, audits, and regulatory essentials—built for teams who take quality and public health seriously.",
    heroImage: FOOD_SAFETY_HERO,
  },
  "cyber-security": {
    title: "Cyber Security",
    subtitle:
      "Build practical cyber defense, risk management, and incident response capabilities.",
    heroImage:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80",
  },
  esg: {
    title: "ESG",
    subtitle:
      "Develop sustainability, governance, and reporting skills aligned with modern standards.",
    heroImage:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1600&q=80",
  },
  "information-security": {
    title: "Information Security",
    subtitle:
      "Master information governance, control frameworks, and secure operating practices.",
    heroImage:
      "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1600&q=80",
  },
  "medical-devices": {
    title: "Medical Devices",
    subtitle:
      "Learn quality, compliance, and lifecycle management for medical device operations.",
    heroImage:
      "https://images.unsplash.com/photo-1581595219315-a187dd40c322?auto=format&fit=crop&w=1600&q=80",
  },
  "workplace-compliance": {
    title: "Workplace Compliance",
    subtitle:
      "Strengthen legal, ethical, and policy compliance across workplace environments.",
    heroImage:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
  },
  "skill-development-framework": {
    title: "Skill Development Framework",
    subtitle:
      "Create measurable upskilling pathways and capability-building programs for teams.",
    heroImage:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80",
  },
  "mechanical-engineering-hvac-and-refrigeration": {
    title: "Mechanical Engineering (HVAC & Refrigeration)",
    subtitle:
      "Build strong fundamentals in HVAC systems, refrigeration cycles, and maintenance.",
    heroImage:
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1600&q=80",
  },
};

type CourseCard = {
  slug: string;
  title: string;
  level: string;
  duration: string;
  rating: string;
  price: string;
  image?: string;
  learningFormat?: CourseLearningFormat;
};

const fallbackCourses = (fallbackSlug: string): CourseCard[] => [
  {
    slug: fallbackSlug,
    title: "Category Foundations",
    level: "Beginner",
    duration: "3h 10m",
    rating: "4.6",
    price: "$39",
  },
  {
    slug: fallbackSlug,
    title: "Core Practices",
    level: "Intermediate",
    duration: "5h 00m",
    rating: "4.7",
    price: "$49",
  },
  {
    slug: fallbackSlug,
    title: "Applied Workshop",
    level: "Intermediate",
    duration: "4h 25m",
    rating: "4.5",
    price: "$45",
  },
  {
    slug: fallbackSlug,
    title: "Advanced Track",
    level: "Advanced",
    duration: "7h 40m",
    rating: "4.8",
    price: "$69",
  },
];

const featureStrip = [
  {
    title: "Industry Recognized",
    desc: "Aligned with global standards employers trust.",
    Icon: Award,
  },
  {
    title: "Expert Instructors",
    desc: "Learn from certified practitioners and industry leads.",
    Icon: Users,
  },
  {
    title: "Practical Learning",
    desc: "Real workflows, checklists, and case studies.",
    Icon: BookOpen,
  },
  {
    title: "Certification",
    desc: "Credentials that support audits and career growth.",
    Icon: ScrollText,
  },
];

function toTitleCase(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function avgRatingFromCourses(list: CourseCard[]): string {
  const nums = list
    .map((c) => parseFloat(c.rating))
    .filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (!nums.length) return "4.6";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

export default async function CourseCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categoryKey = canonicalCategorySlug(category);
  const [managedCourses, adminContent] = await Promise.all([
    getManagedCourses(),
    readAdminContent(),
  ]);
  const pageCfg = mergeCategoryPageConfig(categoryKey, adminContent);
  const current = categories[categoryKey];

  const title = current?.title ?? toTitleCase(categoryKey);
  const subtitle =
    pageCfg.heroSubtitle.trim() ||
    current?.subtitle ||
    `Explore curated ${title} courses designed for practical skill-building and career growth.`;
  const adminMappedCourses: CourseCard[] = managedCourses
    .filter(
      (course) =>
        canonicalCategorySlug(course.category) === categoryKey &&
        !pageCfg.hiddenCourseSlugs.includes(course.slug),
    )
    .map((course) => ({
      slug: course.slug,
      title: course.title,
      level: course.level,
      duration: course.duration,
      rating: course.rating,
      price: course.price,
      image: course.image,
      learningFormat: course.learningFormat,
    }));
  const fallbackSlug =
    adminMappedCourses[0]?.slug ?? managedCourses[0]?.slug ?? "food-safety-masterclass";
  const courses = adminMappedCourses.length > 0 ? adminMappedCourses : fallbackCourses(fallbackSlug);
  const heroImage = pageCfg.heroImage;

  const avgRating = avgRatingFromCourses(courses);
  const courseCountLabel = `${Math.max(courses.length, 8)} Courses`;

  if (!title) notFound();

  const workshopRegisterHref = liveTutorCourseHref();
  const workshops = getCategoryWorkshopPlaceholders(title, workshopRegisterHref);

  const instructors = pageCfg.instructors;
  const whyLearnItems = whyLearnToRows(pageCfg.whyLearn);

  const whyToneClass: Record<CategoryWhyTone, string> = {
    amber: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/35",
    emerald: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/35",
    blue: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/35",
    violet: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/35",
  };

  const faqItems = [
    {
      q: `What is covered in ${title} training?`,
      a: `Programs combine fundamentals, regulatory context, and hands-on scenarios so you can apply what you learn immediately in ${title.toLowerCase()} roles.`,
    },
    {
      q: "Who should enroll?",
      a: `Teams and individuals building capability in ${title.toLowerCase()}, program leads rolling out training, and anyone preparing for assessments or certification.`,
    },
    {
      q: "Will I receive a certificate?",
      a: "Yes. Completing eligible modules unlocks a downloadable certificate you can share with employers.",
    },
    {
      q: "Are courses aligned with industry standards?",
      a: "Content is structured around widely used frameworks and audit expectations so your skills map to real workplace requirements.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070707] text-white">

      <main className="mx-auto max-w-[1760px] px-4 pb-16 pt-4 md:px-6 xl:px-8">
        {/* Breadcrumbs */}
        <nav className="mb-4 text-xs text-gray-500">
          <Link href="/" className="transition-colors hover:text-amber-200">
            Home
          </Link>
          <span className="mx-2 text-gray-600">/</span>
          <Link href="/courses" className="transition-colors hover:text-amber-200">
            Categories
          </Link>
          <span className="mx-2 text-gray-600">/</span>
          <span className="font-medium text-amber-200">{title}</span>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f0f] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="relative min-h-[440px] lg:min-h-[500px]">
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              unoptimized={heroImage.startsWith("http")}
              className="object-cover object-[center_30%]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/88 to-black/25 lg:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 lg:bg-gradient-to-t lg:from-black/50" />

            <div className="relative z-10 grid gap-8 px-5 py-10 md:px-10 lg:grid-cols-[1.15fr_380px] lg:items-center lg:py-14">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  <Leaf className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Category
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
                  {title}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-300 md:text-lg">
                  {subtitle}
                </p>

                <div className="mt-8 flex flex-wrap gap-4 md:gap-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                      <BookOpen className="h-5 w-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{courseCountLabel}</p>
                      <p className="text-xs text-gray-500">Structured programs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                      <Users className="h-5 w-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">8K+ Learners</p>
                      <p className="text-xs text-gray-500">Enrolled in this track</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{avgRating} Avg Rating</p>
                      <p className="text-xs text-gray-500">From verified learners</p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex flex-wrap gap-3">
                  <a
                    href="#course-grid"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-7 py-3.5 text-sm font-bold text-black shadow-lg shadow-amber-900/30 transition hover:brightness-110"
                  >
                    Explore Courses <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </a>
                  <a
                    href="#live-workshops"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/45 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-amber-400/40 hover:bg-black/55"
                  >
                    <Camera className="h-4 w-4 text-amber-300" />
                    Join Live Workshop
                  </a>
                </div>
              </div>

              {/* Hero highlight tiles */}
              <div className="hidden lg:grid grid-cols-2 gap-3">
                {featureStrip.map(({ title: ft, desc, Icon }) => (
                  <div
                    key={ft}
                    className="rounded-2xl border border-white/15 bg-black/55 p-4 shadow-xl backdrop-blur-md"
                  >
                    <Icon className="h-6 w-6 text-amber-300" strokeWidth={2} />
                    <p className="mt-3 text-sm font-bold text-white">{ft}</p>
                    <p className="mt-1 text-xs leading-snug text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Feature strip */}
        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featureStrip.map(({ title: ft, desc, Icon }) => (
            <article
              key={ft}
              className="flex gap-3 rounded-2xl border border-white/10 bg-[#101010] p-4 transition hover:border-amber-500/25"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{ft}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{desc}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Filters */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="search"
                placeholder={`Search within ${title} courses...`}
                className="w-full rounded-xl border border-white/10 bg-black/50 py-3 pl-10 pr-3 text-sm text-white placeholder:text-gray-600 focus:border-amber-500/35 focus:outline-none"
              />
            </label>
            <LevelFilterSelect variant="category" options={pageCfg.levelFilters} />
            {["All Durations", "Sort By: Popular"].map((f) => (
              <button
                key={f}
                type="button"
                className="inline-flex items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3 py-3 text-sm text-gray-200 transition hover:border-white/20"
              >
                {f} <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            ))}
            <button
              type="button"
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-gray-300 hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </section>

        {/* Course grid */}
        <section id="course-grid" className="mt-10 scroll-mt-28">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold md:text-3xl">
              All {title} Courses{" "}
              <span className="text-amber-400">({courses.length})</span>
            </h2>
            <Link
              href="/courses"
              className="text-sm font-semibold text-amber-300 hover:text-amber-200"
            >
              View All Courses →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {courses.map((course, i) => (
              <article
                key={`${course.slug}-${course.title}-${i}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] transition hover:border-amber-500/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
                  <Image
                    src={course.image ?? heroImage}
                    alt={course.title}
                    fill
                    unoptimized
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  {i === 0 ? (
                    <span className="absolute left-3 top-3 rounded-md bg-gradient-to-r from-amber-400 to-[#eb9422] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                      Bestseller
                    </span>
                  ) : null}
                  {i === 1 ? (
                    <span className="absolute left-3 top-3 rounded-md bg-emerald-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black">
                      Popular
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-base font-bold leading-snug text-white">
                    {course.title}
                  </h3>
                  <p className="mt-2 text-xs text-gray-500">
                    {course.level} · {course.duration}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-200/90">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {course.rating}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/5 pt-4">
                    <CoursePrice label={course.price} className="text-lg font-bold text-amber-400" />
                    <div className="flex items-center gap-2">
                      <Link
                        href={courseBrowseHref(course.slug, course.learningFormat, categoryKey)}
                        className="text-xs font-semibold text-gray-400 underline-offset-4 hover:text-white hover:underline"
                      >
                        View Details
                      </Link>
                      <AddToCartButton
                        slug={course.slug}
                        title={course.title}
                        price={course.price}
                        image={course.image ?? heroImage}
                        iconOnly
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[#f9b14d] to-[#eb9422] text-black shadow-md transition hover:brightness-110"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Live workshops */}
        <section id="live-workshops" className="mt-16 scroll-mt-28">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold md:text-3xl">Upcoming Live Workshops</h2>
            <Link
              href="/my-learning?tab=live"
              className="text-sm font-semibold text-amber-300 hover:text-amber-200"
            >
              View All Workshops →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workshops.map((w) => (
              <article
                key={w.title}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f]"
              >
                <div className="relative aspect-[16/9]">
                  <Image src={w.image} alt="" fill unoptimized className="object-cover" />
                  <span className="absolute left-3 top-3 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Live
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold leading-snug text-white">{w.title}</h3>
                  <p className="mt-2 text-xs text-gray-500">{w.date}</p>
                  <p className="mt-1 text-xs text-gray-400">Instructor · {w.instructor}</p>
                  <Link
                    href={w.registerHref}
                    className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] py-2.5 text-sm font-bold text-black transition hover:brightness-110"
                  >
                    Register
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Instructors + Why learn — side by side (matches design) */}
        <section className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="rounded-2xl border border-white/10 bg-[#121212] p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white md:text-xl">Our Expert Instructors</h2>
              <Link
                href="/courses"
                className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                View All Instructors
              </Link>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-2 lg:gap-3">
              {instructors.map((person) => (
                <div
                  key={person.name}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/8 bg-black/35 p-3"
                >
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/50">
                    <Image
                      src={person.photo}
                      alt={person.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{person.name}</p>
                    <p className="mt-0.5 text-xs leading-snug text-gray-400">{person.role}</p>
                    <p className="mt-1 text-[11px] font-medium text-gray-500">{person.years}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121212] p-4 md:p-5">
            <h2 className="text-lg font-bold text-white md:text-xl">
              Why Learn <span className="text-amber-400">{title}</span>?
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
              {whyLearnItems.map(({ label, desc, quote, Icon, tone }) => (
                <div key={label} className="flex gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${whyToneClass[tone]}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-bold leading-snug text-white">{label}</p>
                    <p className="mt-1 text-[11px] leading-snug text-gray-500">{desc}</p>
                    {quote?.trim() ? (
                      <p className="mt-2 border-l-2 border-amber-500/40 pl-2 text-[11px] italic leading-snug text-amber-100/85">
                        “{quote.trim()}”
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ + Newsletter */}
        <section className="mt-16 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="rounded-3xl border border-white/10 bg-[#0f0f0f] p-6 md:p-8">
            <h3 className="text-xl font-bold md:text-2xl">Frequently Asked Questions</h3>
            <p className="mt-2 text-sm text-gray-500">Quick answers about programs and certificates.</p>
            <div className="mt-6">
              <CategoryFaqAccordion items={faqItems} />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#1a1408] via-[#0f0f0f] to-[#0a1628] p-6 md:p-8">
            <div className="relative z-10">
              <h3 className="text-xl font-bold md:text-2xl">Stay Updated</h3>
              <p className="mt-2 max-w-sm text-sm text-gray-400">
                Get new course launches, audit tips, and category updates in your inbox.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="min-h-12 flex-1 rounded-xl border border-white/15 bg-black/40 px-4 text-sm text-white placeholder:text-gray-600 focus:border-amber-400/40 focus:outline-none"
                />
                <button
                  type="button"
                  className="min-h-12 shrink-0 rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-8 text-sm font-bold text-black hover:brightness-110"
                >
                  Subscribe
                </button>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-gray-400">
                {["No spam — only useful updates", "Cancel anytime", "Exclusive learner content"].map(
                  (line) => (
                    <li key={line} className="flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} />
                      {line}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div
              className="pointer-events-none absolute -bottom-6 -right-6 h-36 w-36 rounded-full bg-amber-500/20 blur-3xl"
              aria-hidden
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 overflow-hidden rounded-3xl border border-emerald-600/40 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 px-6 py-12 text-center md:px-12">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Ready to Build a Career in {title}?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-emerald-100/90 md:text-base">
            Start learning from industry experts and earn credentials that stand up in audits and interviews.
          </p>
          <Link
            href="#course-grid"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f9b14d] to-[#eb9422] px-10 py-4 text-sm font-bold text-black shadow-lg transition hover:brightness-110"
          >
            Start Learning Now <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </section>
      </main>

    </div>
  );
}
