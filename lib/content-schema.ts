import { type TutorLedProgramStored } from "./default-tutor-led-programs";
import {
  defaultOrganizationTeamAdminConfig,
  type OrganizationTeamAdminConfig,
} from "./organization-team-config";
import type { ManagedCourseCertificateConfig } from "@/lib/certificate-program-config";
import type { CommunityConnectCard } from "./my-learning-community-defaults";

export type { TutorLedProgramStored };
export type { ManagedCourseCertificateConfig };

export type LearningCourseStatus = "In Progress" | "Completed" | "Not Started";

export type LearningCourseItem = {
  title: string;
  modules: number;
  duration: string;
  completed: number;
  status: LearningCourseStatus;
  action: string;
};

/** Admin-managed reminders on the learner dashboard / calendar. */
export type DashboardCalendarReminder = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  body?: string;
  href?: string;
  published?: boolean;
};

export type DashboardContent = {
  nextClassTitle: string;
  nextClassTime: string;
  streakDays: number;
  /** Shown on all learners' My Learning calendar (notifications + day labels). */
  calendarReminders?: DashboardCalendarReminder[];
  /** Connect With Us cards on My Learning → Community tab. */
  communityConnect?: CommunityConnectCard[];
};

/** Self-paced catalog vs other delivery modes (admin Courses tab manages self-paced only). */
export type CourseLearningFormat = "self-paced" | "interactive" | "live";

/** Rows inside each module — matches the Food Safety diploma course-content UI (video / reading / exam). */
export type CourseCurriculumKind = "video" | "reading" | "exam";
export type CourseCurriculumItem = {
  label: string;
  kind: CourseCurriculumKind;
  /** Optional lesson notes shown in admin lesson editor; omitted in legacy rows. */
  description?: string;
  /** Optional runtime in minutes (helps module duration and exam unlock gating). */
  lessonDurationMinutes?: number;
  /** Auto-detected uploaded video size in MB (rounded to 1 decimal). */
  lessonVideoSizeMb?: number;
  /** Admin-defined preview watch limit for learners in minutes. */
  previewLimitMinutes?: number;
  /** Lesson-specific "About this lesson/module" text shown under video in learner UI. */
  about?: string;
  /** Per-lesson outcomes (shown as bullets/chips in learner UI). */
  learningOutcomes?: string[];
  /** Per-lesson helper links/content buckets for learner tools panel. */
  notes?: string;
  captions?: string;
  pdfUrl?: string;
  /** Lesson PPT/slide deck URL (ppt/pptx) for the learner tools panel. */
  pptUrl?: string;
  podcastUrl?: string;
  /** Optional additional resource URL or uploaded file for learners. */
  webhookUrl?: string;
  resourceUrl?: string;
  downloadUrl?: string;
  /** Uploaded lesson video file or direct video URL for video rows. */
  videoUrl?: string;
  /** When kind is `exam`: optional timed attempt with duration in minutes. */
  timedExam?: boolean;
  examDurationMinutes?: number;
  /** Optional learner-facing exam paper / instructions (PDF etc.), uploaded in admin. */
  examUploadUrl?: string;
  /** Minimum percentage of correct answers required to pass this exam (e.g. 70). */
  examPassingScorePercent?: number;
};

/** Optional grouping under a module; module-level `items` still supported for backward compatibility. */
export type CourseCurriculumSubModule = {
  title: string;
  items: CourseCurriculumItem[];
};

export type CourseCurriculumModule = {
  title: string;
  /** One-line “about this module” shown on the course landing curriculum. */
  description?: string;
  items: CourseCurriculumItem[];
  subModules?: CourseCurriculumSubModule[];
};

/** Course-wide final examination (separate from per-module quiz rows in `curriculum`). */
export type CourseFinalExam = {
  title?: string;
  timedExam?: boolean;
  examDurationMinutes?: number;
  examUploadUrl?: string;
  /** Minimum percentage correct to pass (e.g. 70). */
  passingScorePercent?: number;
};

/** Editable hero + enroll card on `/courses/[slug]` (self-paced landing). */
export type ManagedCourseHeroSection = {
  /** Full-bleed hero background (falls back to course image). */
  backgroundImage?: string;
  /** Enroll card video thumbnail (falls back to course image). */
  previewImage?: string;
  previewLabel?: string;
  /** Shown as “(1,245 ratings)” — numbers only or full phrase. */
  ratingCount?: string;
  /** e.g. “23,455 students enrolled” (falls back to learners field). */
  studentsLabel?: string;
  lastUpdated?: string;
  language?: string;
  captions?: string;
  lectureCount?: string;
  projects?: string;
  certificate?: string;
  access?: string;
  shareable?: string;
  moneyBackGuarantee?: string;
  enrollButtonLabel?: string;
  wishlistButtonLabel?: string;
  /** Sidebar certificate thumbnail (e.g. /certificates/haccp-certificate-preview.jpg). */
  certificatePreviewImage?: string;
  certificatePreviewLabel?: string;
  /** Long “About this course” paragraph (hero / overview). */
  aboutText?: string;
  /** Sidebar “This course includes” — one line per item. */
  courseIncludes?: string[];
};

/** Instructor tab on self-paced landing (`/courses/[slug]` → Instructor). */
export type ManagedCourseInstructorSection = {
  headline?: string;
  introParagraphs?: string[];
  teamImage?: string;
  teamLabel?: string;
  pillars?: { title: string; description: string }[];
  expertise?: { title: string; subtitle?: string; tone?: string }[];
  trustQuote?: string;
  trustBadge?: string;
  sidebarInstructors?: { name: string; role: string; accent?: string }[];
};

/** Overview tab — before payment (`/courses/[slug]`). */
export type ManagedCourseOverviewSection = {
  aboutTitle?: string;
  youWillLearnTitle?: string;
  learnOutcomes?: string[];
  whatYouLearnTitle?: string;
  whatYouLearn?: { title: string; description: string }[];
  requirementsTitle?: string;
  requirements?: string[];
  faqSectionTitle?: string;
};

/** Course-wide materials shown in My Learning → Learning Tools (all modules). */
export type ManagedCourseLearningTools = {
  eWorkbookUrl?: string;
  transcriptUrl?: string;
  pptUrl?: string;
  podcastUrl?: string;
  webhookUrl?: string;
};

/** My Learning course player — after payment (`/my-learning/course/[slug]`). */
export type ManagedCourseLearningSection = {
  brandLogoUrl?: string;
  certifiedBadgeLabel?: string;
  accreditedBadgeLabel?: string;
  accreditedDescription?: string;
  certificationRuleText?: string;
  noVideoMessage?: string;
  learningToolsTitle?: string;
  learningToolsHint?: string;
  /** Shared tools for the whole course (not per lesson). */
  courseTools?: ManagedCourseLearningTools;
  bookmarkLabel?: string;
  markCompleteLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  notesTabLabel?: string;
  resourcesTabLabel?: string;
  saveNoteLabel?: string;
  resourcesEmptyMessage?: string;
  defaultLessonAbout?: string;
  defaultLessonDescription?: string;
  defaultLearningOutcomes?: string[];
  progressLabel?: string;
  quickToolsTitle?: string;
};

