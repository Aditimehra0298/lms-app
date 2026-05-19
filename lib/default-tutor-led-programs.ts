import type { TutorLedLearningMaterial } from "@/lib/tutor-led-learning-tools";
import type { ZoomSessionRecording } from "@/lib/zoom-session-types";

/**
 * JSON-safe tutor-led live program rows (icons stored as Lucide export names).
 * Used by admin and `/tutor-led/[slug]`.
 */
export type TutorLedProgramStored = {
  slug: string;
  published: boolean;
  title: string;
  subtitle: string;
  breadcrumb: string[];
  badge: string;
  /** Checkout / marketing sale price (before payment). */
  price: number;
  /** Strikethrough list price on the public page (before payment). */
  originalPrice: number;
  /** Optional enrolled-dashboard price; defaults to `price` when omitted. */
  priceAfterPayment?: number;
  discount: string;
  batchLabel: string;
  seatsFilling: boolean;
  seatsLeft: number;
  trainer: {
    name: string;
    role: string;
    experience: string;
    bio: string;
    certifications: string[];
    workedWith: string[];
    avatar?: string;
  };
  nextBatchDate: string;
  schedule: string;
  language: string;
  countdown: { days: number; hours: number; mins: number; secs: number };
  batchDetails: { icon: string; label: string; value: string }[];
  features: { icon: string; title: string; desc: string }[];
  highlights: string[];
  curriculum: {
    week: number;
    label: string;
    topic: string;
    keyLearning: string;
    sessionType: string;
  }[];
  whyChoose: { icon: string; title: string; desc: string }[];
  faqs: { q: string; a: string }[];
  /** Hero on `/tutor-led/[slug]` before payment. */
  heroSrc?: string;
  heroAlt?: string;
  /** Banner on My Learning after payment; falls back to `heroSrc`. */
  learnerHeroSrc?: string;
  learnerHeroAlt?: string;
  /** Full Zoom join link (from Zoom → Meetings → copy invitation). */
  liveJoinUrl?: string;
  /** Optional — auto-filled when you paste a Zoom link; or enter PMI / meeting ID manually. */
  zoomMeetingId?: string;
  /** Optional — shown to enrolled learners; merged into join URL as ?pwd= when needed. */
  zoomPasscode?: string;
  /** Set when a meeting is created via Zoom API (used for cloud recording sync). */
  zoomMeetingUuid?: string;
  /** Cloud recordings synced from Zoom API — shown on the learner dashboard. */
  zoomRecordings?: ZoomSessionRecording[];
  /** Pad notes, PPT, webbook — managed in Admin → Tutor Led; learners download only. */
  learningMaterials?: TutorLedLearningMaterial[];
  /** auto = 5 days/week from topic; manual = edit days in admin. */
  curriculumMode?: "auto" | "manual";
  /** auto = Zoom API buttons; manual = paste join link only. */
  zoomLinkMode?: "auto" | "manual";
};

