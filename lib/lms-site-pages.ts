import { COMPANY_DISPLAY_NAME, COMPANY_LEGAL_NAME, SFT_EMAILS } from "@/lib/contact-site-data";

export const LEGAL_LAST_UPDATED = "31 July 2026";

export const privacySections = [
  {
    title: "1. Who we are",
    body: [
      `${COMPANY_LEGAL_NAME} (“we”, “us”, “our”) operates the ${COMPANY_DISPLAY_NAME} Learning Management System (LMS) and related websites.`,
      `For privacy questions, contact ${SFT_EMAILS.info}.`,
    ],
  },
  {
    title: "2. Information we collect",
    body: [
      "Account details: name, email, phone, company (where provided), and login identifiers.",
      "Learning data: enrollments, progress, exam scores, certificates, and support tickets.",
      "Payment data: transaction references and status processed via our payment partners (we do not store full card numbers).",
      "Technical data: device/browser type, IP address, and usage logs needed to secure and improve the LMS.",
    ],
  },
  {
    title: "3. How we use your information",
    body: [
      "Provide courses, assessments, certificates, and learner support.",
      "Process enrollments, invoices, and refunds where applicable.",
      "Send important service messages (enrollment, certificate, security alerts).",
      "Improve platform performance, content quality, and fraud prevention.",
    ],
  },
  {
    title: "4. Sharing",
    body: [
      "We do not sell personal data.",
      "We may share limited data with trusted processors (hosting, email, payment gateways, certificate tooling) under confidentiality and data-protection terms.",
      "We may disclose information if required by law or to protect learners, staff, or platform integrity.",
    ],
  },
  {
    title: "5. Retention & security",
    body: [
      "We retain account and learning records for as long as needed to deliver services and meet legal/audit requirements.",
      "We use administrative, technical, and organizational measures to protect data. No method of transmission is 100% secure; please keep your login credentials confidential.",
    ],
  },
  {
    title: "6. Your choices",
    body: [
      "You may request access, correction, or deletion of personal data (subject to legal retention needs) by emailing us.",
      "You may opt out of non-essential marketing communications at any time.",
    ],
  },
  {
    title: "7. Updates",
    body: [
      `We may update this Privacy Policy from time to time. The “Last updated” date at the top of the page will change when we do.`,
    ],
  },
];

export const termsSections = [
  {
    title: "1. Agreement",
    body: [
      `By creating an account or purchasing/enrolling in a ${COMPANY_DISPLAY_NAME} course, you agree to these Terms & Conditions.`,
    ],
  },
  {
    title: "2. Accounts",
    body: [
      "You must provide accurate registration details and keep your password secure.",
      "You are responsible for activity under your account. Notify us promptly of unauthorized access.",
    ],
  },
  {
    title: "3. Courses & licenses",
    body: [
      "Course access is personal (or organization-licensed where purchased for teams) and non-transferable unless we agree in writing.",
      "Content, videos, assessments, and materials are protected by intellectual property laws. You may not copy, redistribute, scrape, or resell LMS content.",
    ],
  },
  {
    title: "4. Payments",
    body: [
      "Prices are shown at checkout and may vary by region/currency.",
      "Access is granted after successful payment or approved admin grant. Failed or disputed payments may result in suspended access.",
    ],
  },
  {
    title: "5. Certificates",
    body: [
      "Certificates are issued according to course completion rules (modules, exams, and any admin approval settings).",
      "Misrepresentation of certificates or sharing login credentials to obtain certificates is prohibited.",
    ],
  },
  {
    title: "6. Acceptable use",
    body: [
      "Do not misuse the platform, attempt to breach security, harass others, or upload malicious content.",
      "We may suspend accounts that violate these terms.",
    ],
  },
  {
    title: "7. Liability",
    body: [
      "Training content is provided for professional development. Outcomes depend on learner effort and workplace application.",
      "To the fullest extent permitted by law, our liability is limited to the amount paid for the affected course enrollment.",
    ],
  },
  {
    title: "8. Contact",
    body: [`Questions about these terms: ${SFT_EMAILS.info}`],
  },
];

