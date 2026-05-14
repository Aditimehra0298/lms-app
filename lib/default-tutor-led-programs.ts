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
  price: number;
  originalPrice: number;
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
  heroSrc?: string;
  heroAlt?: string;
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
    originalPrice: 18999,
    discount: "31% OFF",
    batchLabel: "Upcoming Live Batch",
    seatsFilling: true,
    seatsLeft: 18,
    trainer: {
      name: "Mr. Arvind Rao",
      role: "Cyber Security Expert & Trainer",
      experience: "12+ Years of Experience",
      bio: "12+ years of experience in cybersecurity, ethical hacking, and information security. Worked with top MNCs and trained more than 15,000+ professionals worldwide.",
      certifications: ["CEH Certified", "CISSP Certified", "OSCP Certified"],
      workedWith: ["IBM", "Deloitte", "Infosys", "KPMG", "WIPRO"],
      avatar: "/trainer-avatar.png",
    },
    nextBatchDate: "25 May 2024",
    schedule: "Sat & Sun (7:00 PM - 10:00 PM IST)",
    language: "English",
    countdown: { days: 5, hours: 12, mins: 45, secs: 30 },
    batchDetails: [
      { icon: "Clock", label: "Duration", value: "24 Hours (12 Live Sessions)" },
      { icon: "Calendar", label: "Live Sessions", value: "Sat & Sun (7:00 PM - 10:00 PM IST)" },
      { icon: "Monitor", label: "Platform", value: "Zoom (Live Interactive)" },
      { icon: "Video", label: "Recording Access", value: "Lifetime access to recordings" },
      { icon: "Award", label: "Certification", value: "Industry Recognized Certificate" },
    ],
    features: [
      { icon: "Mic", title: "Live Expert Training", desc: "Learn directly from industry professionals" },
      { icon: "MessageCircle", title: "Real-time Interaction", desc: "Ask questions and get instant answers" },
      { icon: "MonitorPlay", title: "Hands-on Workshops", desc: "Practical labs and live demonstrations" },
      { icon: "Users", title: "Peer Learning", desc: "Connect and learn with fellow professionals" },
      { icon: "Video", title: "Session Recordings", desc: "Access all recordings after each session" },
      { icon: "Award", title: "Certificate", desc: "Earn a recognized completion certificate" },
    ],
    highlights: [
      "12 Live Interactive Sessions on Zoom",
      "Real-Time Doubt Solving",
      "Live Assignments & Hands-on Labs",
      "Group Discussions & Breakout Rooms",
      "Polls, Quizzes & Interactive Activities",
      "Session Recordings & Notes Provided",
    ],
    curriculum: [
      {
        week: 1,
        label: "Foundations",
        topic: "Introduction to Cyber Security & Information Security",
        keyLearning: "Security principles, CIA Triad, Threats & Attack Vectors",
        sessionType: "Live Lecture",
      },
      {
        week: 2,
        label: "Network Security",
        topic: "Network Security Concepts & Firewalls",
        keyLearning: "TCP/IP, Firewalls, IDS/IPS, VPN, Network Monitoring",
        sessionType: "Live + Hands-on",
      },
      {
        week: 3,
        label: "Ethical Hacking",
        topic: "Penetration Testing Fundamentals",
        keyLearning: "Reconnaissance, Scanning, Enumeration using industry tools",
        sessionType: "Live + Lab",
      },
      {
        week: 4,
        label: "Web Security",
        topic: "Web Application Security & OWASP Top 10",
        keyLearning: "SQL Injection, XSS, CSRF, Secure Coding Practices",
        sessionType: "Live + Hands-on",
      },
      {
        week: 5,
        label: "Security Testing",
        topic: "Vulnerability Assessment & Reporting",
        keyLearning: "Identify vulnerabilities, risk rating, report generation",
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
      { icon: "MonitorPlay", title: "Live Learning Experience", desc: "Engage in real-time with expert trainers and peers" },
      { icon: "Users", title: "Personalized Guidance", desc: "Get personalized feedback and mentorship" },
      { icon: "BookOpen", title: "Better Understanding", desc: "Complex topics explained directly by experts" },
      { icon: "Zap", title: "Career Advancement", desc: "Build in-demand skills and boost your career" },
      { icon: "Globe", title: "Exclusive Community", desc: "Be part of a community of ambitious learners" },
    ],
    faqs: [
      {
        q: "How do the live sessions work?",
        a: "All sessions are conducted live on Zoom. You'll receive a joining link before each session. Sessions are interactive with Q&A, polls, and breakout rooms.",
      },
      {
        q: "Will I get recordings of the sessions?",
        a: "Yes, recordings of all live sessions are made available within 24 hours and you get lifetime access to them.",
      },
      {
        q: "What if I miss a live session?",
        a: "You can watch the recorded session at your convenience. You can also post your doubts in the community forum for trainer response.",
      },
      {
        q: "Is prior experience required?",
        a: "Basic understanding of computers and networking is helpful, but not mandatory. The course starts from fundamentals.",
      },
      {
        q: "Will I get a certificate after the training?",
        a: "Yes, upon successful completion of the training and final project, you'll receive an industry-recognized certificate.",
      },
    ],
    heroSrc: "/h1.png",
    heroAlt: "Live interactive sessions with expert trainer",
  },
];