/** Reviews tab copy — before payment. */
export type ManagedCourseReviewsSectionConfig = {
  sectionTitle?: string;
  learnersLoveTitle?: string;
  highlyRatedItems?: string[];
  writeReviewTitle?: string;
  writeReviewSubtitle?: string;
  needHelpTitle?: string;
  needHelpText?: string;
  contactSupportLabel?: string;
};

/** Q&A tab copy — before payment. */
export type ManagedCourseQASectionConfig = {
  title?: string;
  subtitle?: string;
  askButtonLabel?: string;
  searchPlaceholder?: string;
  guidelinesTitle?: string;
  guidelines?: string[];
  needHelpTitle?: string;
  needHelpText?: string;
  contactSupportLabel?: string;
};

/** Landing page tab labels — before payment. */
export type ManagedCourseTabLabels = {
  overview?: string;
  curriculum?: string;
  instructor?: string;
  reviews?: string;
  qa?: string;
};

/** Per-country sale + list price — overrides global `price` / `oldPrice` for that region. */
export type CourseRegionalPriceRow = {
  countryCode: string;
  /** Standard / sale price. */
  price: string;
  /** Rack / list price (strikethrough). */
  oldPrice?: string;
  /** Internal floor for coupons / discounts. */
  basePrice?: string;
};

/** Organisation team purchase — price per country + employee seat band (admin Pricing tab). */
export type OrganizationSeatBandId = "1-10" | "11-20" | "21-30" | "31-40" | "41-50" | "51+";

export type OrganizationSeatBandPriceRow = {
  countryCode: string;
  bandId: OrganizationSeatBandId;
  price: string;
  oldPrice?: string;
};

export type ManagedCourse = {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  level: string;
  duration: string;
  rating: string;
  learners: string;
  price: string;
  oldPrice: string;
  /** Internal floor (Admin → Pricing “Base Price”). Coupons should not go below this. */
  basePrice?: string;
  /** Country-specific sale + list prices (ISO 3166-1 alpha-2). Falls back to global prices. */
  regionalPrices?: CourseRegionalPriceRow[];
  /** Organisation team pricing by region + seat band (individual `regionalPrices` unchanged). */
  organizationSeatPricing?: OrganizationSeatBandPriceRow[];
  image: string;
  published: boolean;
  /** Defaults to self-paced when omitted (legacy rows). */
  learningFormat?: CourseLearningFormat;
  /** Primary instructor — filter curriculum editor & optional marketing copy. */
  instructorName?: string;
  /** When present, public `/courses/[slug]` Course content tab uses this instead of templates. */
  curriculum?: CourseCurriculumModule[];
  /** Final certification exam metadata for learners (upload, timer, passing score). */
  finalExam?: CourseFinalExam;
  /** Hero + right-side enroll card — edit in Admin → Self-paced courses → Course Info. */
  hero?: ManagedCourseHeroSection;
  /** Public `/courses/[slug]` marketing — optional; sensible defaults are generated when omitted. */
  pageBadge?: string;
  /** Bullet list on the course detail page (self-paced layout). */
  highlights?: string[];
  /** FAQ entries for the course detail page. */
  faqs?: { q: string; a: string }[];
  trainerRole?: string;
  trainerExperience?: string;
  trainerBio?: string;
  trainerCertifications?: string[];
  trainerWorkedWith?: string[];
  /** Instructor tab layout — experts, pillars, sidebar grid (Admin → Self-paced courses). */
  instructorSection?: ManagedCourseInstructorSection;
  /** Overview tab — headings, outcomes, requirements (before payment). */
  overviewSection?: ManagedCourseOverviewSection;
  /** Reviews tab — titles and sidebar copy (before payment). */
  reviewsSection?: ManagedCourseReviewsSectionConfig;
  /** Q&A tab — titles, guidelines, support copy (before payment). */
  qaSection?: ManagedCourseQASectionConfig;
  /** Tab navigation labels on public landing (before payment). */
  tabLabels?: ManagedCourseTabLabels;
  /** My Learning player — logos, labels, defaults (after payment). */
  learningSection?: ManagedCourseLearningSection;
  /** Per-course certificate, badge, transcript samples + workflow flags. */
  certificateConfig?: ManagedCourseCertificateConfig;
  /** Catalog visibility, enrollment, learner features (Admin → Settings). */
  settings?: ManagedCourseSettings;
  /** Search & social sharing (Admin → SEO). */
  seo?: ManagedCourseSeo;
};

/** Learner-facing course options — edited under Admin → Settings. */
export type ManagedCourseSettings = {
  /** Show on /courses and home grids (still requires Published). Default true. */
  showInCatalog?: boolean;
  /** Allow new enrollments / add to cart. Default true. */
  enrollmentOpen?: boolean;
  /** Show Q&A tab on course landing. Default true. */
  allowQa?: boolean;
  /** Highlight on marketing sections. */
  featured?: boolean;
  /** e.g. Lifetime, 12 months — shown in hero if hero.access empty. */
  accessLabel?: string;
};

/** Google / social metadata — edited under Admin → SEO. */
export type ManagedCourseSeo = {
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  ogImage?: string;
  /** Hide from search engines when true. */
  noIndex?: boolean;
};

export type CategoryTone = "violet" | "blue" | "emerald" | "amber";

export type ManagedCategory = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
  isUppercase: boolean;
  isBold: boolean;
  tone: CategoryTone;
  /** Card / listing image on home & explore (URL or /uploads/...). */
  image?: string;
};

export type CategoryWhyTone = "amber" | "emerald" | "blue" | "violet";

export type CategoryPageInstructor = {
  name: string;
  role: string;
  years: string;
  photo: string;
};

export type CategoryPageWhyItem = {
  label: string;
  desc: string;
  tone: CategoryWhyTone;
  /** Lucide icon export name, e.g. `ShieldCheck`, `GraduationCap`, or legacy `award` / `scroll-text`. */
  icon: string;
  /** Short quote or tagline shown under the description on the category page */
  quote?: string;
};

export type CategoryPageLevelFilter = {
  value: string;
  label: string;
};

/** Admin overrides for `/courses/category/[slug]` (courses visibility, copy, filters, instructors). */
export type CategoryPageEditorConfig = {
  /** Hero background image URL or site path (e.g. /uploads/admin/...). Empty in saved JSON means “use built‑in default for slug”. */
  heroImage: string;
  /** When non-empty, replaces hero paragraph under the title */
  heroSubtitle: string;
  hiddenCourseSlugs: string[];
  instructors: CategoryPageInstructor[];
  levelFilters: CategoryPageLevelFilter[];
  whyLearn: CategoryPageWhyItem[];
};