export const refundSections = [
  {
    title: "1. Overview",
    body: [
      `${COMPANY_LEGAL_NAME} wants learners to feel confident when enrolling. This Refund Policy explains when refunds may be available for LMS course purchases.`,
    ],
  },
  {
    title: "2. Eligibility window",
    body: [
      "Refund requests should be submitted within 7 days of purchase AND before substantial course progress (for example, before completing major modules or attempting final exams), unless a longer window was promised at checkout.",
      "Organization / bulk seat purchases may follow a separate commercial agreement.",
    ],
  },
  {
    title: "3. When refunds are typically approved",
    body: [
      "Duplicate payment or technical checkout error.",
      "Course could not be accessed due to a verified platform fault on our side.",
      "Incorrect course purchased, reported promptly, with little or no learning progress.",
    ],
  },
  {
    title: "4. When refunds are typically not available",
    body: [
      "Change of mind after significant content consumption or exam attempts.",
      "Failure to complete a course or pass an assessment.",
      "Requests made after the stated eligibility window.",
    ],
  },
  {
    title: "5. How to request a refund",
    body: [
      `Email ${SFT_EMAILS.info} with: registered email, course name, transaction/order ID, payment date, and reason.`,
      "Our team will review and respond. Approved refunds are returned to the original payment method where possible; processing times depend on banks/gateways.",
    ],
  },
  {
    title: "6. Demo / complimentary access",
    body: ["Complimentary, demo, or admin-granted access is not eligible for monetary refund."],
  },
];

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  date: string;
  image: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "why-cybersecurity-awareness-matters",
    title: "Why cybersecurity awareness training matters for every team",
    excerpt:
      "Phishing and social engineering remain top workplace risks. Learn how short, practical LMS modules build safer digital habits.",
    category: "Cyber Security",
    readMinutes: 5,
    date: "2026-07-12",
    image: "/lms-blog-cyber.png",
  },
  {
    slug: "esg-reporting-basics",
    title: "ESG reporting basics for growing organizations",
    excerpt:
      "A clear walkthrough of frameworks, disclosures, and how structured online training helps teams stay audit-ready.",
    category: "ESG",
    readMinutes: 6,
    date: "2026-06-28",
    image: "/lms-blog-esg.png",
  },
  {
    slug: "getting-the-most-from-self-paced-lms",
    title: "Getting the most from self-paced LMS learning",
    excerpt:
      "Practical tips on module pacing, exam prep, and turning certificates into workplace capability.",
    category: "Learning Tips",
    readMinutes: 4,
    date: "2026-06-10",
    image: "/lms-blog-selfpaced.png",
  },
  {
    slug: "food-safety-culture-starts-with-training",
    title: "Food safety culture starts with consistent training",
    excerpt:
      "How repeatable online learning supports HACCP-minded teams and reduces gaps between policy and practice.",
    category: "Food Safety",
    readMinutes: 5,
    date: "2026-05-22",
    image: "/lms-blog-food.png",
  },
];

export type PodcastEpisode = {
  slug: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  date: string;
  image: string;
};

export const podcastEpisodes: PodcastEpisode[] = [
  {
    slug: "episode-01-phishing-in-plain-english",
    title: "Episode 01 — Phishing in plain English",
    description: "A short briefing on spotting fake emails, urgent scams, and what to do next at work.",
    duration: "12 min",
    category: "Cyber Security",
    date: "2026-07-01",
    image: "/lms-podcast-cyber.png",
  },
  {
    slug: "episode-02-esg-without-the-jargon",
    title: "Episode 02 — ESG without the jargon",
    description: "How sustainability reporting connects to everyday roles — and why training helps.",
    duration: "14 min",
    category: "ESG",
    date: "2026-06-18",
    image: "/lms-podcast-esg.png",
  },
  {
    slug: "episode-03-certificates-that-mean-something",
    title: "Episode 03 — Certificates that mean something",
    description: "What completion, exams, and verification mean on the SFT LMS.",
    duration: "10 min",
    category: "Learning",
    date: "2026-06-02",
    image: "/lms-podcast-certs.png",
  },
];