export const defaultTutorLedPrograms: TutorLedProgramStored[] = [
  {
    slug: "advanced-cyber-security-professional",
    published: true,
    title: "Advanced Cyber Security Professional",
    subtitle:
      "Join live interactive sessions with industry experts on Zoom and master in-demand cybersecurity skills through hands-on learning.",
    breadcrumb: ["Home", "Live Trainings", "Tutor Led Training"],
    badge: "TUTOR LED TRAINING",
    price: 12999,
    originalPrice: 24999,
    discount: "48% OFF",
    batchLabel: "Upcoming Live Batch",
    seatsFilling: true,
    seatsLeft: 10,
    trainer: {
      name: "Mr. Arvind Rao",
      role: "Cyber Security Expert & Trainer",
      experience: "12+ Years Experience",
      bio: "10+ years of experience in cybersecurity, ethical hacking, risk assessment and information security. Worked with top MNCs and trained 1000+ professionals.",
      certifications: ["Ethical Hacking", "Network Security", "Risk Assessment", "GRC", "Pen Testing"],
      workedWith: ["IBM", "Deloitte", "Infosys", "KPMG", "WIPRO"],
      avatar: "/trainer-avatar.png",
    },
    nextBatchDate: "15 June 2024",
    schedule: "Tue, Thu, Sat (7:00 PM - 9:00 PM IST)",
    language: "English",
    countdown: { days: 5, hours: 12, mins: 45, secs: 30 },
    liveJoinUrl: "",
    zoomMeetingId: "",
    zoomPasscode: "",
    batchDetails: [
      { icon: "Clock", label: "Duration", value: "12 Weeks" },
      { icon: "Calendar", label: "Live Sessions", value: "Tue, Thu, Sat (7:00 PM - 9:00 PM IST)" },
      { icon: "Monitor", label: "Platform", value: "Zoom (Live Interactive)" },
      { icon: "Video", label: "Recording Access", value: "Lifetime access to recordings" },
      { icon: "Award", label: "Certification", value: "IEB-Accredited Certificate of Attainment" },
    ],
    features: [
      { icon: "Mic", title: "Live Expert Training", desc: "Learn directly from industry experts" },
      { icon: "MessageCircle", title: "Public Discussion", desc: "Clarify doubts and share knowledge" },
      { icon: "Users", title: "Peer Interaction", desc: "Engage with fellow learners" },
      { icon: "Handshake", title: "Peer Learning", desc: "Collaborate and grow together" },
      { icon: "Video", title: "Session Recordings", desc: "Watch anytime, revise at your convenience" },
      { icon: "Shield", title: "Certificates", desc: "IEB-accredited Certificate of Attainment with QR verification" },
    ],
    highlights: [
      "Live interactive sessions on Zoom",
      "Real-time doubt solving",
      "Hands-on labs & practical demos",
      "Industry-based case studies",
      "IEB-accredited Certificate of Attainment",
      "Career guidance & support",
    ],
    curriculum: [
      {
        week: 1,
        label: "Module 1",
        topic: "Introduction to Cybersecurity",
        keyLearning: "Security fundamentals, threats & attack vectors",
        sessionType: "Live Lecture",
      },
      {
        week: 2,
        label: "Module 2",
        topic: "Network Security",
        keyLearning: "Firewalls, IDS/IPS, VPN, network monitoring",
        sessionType: "Live + Hands-on",
      },
      {
        week: 3,
        label: "Module 3",
        topic: "Practical Tools",
        keyLearning: "Industry tools for scanning & enumeration",
        sessionType: "Live + Lab",
      },
      {
        week: 4,
        label: "Module 4",
        topic: "Web Application Security",
        keyLearning: "OWASP Top 10, SQL injection, XSS",
        sessionType: "Live + Hands-on",
      },
      {
        week: 5,
        label: "Module 5",
        topic: "Incident Response",
        keyLearning: "Detection, containment & recovery",
        sessionType: "Live Workshop",
      },
      {
        week: 6,
        label: "Final Project",
        topic: "Capstone Project & Presentation",
        keyLearning: "Real-world project, review & feedback session",
        sessionType: "Live + Review",
      },
    ],
    whyChoose: [
      { icon: "Rocket", title: "Live Learning Experience", desc: "Engage in real-time with expert trainers and peers" },
      { icon: "Brain", title: "Practical Cybersecurity Skills", desc: "Hands-on labs and real-world security scenarios" },
      { icon: "UserRound", title: "Real Trainer Support", desc: "Get doubts cleared directly by industry experts" },
      { icon: "TrendingUp", title: "Career Improvement", desc: "Build in-demand skills and boost your career" },
      { icon: "Users", title: "Interactive Community", desc: "Learn and grow with fellow cybersecurity professionals" },
    ],
    faqs: [
      {
        q: "Who is this course for?",
        a: "IT professionals, security analysts, network admins, and anyone looking to start or advance in cybersecurity.",
      },
      {
        q: "Will I get a certificate?",
        a: "Yes, upon successful completion you receive an industry-recognized Certificate of Attainment.",
      },
      {
        q: "Is this course beginner-friendly?",
        a: "Yes. We start from fundamentals and build up to advanced topics with live trainer support.",
      },
      {
        q: "Will recordings be provided?",
        a: "Yes. All live sessions are recorded and available for lifetime access in My Learning.",
      },
      {
        q: "How will the live classes be conducted?",
        a: "Classes run on Zoom with screen share, live Q&A, polls, and breakout activities.",
      },
    ],
    heroSrc: "/h1.png",
    heroAlt: "Live interactive sessions with expert trainer",
    learnerHeroSrc: "/h2.png",
    learnerHeroAlt: "Your live cohort dashboard",
    priceAfterPayment: 12999,
    learningMaterials: [
      {
        id: "demo-pad-1",
        kind: "pad-notes",
        title: "Live session scratchpad",
        downloadUrl: "/uploads/demo/session-notes.pdf",
      },
      {
        id: "demo-ppt-1",
        kind: "ppt",
        title: "Week 1 — Introduction slides",
        downloadUrl: "/uploads/demo/week-1-slides.pptx",
      },
      {
        id: "demo-web-1",
        kind: "webbook",
        title: "Course workbook (PDF)",
        downloadUrl: "/uploads/demo/course-workbook.pdf",
      },
    ],
  },
];