export type CoursesPageHero = {
  badgeText: string;
  title: string;
  highlightWord: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  backgroundImage: string;
};

export type CoursesPageTutorLed = {
  date: string;
  title: string;
  time: string;
};

export type CoursesPageRecentUpdate = {
  title: string;
  subtitle: string;
  href: string;
  image: string;
};

export type CoursesPageUpcoming = {
  title: string;
  time: string;
  iconColor: "rose" | "sky" | "violet" | "emerald" | "amber" | "blue";
};

export type CoursesPageExpert = {
  name: string;
  photo: string;
};

export type CoursesPageFaq = {
  question: string;
  /** Shown on /faq and courses page when set. */
  answer?: string;
};

export type CoursesPageCta = {
  heading: string;
  description: string;
  buttonText: string;
  image: string;
};

export type CoursesPageConfig = {
  hero: CoursesPageHero;
  tutorLed: CoursesPageTutorLed[];
  recentUpdates: CoursesPageRecentUpdate[];
  upcomingItems: CoursesPageUpcoming[];
  featuredDescription: string;
  featuredExperts: CoursesPageExpert[];
  faqs: CoursesPageFaq[];
  cta: CoursesPageCta;
  coursesPerRow: number;
  defaultVisibleCourses: number;
};

export const defaultCoursesPageConfig: CoursesPageConfig = {
  hero: {
    badgeText: "NEW PROGRAM",
    title: "Advanced {highlight} Professional",
    highlightWord: "Cyber Security",
    subtitle: "Master the skills to protect systems, detect threats, and respond like a pro.",
    ctaPrimary: "Explore Program",
    ctaSecondary: "View Details",
    backgroundImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80",
  },
  tutorLed: [
    { date: "MAY 24", title: "Introduction to IoT Security", time: "10:00 AM - 11:30 AM" },
    { date: "MAY 25", title: "Web Application Penetration Testing", time: "02:00 PM - 03:30 PM" },
    { date: "MAY 26", title: "Network Security Fundamentals", time: "11:00 AM - 12:30 PM" },
  ],
  recentUpdates: [
    { title: "ESG Fundamentals - New Cohort Open", subtitle: "Related Course", href: "/courses/esg-reporting-fundamentals", image: "/p3.png" },
    { title: "Tutor-Led Cyber Security Live Training Slots Open", subtitle: "Live Training", href: "/tutor-led/advanced-cyber-security-professional", image: "/p2.png" },
    { title: "HVAC Live Workshop Added with Practical Case Study", subtitle: "Live Workshop", href: "/my-learning?tab=live&type=workshop", image: "/p8.png" },
  ],
  upcomingItems: [
    { title: "Live Workshop: Incident Response", time: "10:00 AM - 12:00 PM", iconColor: "rose" },
    { title: "New Course Launch: AI for Business", time: "Launching soon", iconColor: "sky" },
    { title: "Webinar: Future of Work", time: "11:00 AM - 12:30 PM", iconColor: "violet" },
  ],
  featuredDescription: "Explore our most in-demand training programs carefully curated by industry experts to help professionals build practical skills, gain recognized certifications, and stay ahead in rapidly evolving industries. Learn through interactive modules, tutor-led sessions, real-world case studies, and hands-on learning experiences designed for career growth and professional success.",
  featuredExperts: [
    { name: "Amit Verma", photo: "https://randomuser.me/api/portraits/men/32.jpg" },
    { name: "Sneha Patel", photo: "https://randomuser.me/api/portraits/women/44.jpg" },
    { name: "Rahul Sharma", photo: "https://randomuser.me/api/portraits/men/52.jpg" },
    { name: "Priya Nair", photo: "https://randomuser.me/api/portraits/women/68.jpg" },
  ],
  faqs: [
    {
      question: "Are these courses industry-recognized?",
      answer:
        "Yes. Our programs align with industry standards and many include accreditation or certification from recognized bodies.",
    },
    {
      question: "Can I switch my learning plan anytime?",
      answer:
        "Individual plans can be changed or cancelled according to your subscription terms. Contact support for team plans.",
    },
    {
      question: "Do I get certificates after course completion?",
      answer:
        "Eligible courses issue digital certificates after you complete required modules and assessments.",
    },
  ],
  cta: {
    heading: "Ready to Start Your Learning Journey?",
    description: "Choose a path, build practical capabilities, and earn credentials that matter.",
    buttonText: "Get Started Now",
    image: "/Untitled (Label).png",
  },
  coursesPerRow: 5,
  defaultVisibleCourses: 5,
};

/* ─── Tutor-led catalog landing (`/tutor-led`) ─── */

export type TutorLedCatalogTheme = "emerald" | "sky" | "violet" | "gold";

export type TutorLedCatalogHeroChip = {
  icon: string;
  label: string;
};

export type TutorLedCatalogHero = {
  eyebrow: string;
  heading: string;
  headingHighlight: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  chips: TutorLedCatalogHeroChip[];
  asideQuote: string;
  certCardTitle: string;
  certCardSubtitle: string;
  certCardQuote: string;
  certCardAttribution: string;
  backgroundImage: string;
  backgroundAlt: string;
};

export type TutorLedCatalogProgramCard = {
  id: string;
  title: string;
  tagline: string;
  bullets: string[];
  price: number;
  popular?: boolean;
  theme: TutorLedCatalogTheme;
  /** Lucide export name, e. g. ShieldCheck */
  icon: string;
  /** Optional card thumbnail (shown above title when set). */
  thumbnail: string;
  /** Prefer linking enroll to this published tutor-led slug when set. */
  enrollSlug: string;
  /** Fallback title/slug match when enrollSlug is empty (e.g. basic|foundation). */
  matchPattern: string;
  durationLabel: string;
  modeLabel: string;
  certificateLabel: string;
};

export type TutorLedCatalogWhyItem = {
  icon: string;
  title: string;
  desc: string;
};

export type TutorLedCatalogAudienceItem = {
  icon: string;
  label: string;
};

export type TutorLedCatalogBatchRow = {
  date: string;
  time: string;
  programId: string;
  programLabel: string;
  seats: number;
};

export type TutorLedCatalogPageConfig = {
  /** Optional OG / share thumbnail for the catalog page. */
  pageThumbnail: string;
  hero: TutorLedCatalogHero;
  programsSection: {
    title: string;
    subtitle: string;
  };
  programs: TutorLedCatalogProgramCard[];
  why: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    items: TutorLedCatalogWhyItem[];
  };
  audience: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: TutorLedCatalogAudienceItem[];
    investTitle: string;
    investBody: string;
    investImage: string;
    investImageAlt: string;
  };
  batches: {
    eyebrow: string;
    viewAllLabel: string;
    viewAllHref: string;
    rows: TutorLedCatalogBatchRow[];
  };
  trainer: {
    eyebrow: string;
    viewAllLabel: string;
    viewAllHref: string;
    name: string;
    role: string;
    experience: string;
    bio: string;
    photo: string;
    photoAlt: string;
  };
  faqsSection: {
    eyebrow: string;
    viewAllLabel: string;
    viewAllHref: string;
  };
  faqs: { q: string; a: string }[];
  cta: {
    heading: string;
    description: string;
    buttonText: string;
    buttonHref: string;
  };
};

export const defaultTutorLedCatalogPageConfig: TutorLedCatalogPageConfig = {
  pageThumbnail: "/tutor-led-iso-hero.png",
  hero: {
    eyebrow: "Food Safety · Global Careers · Brighter Future",
    heading: "ISO 22000:2018",
    headingHighlight: "Training Programs",
    subtitle:
      "Build your expertise in Food Safety Management Systems with industry-led training programs designed for real-world application, live coaching, and globally recognized certification.",
    ctaText: "Explore Training Programs",
    ctaHref: "#programs",
    chips: [
      { icon: "Video", label: "Live Interactive Sessions" },
      { icon: "Mic2", label: "Expert Industry Trainers" },
      { icon: "ClipboardCheck", label: "Real-World Case Studies" },
      { icon: "Award", label: "Globally Recognized Certification" },
    ],
    asideQuote: "Better Food, Safer People, Sustainable Tomorrow.",
    certCardTitle: "Get Certified",
    certCardSubtitle: "Build Your Career. Make an Impact.",
    certCardQuote: "“Food safety is everyone’s business.”",
    certCardAttribution: "— A Safer World Starts with You",
    backgroundImage: "/tutor-led-iso-hero.png",
    backgroundAlt: "Food safety professional inspecting produce with a tablet",
  },
  programsSection: {
    title: "Choose Your ISO 22000:2018 Training Level",
    subtitle:
      "Four specialized live online programs — from fundamentals to leading audit teams. Same standard, different goals, a brighter tomorrow.",
  },
  programs: [
    {
      id: "basic",
      title: "Basic (Foundation)",
      tagline: "Learn Food Safety Fundamentals",
      bullets: [
        "Understand key concepts of ISO 22000:2018",
        "Industry overview & food safety principles",
        "Core FSMS requirements explained simply",
        "Certificate of completion included",
      ],
      price: 9999,
      theme: "emerald",
      icon: "ShieldCheck",
      thumbnail: "",
      enrollSlug: "iso-22000-basic",
      matchPattern: "basic|foundation",
      durationLabel: "Duration: 5 Days",
      modeLabel: "Mode: Live Online",
      certificateLabel: "Certificate Included",
    },
    {
      id: "implementation",
      title: "Implementation",
      tagline: "Implement Food Safety Systems",
      bullets: [
        "Implementation methodology step-by-step",
        "Documentation & procedure writing",
        "Risk assessment & hazard control",
        "Practical implementation workshops",
      ],
      price: 14999,
      theme: "sky",
      icon: "FileText",
      thumbnail: "",
      enrollSlug: "iso-22000-implementation",
      matchPattern: "implementation",
      durationLabel: "Duration: 5 Days",
      modeLabel: "Mode: Live Online",
      certificateLabel: "Certificate Included",
    },
    {
      id: "internal-auditor",
      title: "Internal Auditor",
      tagline: "Conduct Internal Audits",
      bullets: [
        "Audit planning & checklist preparation",
        "Non-conformity identification & reporting",
        "Interview & evidence techniques",
        "Practical internal audit exercises",
      ],
      price: 19999,
      theme: "violet",
      icon: "Search",
      thumbnail: "",
      enrollSlug: "iso-22000-internal-auditor",
      matchPattern: "internal\\s*auditor",
      durationLabel: "Duration: 5 Days",
      modeLabel: "Mode: Live Online",
      certificateLabel: "Certificate Included",
    },
    {
      id: "lead-auditor",
      title: "Lead Auditor",
      tagline: "Lead Audit Teams",
      bullets: [
        "Lead audit teams with confidence",
        "Advanced audit techniques & reporting",
        "Regulatory & certification perspectives",
        "Lead Auditor certification pathway",
      ],
      price: 29999,
      popular: true,
      theme: "gold",
      icon: "Trophy",
      thumbnail: "",
      enrollSlug: "iso-22000-lead-auditor",
      matchPattern: "lead\\s*auditor|iso-22000-lead",
      durationLabel: "Duration: 5 Days",
      modeLabel: "Mode: Live Online",
      certificateLabel: "Certificate Included",
    },
  ],
  why: {
    eyebrow: "Why Train With Us",
    titleLine1: "More Than Just Training",
    titleLine2: "A Brighter, Safer Future",
    items: [
      {
        icon: "Video",
        title: "Live Instructor-Led Sessions",
        desc: "Interact, ask questions and learn in real-time.",
      },
      {
        icon: "Mic2",
        title: "Expert Trainers",
        desc: "Learn from industry professionals.",
      },
      {
        icon: "ClipboardCheck",
        title: "Practical Case Studies",
        desc: "Real-world scenarios and exercises.",
      },
      {
        icon: "Award",
        title: "Globally Recognized Certificate",
        desc: "Boost your career globally.",
      },
      {
        icon: "Headphones",
        title: "Post-Training Support",
        desc: "Continued guidance even after course completion.",
      },
    ],
  },
  audience: {
    eyebrow: "Who Should Attend",
    title: "Designed for a Wide Range of Professionals",
    subtitle: "Our ISO 22000:2018 training programs are ideal for:",
    items: [
      { icon: "Building2", label: "Food Industry Professionals" },
      { icon: "ShieldCheck", label: "Quality & Food Safety Managers" },
      { icon: "ClipboardCheck", label: "Internal Auditors" },
      { icon: "Briefcase", label: "Consultants" },
      { icon: "GraduationCap", label: "Students & Fresh Graduates" },
      { icon: "Users", label: "Regulatory Professionals" },
      { icon: "BookOpen", label: "Anyone Interested in Food Safety" },
    ],
    investTitle: "Invest in Knowledge.\nInvest in a Safer Tomorrow.",
    investBody:
      "Be part of a global movement towards safer food, healthier communities and a sustainable future.",
    investImage: "/tutor-led-invest-knowledge.png",
    investImageAlt: "Seedling growing from the Earth",
  },
  batches: {
    eyebrow: "Upcoming Batches",
    viewAllLabel: "View All Batches →",
    viewAllHref: "#programs",
    rows: [
      {
        date: "11 Sept 2026",
        time: "10:00 AM – 5:00 PM",
        programId: "lead-auditor",
        programLabel: "Lead Auditor",
        seats: 13,
      },
      {
        date: "25 Sept 2026",
        time: "10:00 AM – 5:00 PM",
        programId: "internal-auditor",
        programLabel: "Internal Auditor",
        seats: 18,
      },
      {
        date: "12 Oct 2026",
        time: "10:00 AM – 5:00 PM",
        programId: "implementation",
        programLabel: "Implementation",
        seats: 22,
      },
      {
        date: "28 Oct 2026",
        time: "10:00 AM – 5:00 PM",
        programId: "basic",
        programLabel: "Basic",
        seats: 25,
      },
    ],
  },
  trainer: {
    eyebrow: "Meet Our Expert Trainer",
    viewAllLabel: "View All Trainers →",
    viewAllHref: "/about",
    name: "Mr. Rajesh Kumar",
    role: "Food Safety Expert",
    experience: "15+ Years Experience",
    bio: "Seasoned food safety professional with 15+ years of experience in ISO 22000 implementation, HACCP, FSSC frameworks, and audit leadership. Rajesh has trained quality teams and auditors across manufacturing and food service to build audit-ready systems.",
    photo: "/tutor-led-rajesh-kumar.png",
    photoAlt: "Mr. Rajesh Kumar",
  },
  faqsSection: {
    eyebrow: "Frequently Asked Questions",
    viewAllLabel: "View All FAQs →",
    viewAllHref: "#programs",
  },
  faqs: [
    {
      q: "What is ISO 22000:2018?",
      a: "ISO 22000:2018 is the international standard for Food Safety Management Systems (FSMS). It helps organizations identify, control, and manage food safety hazards across the food chain.",
    },
    {
      q: "Are the sessions live or recorded?",
      a: "All sessions are live and interactive on Zoom. Recordings are shared afterward so you can revise at your own pace.",
    },
    {
      q: "Will I get a certificate?",
      a: "Yes. On successful completion you receive a verifiable Certificate of Attainment from Sustainable Futuristic Trainings.",
    },
    {
      q: "Who should join these programs?",
      a: "Food industry professionals, quality managers, auditors, consultants, students, and anyone building a career in food safety.",
    },
    {
      q: "What is the duration of each program?",
      a: "Each ISO 22000:2018 level is delivered as a 5-day live online program (timings shown in Upcoming Batches).",
    },
    {
      q: "Can my company enroll a team?",
      a: "Yes. Contact us for corporate cohorts and group pricing — we run dedicated batches for organizations.",
    },
  ],
  cta: {
    heading: "Take the Next Step in Your Food Safety Career",
    description:
      "Choose your training program today and be part of a safer, more sustainable food future.",
    buttonText: "View All Training Programs",
    buttonHref: "#programs",
  },
};

export function mergeTutorLedCatalogPageConfig(
  raw?: Partial<TutorLedCatalogPageConfig> | null,
): TutorLedCatalogPageConfig {
  const d = defaultTutorLedCatalogPageConfig;
  if (!raw || typeof raw !== "object") return structuredClone(d);
  const programs = Array.isArray(raw.programs) ? raw.programs : d.programs;
  const enrollById: Record<string, string> = {
    basic: "iso-22000-basic",
    implementation: "iso-22000-implementation",
    "internal-auditor": "iso-22000-internal-auditor",
    "lead-auditor": "iso-22000-lead-auditor",
  };
  return {
    ...d,
    ...raw,
    pageThumbnail: typeof raw.pageThumbnail === "string" ? raw.pageThumbnail : d.pageThumbnail,
    hero: { ...d.hero, ...(raw.hero ?? {}), chips: Array.isArray(raw.hero?.chips) ? raw.hero!.chips : d.hero.chips },
    programsSection: { ...d.programsSection, ...(raw.programsSection ?? {}) },
    programs: programs.map((p) => ({
      ...p,
      enrollSlug: p.enrollSlug?.trim() || enrollById[p.id] || "",
    })),
    why: {
      ...d.why,
      ...(raw.why ?? {}),
      items: Array.isArray(raw.why?.items) ? raw.why!.items : d.why.items,
    },
    audience: {
      ...d.audience,
      ...(raw.audience ?? {}),
      items: Array.isArray(raw.audience?.items) ? raw.audience!.items : d.audience.items,
    },
    batches: {
      ...d.batches,
      ...(raw.batches ?? {}),
      rows: Array.isArray(raw.batches?.rows) ? raw.batches!.rows : d.batches.rows,
    },
    trainer: { ...d.trainer, ...(raw.trainer ?? {}) },
    faqsSection: { ...d.faqsSection, ...(raw.faqsSection ?? {}) },
    faqs: Array.isArray(raw.faqs) ? raw.faqs : d.faqs,
    cta: { ...d.cta, ...(raw.cta ?? {}) },
  };
}

/* ─── Home Page Config Types ─── */

export type HomePageHero = {
  heading: string;
  headingHighlight: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  videoUrl: string;
};

export type HomePageStat = {
  value: string;
  label: string;
};

export type HomePageLearningPath = {
  id: string;
  title: string;
  desc: string;
  keyPoints: string[];
  cta: string;
  imageSrc: string;
};

export type HomePageWhyFeature = {
  title: string;
  desc: string;
  icon: string;
};

export type HomePageTestimonial = {
  quote: string;
  name: string;
  role: string;
  /** Short course/program name shown as a credibility badge on the card. */
  courseBadge?: string;
  /** Client / learner photo URL (shown on home, /testimonials). */
  photo?: string;
};

export type HomePagePlan = {
  badge: string;
  tagline: string;
  desc: string;
  price: string;
  note: string;
  features: string[];
  cta: string;
};

export type HomePageOrgPlan = {
  title: string;
  tagline: string;
  desc: string;
  price: string;
  note: string;
  features: string[];
  cta: string;
};

export type HomePageFaq = {
  q: string;
  a: string;
};

export type HomePageSectionMeta = {
  badge: string;
  title: string;
  subtitle: string;
};

export type HomePageNewsletter = {
  heading: string;
  subtitle: string;
  buttonText: string;
};

export type HomePageUnlock = {
  heading: string;
  subtitle: string;
  cta: string;
  image: string;
};

export type HomePageConfig = {
  hero: HomePageHero;
  stats: HomePageStat[];
  learningPaths: HomePageLearningPath[];
  whyFeatures: HomePageWhyFeature[];
  testimonials: HomePageTestimonial[];
  individualPlans: HomePagePlan[];
  orgPlan: HomePageOrgPlan;
  faqs: HomePageFaq[];
  newsletter: HomePageNewsletter;
  unlock: HomePageUnlock;
  accreditationLogos: string[];
  exploreProgramImages: string[];
  /** Avatar shown beside the home page FAQ accordion. */
  faqImage: string;
  /** Dedicated /faq page copy (also used on contact page FAQ block). */
  faqPage: HomePageSectionMeta;
  /** Dedicated /testimonials page copy (home page section uses same testimonial list). */
  testimonialsPage: HomePageSectionMeta;
};

export const defaultHomePageConfig: HomePageConfig = {
  hero: {
    heading: "Future-Ready Learning",
    headingHighlight: "For Ambitious Professionals",
    subtitle: "Experience next-generation learning with Sustainable Futures Training. Develop practical, industry-relevant skills through expert-led courses, interactive workshops, and globally aligned certifications designed to prepare professionals for real-world success.",
    ctaPrimary: "Start Learning",
    ctaSecondary: "Join Live Workshop",
    videoUrl: "",
  },
  stats: [
    { value: "95%", label: "Learner Satisfaction Rate" },
    { value: "170+", label: "Industry-Aligned Programs" },
    { value: "50+", label: "Expert Trainers" },
    { value: "10K+", label: "Active Learners" },
    { value: "24/7", label: "Learning Access" },
  ],
  learningPaths: [
    {
      id: "self-paced",
      title: "Self-Paced / E-Learning",
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
      id: "onsite",
      title: "Tutor Led Onsite Trainings Courses",
      desc: "Classroom and onsite instructor-led programs delivered at your workplace or a training venue, with hands-on practice and guided group learning.",
      keyPoints: [
        "Face-to-face training with certified industry trainers",
        "Onsite delivery at your organization or a scheduled venue",
        "Hands-on exercises, group discussions & case studies",
        "Printed and digital study materials for each session",
        "In-class assessments and practical evaluations",
        "Certification upon successful completion",
      ],
      cta: "View onsite trainings",
      imageSrc: "/c4.png",
    },
    {
      id: "live",
      title: "LIVE Workshops",
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
  ],
  whyFeatures: [
    { title: "Expert Trainers", desc: "Learn from industry leaders with real-world experience across sectors.", icon: "Users" },
    { title: "Quality Training Material", desc: "High-quality, up-to-date content designed for measurable outcomes.", icon: "BookOpen" },
    { title: "Flexible Learning", desc: "Study at your own pace with schedules that fit working professionals.", icon: "Clock" },
    { title: "Certification Upon Completion", desc: "Earn recognized certificates that support your career progression.", icon: "Award" },
    { title: "Tutor-Led Sessions", desc: "Engage in tutor-led workshops, expert-led discussions, and real-time doubt-solving sessions.", icon: "MonitorPlay" },
    { title: "Progress Tracking & Assessments", desc: "Monitor your learning journey with module-wise assessments, exams, and performance insights.", icon: "CheckCircle2" },
  ],
  testimonials: [],
  individualPlans: [
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
  ],
  orgPlan: {
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
  },
  faqs: [
    { q: "What is Sustainable Futures Trainings?", a: "Sustainable Futures Trainings is a professional learning platform offering industry-focused courses, live workshops, tutor-led training, and certification programs for individuals and organizations." },
    { q: "What types of learning programs do you offer?", a: "We provide self-paced courses, tutor-led live training, interactive workshops, corporate training, and certification-focused learning programs." },
    { q: "Are the courses completely online?", a: "Yes, all courses, tutor-led sessions, workshops, and assessments are accessible online through our learning platform." },
    { q: "Will I receive a certificate after course completion?", a: "Yes, certificates are issued upon successful completion of course modules, assessments, and program requirements." },
    { q: "Can organizations train their employees through Sustainable Futures Trainings?", a: "Yes, we provide corporate learning solutions, workforce upskilling programs, and centralized team management features." },
  ],
  newsletter: {
    heading: "Subscribe to Our Newsletter",
    subtitle: "Enter your email to receive course launches, workshop dates, and training updates.",
    buttonText: "Subscribe",
  },
  unlock: {
    heading: "Unlock Your Full Potential",
    subtitle: "Join thousands of professionals who have transformed their careers through our industry-aligned training programs.",
    cta: "Get Started Today",
    image: "/q.png",
  },
  accreditationLogos: ["/e1.png", "/e2.png", "/e3.png", "/e4.png"],
  exploreProgramImages: ["/p1.png", "/p2.png", "/p3.png", "/p4.jpg", "/p5.png", "/p6.png", "/p7.png", "/p8.png"],
  faqImage:
    "https://res.cloudinary.com/dwnnakrrh/image/upload/v1779337638/Untitled_design_1_zdyxfv.png",
  faqPage: {
    badge: "FAQ",
    title: "Frequently Asked Questions",
    subtitle: "Find quick answers to common questions about programs, enrollment, and certificates.",
  },
  testimonialsPage: {
    badge: "What Our Learners Say",
    title: "What Our Learners Say",
    subtitle: "Real experiences from professionals who have advanced their skills with our training programs.",
  },
};

/* ─── About Page Config Types ─── */

export type AboutPageHero = {
  badge: string;
  heading: string;
  headingHighlight: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  heroImage: string;
};

export type AboutPageHighlight = {
  label: string;
  value: string;
};

export type AboutPagePillar = {
  title: string;
  desc: string;
};

export type AboutPageMission = {
  heading: string;
  headingHighlight: string;
  body: string;
  body2: string;
};

export type AboutPageTechPoint = string;

export type AboutPageFeature = {
  title: string;
  desc: string;
};

export type AboutPageTeamMember = {
  name: string;
  role: string;
  photo: string;
};

export type AboutPageTeamLevel = {
  level: string;
  members: AboutPageTeamMember[];
};

export type AboutPageAccreditation = {
  title: string;
  subtitle: string;
  desc: string;
  logo: string;
};

export type AboutPageImpactStat = {
  value: string;
  label: string;
};

export type AboutPageTestimonial = string;

export type AboutPageCta = {
  heading: string;
  subtitle: string;
  buttonText: string;
};

export type AboutPageWhoWeAre = {
  badge: string;
  heading: string;
  headingHighlight: string;
  subtitle: string;
  bulletPoints: string[];
  backgroundImage: string;
};

export type AboutPageConfig = {
  hero: AboutPageHero;
  highlights: AboutPageHighlight[];
  whoWeAre: AboutPageWhoWeAre;
  pillars: AboutPagePillar[];
  mission: AboutPageMission;
  techPoints: AboutPageTechPoint[];
  features: AboutPageFeature[];
  teamHierarchy: AboutPageTeamLevel[];
  accreditations: AboutPageAccreditation[];
  impactStats: AboutPageImpactStat[];
  testimonials: AboutPageTestimonial[];
  cta: AboutPageCta;
};

export const defaultAboutPageConfig: AboutPageConfig = {
  hero: {
    badge: "ABOUT SUSTAINABLE FUTURES TRAININGS",
    heading: "Empowering People.",
    headingHighlight: "Building Futures.",
    subtitle: "Sustainable Futures Trainings is a next-generation learning platform dedicated to helping individuals and organizations unlock potential through practical, certification-ready programs.",
    ctaPrimary: "Explore Courses",
    ctaSecondary: "Our Journey",
    heroImage: "/Gemini_Generated_Image_mvf5i9mvf5i9mvf5.png",
  },
  highlights: [
    { label: "Active Learners", value: "10,000+" },
    { label: "Expert Trainers", value: "200+" },
    { label: "Courses & Workshops", value: "500+" },
    { label: "Companies Connected", value: "75+" },
  ],
  whoWeAre: {
    badge: "WHO WE ARE",
    heading: "More Than Learning.",
    headingHighlight: "We Build Careers.",
    subtitle: "We bridge the gap between academic knowledge and real-world application. Our programs are designed by industry experts to ensure you gain practical skills that employers value.",
    bulletPoints: [
      "Industry-relevant curriculum",
      "Hands-on projects & real-world case studies",
      "Live interactive sessions with experts",
      "Certification & career support",
    ],
    backgroundImage: "/op.png",
  },
  pillars: [
    { title: "Our Mission", desc: "To empower learners with practical, industry-ready skills through innovative and accessible education." },
    { title: "Our Vision", desc: "To become a globally trusted learning platform for professionals and organizations." },
  ],
  mission: {
    heading: "To",
    headingHighlight: "Safeguard Your Future",
    body: "At Sustainable Futures Trainings, we embed compliance and quality assurance into your organization's processes and culture through our training. Across the world, our clients rely on us to increase transparency, relevance, safety, and value in the offerings they take to market.",
    body2: "Our training and assurance programs help ensure that your people, processes, and technologies continue to perform at the highest level expected by all stakeholders.",
  },
  techPoints: [
    "Learning by Doing experiences with live scenario-based environments.",
    "Collaborations with advanced platforms where teams develop and implement practical solutions.",
    "Dedicated pool of trained facilitators to strengthen candidate skills in live settings.",
    "Continuous support from education specialists to improve workshop engagement quality.",
    "Proven impact through repeat client orders, strong outcomes, and participant references.",
  ],
  features: [
    { title: "Industry Focused", desc: "Curriculum aligned to current job roles and standards." },
    { title: "Live Learning", desc: "Real-time sessions and guided practice workshops." },
    { title: "Hands-on Practice", desc: "Case studies and practical assignments for real outcomes." },
    { title: "Career Support", desc: "Support on job readiness, portfolio, and interviews." },
    { title: "Flexible Format", desc: "Learn at your pace with self-paced and live options." },
  ],
  teamHierarchy: [
    { level: "Vice President", members: [{ name: "Ritika Sharma", role: "", photo: "" }] },
    { level: "Team Leads", members: [{ name: "Amit Verma", role: "Cyber Security Lead", photo: "" }, { name: "Sneha Patel", role: "Data & Analytics Lead", photo: "" }] },
    { level: "Team Coordinators", members: [{ name: "Rahul Sharma", role: "Program Coordination", photo: "" }, { name: "Priya Nair", role: "Learner Success Coordination", photo: "" }] },
    { level: "Domain Experts", members: [{ name: "Vikram Singh", role: "AI & ML", photo: "" }, { name: "Karan Malhotra", role: "ISO & Compliance", photo: "" }, { name: "Neha Kapoor", role: "ESG & Sustainability", photo: "" }, { name: "Mohit Arora", role: "Food Safety & Auditing", photo: "" }] },
  ],
  accreditations: [
    { title: "Exemplar Global", subtitle: "RTP Certified Training", desc: "Adhering to international standards for quality and excellence in training.", logo: "/e1.png" },
    { title: "International Education Board", subtitle: "Global Educational Standards", desc: "Committed to promoting discipline, excellence, and quality education.", logo: "/e2.png" },
    { title: "IMARIE Global", subtitle: "RTP Certified Training", desc: "Recognized for delivering reliable and industry-relevant training programs.", logo: "/e3.png" },
    { title: "Blue Thread Initiative", subtitle: "Environmental Responsibility", desc: "Supporting sustainability and ocean conservation for a better tomorrow.", logo: "/e4.png" },
  ],
  impactStats: [
    { value: "10,000+", label: "Learners Empowered" },
    { value: "200+", label: "Expert Trainers" },
    { value: "500+", label: "Courses & Workshops" },
    { value: "50+", label: "Corporate Clients" },
    { value: "25+", label: "Countries Reached" },
  ],
  testimonials: [
    "The tutor-led sessions are practical and directly useful in my daily work.",
    "Structured modules and projects helped me get promoted faster.",
    "Best platform for working professionals who need flexible learning.",
  ],
  cta: {
    heading: "Ready to Start Your Learning Journey?",
    subtitle: "Join thousands of learners and take the next step toward your dream career.",
    buttonText: "Explore Courses",
  },
};

/** Shared certificate / badge / transcript templates — Admin → Users & Access → Certificates only. */
export type GlobalCertificateAssets = {
  templateImage?: string;
  badgeImage?: string;
  transcriptFile?: string;
};

export type { OrganizationTeamAdminConfig };

export type PromotionStatus = "active" | "disabled";
export type PromotionDiscountKind = "percent" | "fixed";
export type CouponCourseScope = "all" | "course";
export type ReferralRewardKind = "percent" | "fixed";

export type AdminCoupon = {
  id: string;
  code: string;
  discountKind: PromotionDiscountKind;
  amount: number;
  /** ISO currency for fixed discounts (e.g. INR for ₹50 OFF). */
  currency?: string;
  courseScope: CouponCourseScope;
  courseSlug?: string;
  uses: number;
  maxUses: number;
  validFrom: string;
  validTo: string;
  status: PromotionStatus;
  allowBelowBase?: boolean;
};

export type AdminReferralCode = {
  id: string;
  code: string;
  customerDiscountKind: PromotionDiscountKind;
  customerDiscountAmount: number;
  customerDiscountCurrency?: string;
  rewardKind: ReferralRewardKind;
  rewardAmount: number;
  rewardCurrency?: string;
  uses: number;
  status: PromotionStatus;
};

export type PromotionsConfig = {
  coupons: AdminCoupon[];
  referrals: AdminReferralCode[];
};

export type AdminContent = {
  dashboard: DashboardContent;
  /** Organisation premium tiers, seat limits, invite/assign rules — Admin → Organization Team */
  organizationTeam?: OrganizationTeamAdminConfig;
  learningCourses: LearningCourseItem[];
  managedCourses: ManagedCourse[];
  /** Slugs removed from admin — GET must not hydrate these back from MySQL. */
  deletedCourseSlugs?: string[];
  /** Coupons + referral codes (Admin → Self-paced → Pricing). */
  promotions?: PromotionsConfig;
  /** Default certificate assets when a course/program has no per-item upload. */
  globalCertificateAssets?: GlobalCertificateAssets;
  /** Live Zoom-style programs for `/tutor-led/[slug]` — edited under Admin → Tutor Led. */
  tutorLedPrograms: TutorLedProgramStored[];
  categories: ManagedCategory[];
  categoryPages: Partial<Record<string, Partial<CategoryPageEditorConfig>>>;
  coursesPage?: CoursesPageConfig;
  homePage?: HomePageConfig;
  aboutPage?: AboutPageConfig;
  /** Public `/tutor-led` ISO catalog landing — Admin → Tutor-Led Landing. */
  tutorLedCatalogPage?: TutorLedCatalogPageConfig;
};

export const defaultAdminContent: AdminContent = {
  dashboard: {
    nextClassTitle: "",
    nextClassTime: "",
    streakDays: 0,
    calendarReminders: [],
  },
  organizationTeam: defaultOrganizationTeamAdminConfig,
  learningCourses: [],
  managedCourses: [
    {
      slug: "food-safety-masterclass",
      title: "Diploma in HACCP Food Safety Standards (Level 2)",
      subtitle: "Build practical HACCP and hygiene skills with real audit-ready workflows.",
      category: "food-safety",
      level: "Beginner",
      duration: "3h 30m",
      rating: "4.8",
      learners: "18,240",
      price: "$49.00",
      oldPrice: "$89.00",
      image: "/course-food-safety.png",
      published: true,
      instructorName: "Dr. Giri",
    },
    {
      slug: "cyber-security-essentials",
      title: "Cyber Security Essentials for Professionals",
      subtitle: "Protect networks, endpoints, and cloud systems with practical controls.",
      category: "cyber-security",
      level: "Intermediate",
      duration: "4h 10m",
      rating: "4.7",
      learners: "14,980",
      price: "$59.00",
      oldPrice: "$99.00",
      image: "/p2.png",
      published: true,
    },
    {
      slug: "esg-reporting-fundamentals",
      title: "ESG Reporting and Compliance Fundamentals",
      subtitle: "Learn ESG frameworks, disclosures and risk-aligned sustainability practices.",
      category: "esg",
      level: "Beginner",
      duration: "3h 00m",
      rating: "4.6",
      learners: "9,420",
      price: "$45.00",
      oldPrice: "$79.00",
      image: "/p3.png",
      published: true,
    },
    {
      slug: "information-security-governance",
      title: "Information Security Governance & Controls",
      subtitle: "Build policy, governance, audit and control systems for secure operations.",
      category: "information-security",
      level: "Advanced",
      duration: "4h 45m",
      rating: "4.8",
      learners: "11,060",
      price: "$69.00",
      oldPrice: "$109.00",
      image: "/p1.png",
      published: true,
    },
    {
      slug: "medical-device-quality-regulatory",
      title: "Medical Device Quality & Regulatory Pathway",
      subtitle: "Understand lifecycle, quality systems and global regulatory expectations.",
      category: "medical-devices",
      level: "Intermediate",
      duration: "3h 50m",
      rating: "4.7",
      learners: "7,860",
      price: "$62.00",
      oldPrice: "$95.00",
      image: "/p5.png",
      published: true,
    },
    {
      slug: "workplace-compliance-practical",
      title: "Workplace Compliance Practical Program",
      subtitle: "Cover labor laws, ethics, anti-harassment and mandatory compliance modules.",
      category: "workplace-compliance",
      level: "Beginner",
      duration: "2h 40m",
      rating: "4.5",
      learners: "13,220",
      price: "$39.00",
      oldPrice: "$69.00",
      image: "/p6.png",
      published: true,
    },
    {
      slug: "skill-development-framework-implementation",
      title: "Skill Development Framework Implementation",
      subtitle: "Design and map measurable capability pathways across your workforce.",
      category: "skill-development-framework",
      level: "Intermediate",
      duration: "3h 35m",
      rating: "4.6",
      learners: "8,510",
      price: "$52.00",
      oldPrice: "$84.00",
      image: "/p7.png",
      published: true,
    },
    {
      slug: "hvac-refrigeration-core-operations",
      title: "Mechanical Engineering: HVAC & Refrigeration Core Operations",
      subtitle: "Master HVAC components, refrigeration cycles and maintenance diagnostics.",
      category: "mechanical-engineering-hvac-and-refrigeration",
      level: "Intermediate",
      duration: "4h 20m",
      rating: "4.7",
      learners: "6,940",
      price: "$58.00",
      oldPrice: "$92.00",
      image: "/p8.png",
      published: true,
    },
  ],
  categories: [
    {
      slug: "food-safety",
      title: "Food Safety",
      subtitle: "Food & Nutrition",
      description: "Food safety standards, hygiene, quality control and certifications.",
      isActive: true,
      isFeatured: true,
      isUppercase: false,
      isBold: true,
      tone: "emerald",
    },
    {
      slug: "cyber-security",
      title: "Cyber Security",
      subtitle: "Security & Ethical Hacking",
      description: "Learn ethical hacking, penetration testing, network security and more.",
      isActive: true,
      isFeatured: false,
      isUppercase: false,
      isBold: true,
      tone: "blue",
    },
    {
      slug: "esg",
      title: "ESG",
      subtitle: "Environment & Sustainability",
      description: "Environmental, social and governance principles and practices.",
      isActive: true,
      isFeatured: false,
      isUppercase: true,
      isBold: true,
      tone: "amber",
    },
    {
      slug: "information-security",
      title: "Information Security",
      subtitle: "Governance & Controls",
      description: "Governance, controls, audits and risk-based security implementation.",
      isActive: true,
      isFeatured: false,
      isUppercase: false,
      isBold: false,
      tone: "violet",
    },
    {
      slug: "medical-devices",
      title: "Medical Devices",
      subtitle: "Regulatory & Quality",
      description: "Regulatory, quality and lifecycle training for medical devices.",
      isActive: true,
      isFeatured: false,
      isUppercase: false,
      isBold: false,
      tone: "blue",
    },
    {
      slug: "workplace-compliance",
      title: "Workplace Compliance",
      subtitle: "Legal & Ethics",
      description: "Child labor laws, workplace ethics and mandatory compliance modules.",
      isActive: true,
      isFeatured: false,
      isUppercase: false,
      isBold: false,
      tone: "emerald",
    },
    {
      slug: "skill-development-framework",
      title: "Skill Development Framework",
      subtitle: "Workforce Capability",
      description: "Structured pathways to build and validate workforce capabilities.",
      isActive: true,
      isFeatured: false,
      isUppercase: false,
      isBold: false,
      tone: "violet",
    },
    {
      slug: "mechanical-engineering-hvac-and-refrigeration",
      title: "Mechanical Engineering (HVAC & Refrigeration)",
      subtitle: "Mechanical Systems",
      description: "Technical modules on HVAC systems, refrigeration cycles and maintenance.",
      isActive: true,
      isFeatured: false,
      isUppercase: true,
      isBold: true,
      tone: "amber",
    },
  ],
  tutorLedPrograms: [],
  categoryPages: {},
  tutorLedCatalogPage: defaultTutorLedCatalogPageConfig,
};
