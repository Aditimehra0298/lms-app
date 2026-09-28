import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { formatTrainingDuration, getCurriculumSessionCount } from "@/lib/tutor-led-training-schedule";

export type Iso22000LandingCopy = {
  tagline: string;
  about: string;
  learnOutcomes: string[];
  whatYouLearn: { title: string; description: string }[];
  requirements: string[];
  faqs: { q: string; a: string }[];
  highlights: string[];
};

const SHARED_REQUIREMENTS = [
  "Basic understanding of food operations, hygiene, or quality work is helpful — not mandatory for Awareness.",
  "A computer or tablet with a stable internet connection for live Zoom sessions.",
  "Willingness to join live discussions, case studies, and practical exercises.",
  "Practice and examples in this program are for authorized workplace use only.",
];

export const ISO_22000_LANDING_COPY: Record<string, Iso22000LandingCopy> = {
  "iso-22000-basic": {
    tagline: "Learn Food Safety Fundamentals",
    about:
      "This ISO 22000:2018 Awareness program gives you a clear, practical introduction to Food Safety Management Systems. You will learn how the standard is structured, why FSMS matters for consumers and brands, and how clauses connect from context and leadership through hazard control, PRP thinking, monitoring, and continual improvement.\n\nSessions are live on Zoom with a food-safety expert. Concepts are explained in simple language with industry examples so beginners and plant staff can speak the same FSMS language as auditors and managers. Completing the batch unlocks a certificate of attainment for this Awareness level.",
    learnOutcomes: [
      "Explain the purpose and structure of ISO 22000:2018",
      "Describe core food-safety principles and FSMS vocabulary",
      "Recognise how PRPs, hazards, and operational controls fit together",
      "Identify who is responsible for food safety in a typical organisation",
      "Prepare for Implementation or Internal Auditor training with a solid foundation",
    ],
    whatYouLearn: [
      {
        title: "Standard overview",
        description: "What ISO 22000:2018 is, who it applies to, and how it supports safer food.",
      },
      {
        title: "FSMS building blocks",
        description: "Context, leadership, planning, support, operation, performance, and improvement.",
      },
      {
        title: "Hazard thinking",
        description: "How biological, chemical, and physical hazards are identified at a foundation level.",
      },
      {
        title: "Live classroom practice",
        description: "Trainer-led examples, quizzes, and discussion so concepts stick beyond slides.",
      },
    ],
    requirements: SHARED_REQUIREMENTS,
    highlights: [
      "5-day live Zoom Awareness batch",
      "Certificate of completion for this level",
      "Industry examples from food manufacturing and service",
      "Clear path to Implementator and Auditor programs",
    ],
    faqs: [
      {
        q: "Is this suitable if I am new to ISO 22000?",
        a: "Yes. Awareness starts from fundamentals and builds up with live explanation. No prior auditor certificate is required.",
      },
      {
        q: "Is this self-paced or live?",
        a: "This is a live tutor-led Zoom batch (5 days). You learn with your cohort and the trainer in real time.",
      },
      {
        q: "Do I get a certificate?",
        a: "Yes. Complete the live sessions and required assessments for this Awareness batch to unlock your certificate.",
      },
      {
        q: "What comes after Awareness?",
        a: "Most learners continue to ISO 22000:2018 Implementator, then Internal Auditor or Lead Auditor, depending on their role.",
      },
    ],
  },
  "iso-22000-implementation": {
    tagline: "Implement Food Safety Systems",
    about:
      "This ISO 22000:2018 Implementator program shows you how to turn the standard into a working Food Safety Management System. You will walk through implementation methodology, documented information, PRPs, hazard analysis, operational control, monitoring, verification, and how to close gaps found in real plants.\n\nThe live Zoom workshops focus on procedure writing, risk thinking, and evidence you can take back to your site. It is designed for QA officers, supervisors, and teams who must build or upgrade an FSMS — not only understand the clauses on paper.",
    learnOutcomes: [
      "Apply a step-by-step ISO 22000 implementation method",
      "Draft and structure FSMS procedures and records that auditors can follow",
      "Link PRPs, hazard analysis, and operational controls in one system",
      "Plan monitoring, verification, and corrective action loops",
      "Prepare the organisation for internal and certification audits",
    ],
    whatYouLearn: [
      {
        title: "Implementation roadmap",
        description: "Scope, gap analysis, project plan, and how to sequence FSMS work on site.",
      },
      {
        title: "Documentation that works",
        description: "Policies, procedures, work instructions, and records without unnecessary paperwork.",
      },
      {
        title: "Hazard and PRP control",
        description: "Practical hazard analysis, PRP selection, and how controls stay effective day to day.",
      },
      {
        title: "Workshops",
        description: "Live exercises on writing procedures, mapping processes, and presenting evidence.",
      },
    ],
    requirements: [
      "Awareness of ISO 22000 or equivalent food-safety exposure is recommended.",
      "Access to (or knowledge of) a food operation helps you apply workshop tasks.",
      "Computer or tablet with Zoom and internet for the 5-day live batch.",
      "Authority or support to propose FSMS changes in your workplace is useful.",
    ],
    highlights: [
      "Step-by-step implementation methodology",
      "Documentation and procedure workshops",
      "Hazard control and PRP application",
      "5-day live Zoom Implementator batch",
    ],
    faqs: [
      {
        q: "How is Implementator different from Awareness?",
        a: "Awareness explains the standard. Implementator shows how to design, document, and run the FSMS in a real operation.",
      },
      {
        q: "Will I write procedures in class?",
        a: "Yes. Workshops include documentation and procedure structure so you leave with practical templates and examples.",
      },
      {
        q: "Is this for consultants only?",
        a: "No. It is for plant QA, supervisors, consultants, and anyone tasked with implementing or upgrading ISO 22000.",
      },
      {
        q: "Do I need Internal Auditor first?",
        a: "No. Implementator is the system-building level. Internal Auditor is the next step if your role is to audit the FSMS.",
      },
    ],
  },
  "iso-22000-internal-auditor": {
    tagline: "Conduct Internal Audits",
    about:
      "This ISO 22000:2018 Internal Auditor program trains you to plan, conduct, and report internal FSMS audits. You will practise audit planning, checklists, interviewing, sampling evidence, writing non-conformities, and judging whether food-safety controls actually work on the floor — not only whether a procedure exists.\n\nLive Zoom sessions follow ISO 19011-style audit thinking applied to ISO 22000:2018. It is built for internal auditors, QA teams, and staff who must audit their own organisation before a certification body arrives.",
    learnOutcomes: [
      "Plan an internal ISO 22000 audit with scope, criteria, and a workable checklist",
      "Collect objective evidence through observation, interviews, and records",
      "Identify and grade non-conformities with clear, auditable wording",
      "Report findings and follow up corrective action effectively",
      "Connect clauses 4–10 so audits test the system, not isolated documents",
    ],
    whatYouLearn: [
      {
        title: "Audit planning",
        description: "Programme, plan, checklist, and how to sample processes that matter for food safety.",
      },
      {
        title: "Evidence techniques",
        description: "Questions that reveal implementation gaps, not just ‘show me the procedure’.",
      },
      {
        title: "Non-conformity writing",
        description: "Clear NC statements, evidence, requirement, and why it matters for FSMS performance.",
      },
      {
        title: "Practical exercises",
        description: "Live audit scenarios so you rehearse the conversation before you audit your plant.",
      },
    ],
    requirements: [
      "Working knowledge of ISO 22000:2018 or completion of Awareness / Implementator is recommended.",
      "Experience in food safety, quality, or operations helps you interpret evidence.",
      "Computer or tablet with Zoom for the 5-day live Internal Auditor batch.",
      "You should only audit processes you are authorised to assess.",
    ],
    highlights: [
      "Audit planning and checklist preparation",
      "Interview and evidence techniques",
      "Non-conformity identification and reporting",
      "Practical internal audit exercises on Zoom",
    ],
    faqs: [
      {
        q: "Do I need a previous Internal Auditor certificate?",
        a: "No. This live program is the Internal Auditor training for ISO 22000:2018. Prior FSMS awareness helps you get more from the exercises.",
      },
      {
        q: "Is this the same as Lead Auditor?",
        a: "No. Internal Auditor focuses on auditing your own organisation. Lead Auditor adds team leadership and certification-style audit management.",
      },
      {
        q: "Will we practise writing findings?",
        a: "Yes. Reporting and NC wording are part of the live exercises so your audit reports are usable.",
      },
      {
        q: "How do I join the class?",
        a: "After enrollment, your Zoom join link for this Internal Auditor batch appears on your My Learning dashboard.",
      },
    ],
  },
  "iso-22000-lead-auditor": {
    tagline: "Lead Audit Teams",
    about:
      "This ISO 22000:2018 Lead Auditor program prepares you to lead audit teams with confidence. You will cover advanced audit techniques, team briefing and coordination, certification-body perspectives, regulatory context, and how to manage an audit from opening meeting through reporting and follow-up.\n\nLive Zoom sessions are built for professionals on the Lead Auditor pathway: experienced internal auditors, consultants, and food-safety leaders who must run robust, defensible audits against ISO 22000:2018.",
    learnOutcomes: [
      "Lead an audit team through planning, execution, and closing meetings",
      "Apply advanced sampling, tracing, and reporting techniques",
      "Manage conflict, time, and incomplete evidence during an audit",
      "Align audit conclusions with ISO 22000:2018 and ISO 19011 principles",
      "Understand certification and regulatory expectations at a lead-auditor level",
    ],
    whatYouLearn: [
      {
        title: "Leading the team",
        description: "Roles, briefings, work allocation, and how the lead auditor stays in control of the audit.",
      },
      {
        title: "Advanced techniques",
        description: "Process tracing, vertical and horizontal checks, and reporting that stands up to review.",
      },
      {
        title: "Certification lens",
        description: "How certification and regulatory audits differ from a simple internal checklist review.",
      },
      {
        title: "Lead Auditor pathway",
        description: "What competence looks like and how this live batch supports your professional progression.",
      },
    ],
    requirements: [
      "Internal Auditor experience or equivalent ISO 22000 audit exposure is strongly recommended.",
      "Comfort with FSMS clauses, PRPs, and hazard control before joining Lead Auditor.",
      "Computer or tablet with Zoom for the 5-day live Lead Auditor batch.",
      "Lead audits only where you have a mandate and the organisation’s authorisation.",
    ],
    highlights: [
      "Lead audit teams with confidence",
      "Advanced audit techniques and reporting",
      "Regulatory and certification perspectives",
      "Lead Auditor certification pathway",
    ],
    faqs: [
      {
        q: "Who should take Lead Auditor?",
        a: "Experienced internal auditors, consultants, and food-safety leaders who will lead teams or support certification audits.",
      },
      {
        q: "Is Awareness enough before Lead Auditor?",
        a: "Awareness is not enough. Complete Implementator and Internal Auditor (or equivalent experience) first so the advanced sessions are useful.",
      },
      {
        q: "Is this a replacement for a CB-registered Lead Auditor exam?",
        a: "This is SF Trainings live Lead Auditor training with a certificate of attainment for the batch. Certification-body exam rules are separate where they apply.",
      },
      {
        q: "Do I get a Zoom classroom for this level?",
        a: "Yes. Each level has its own Zoom class and batch. Your join link appears in My Learning after enrollment.",
      },
    ],
  },
  "advanced-cyber-security-professional": {
    tagline: "Master in-demand cybersecurity skills in live Zoom classrooms",
    about:
      "This Advanced Cyber Security Professional program is a live tutor-led pathway for people who want to work with real threats, not only theory. You join industry experts on Zoom for interactive lectures, labs, and case studies covering security fundamentals, network defence, web application risk, incident response, and a capstone project.\n\nSessions are built for working professionals: evening-friendly live classes, recordings for revision, and an IEB-accredited Certificate of Attainment when you complete the batch. You practise with the same families of tools and attack scenarios used in modern SOC and consulting work — always in authorised lab environments.",
    learnOutcomes: [
      "Explain modern threats, attack paths, and defensive controls in clear professional language",
      "Apply network security concepts including firewalls, monitoring, VPN, and IDS/IPS thinking",
      "Assess common web application weaknesses using OWASP-aligned methods in a lab",
      "Follow an incident-response loop from detection through containment and recovery",
      "Present a capstone security project with evidence, findings, and recommendations",
    ],
    whatYouLearn: [
      {
        title: "Live expert classrooms",
        description: "Interactive Zoom sessions with real-time doubt solving, not a recorded-only playlist.",
      },
      {
        title: "Hands-on labs",
        description: "Scanning, enumeration, and defensive exercises in authorised lab setups.",
      },
      {
        title: "Web and network risk",
        description: "OWASP Top 10, injection classes, and network monitoring patterns used on the job.",
      },
      {
        title: "Capstone and certificate",
        description: "Finish with a project review and an IEB-accredited Certificate of Attainment.",
      },
    ],
    requirements: [
      "Basic comfort with computers, browsers, and office software.",
      "Networking fundamentals help but are taught from the ground up in Module 1.",
      "A computer with Zoom, stable internet, and permission to use lab environments only.",
      "Never test systems you do not own or have written authorisation to assess.",
    ],
    highlights: [
      "Live interactive sessions on Zoom",
      "Real-time doubt solving",
      "Hands-on labs and practical demos",
      "IEB-accredited Certificate of Attainment",
    ],
    faqs: [
      {
        q: "Is this self-paced or live?",
        a: "This is live tutor-led training on Zoom (Tue, Thu, Sat evenings in the published batch schedule), with recordings for revision.",
      },
      {
        q: "Do I need to be a hacker already?",
        a: "No. The program starts with fundamentals and builds into labs. Curiosity and professional ethics are required.",
      },
      {
        q: "What certificate do I receive?",
        a: "An IEB-accredited Certificate of Attainment with QR verification after you complete the live batch requirements.",
      },
      {
        q: "Can I join from my phone?",
        a: "Zoom works on phone, but labs are easier on a laptop or desktop. Use a stable connection.",
      },
    ],
  },
};

export function iso22000LandingCopy(slug: string): Iso22000LandingCopy | null {
  return ISO_22000_LANDING_COPY[slug.trim()] ?? null;
}

const UNIQUE_IMAGES: Record<string, string> = {
  "iso-22000-basic": "/iso-22000-awareness.png",
  "iso-22000-implementation": "/iso-22000-implementator.png",
  "iso-22000-internal-auditor": "/iso-22000-internal-auditor.png",
  "iso-22000-lead-auditor": "/iso-22000-lead-auditor.png",
  "advanced-cyber-security-professional": "/tutor-led-cyber-professional.png",
};

const GENERIC_HERO = new Set(["", "/h1.png", "/tutor-led-iso-hero.png", "/trainer-avatar.png"]);

const CATEGORY_IMAGE: Record<string, string> = {
  "food-safety": "/lms-blog-food.png",
  "cyber-security": "/tutor-led-cyber-professional.png",
  esg: "/lms-blog-esg.png",
  "information-security": "/chatgpt-hero.png",
  "medical-devices": "/industry/hero-plant-night.png",
  "workplace-compliance": "/c4.png",
};

function fallbackCopy(program: {
  title: string;
  subtitle: string;
  highlights?: string[];
  features?: { title: string; desc: string }[];
  faqs?: { q: string; a: string }[];
}): Iso22000LandingCopy {
  const highlights = (program.highlights ?? []).filter(Boolean);
  const whatYouLearn = (program.features ?? []).slice(0, 4).map((f) => ({
    title: f.title,
    description: f.desc,
  }));
  return {
    tagline: program.subtitle,
    about: `${program.title} is a live tutor-led Zoom program. ${program.subtitle}\n\nYou learn with a cohort and an expert trainer, practise with case discussions, and complete this batch for a verifiable certificate. Each program keeps its own classroom, schedule, and assessment path — this page is only for ${program.title}.`,
    learnOutcomes: highlights.length
      ? highlights
      : [
          `Apply the core ideas taught in ${program.title}`,
          "Join live Zoom sessions and ask questions in real time",
          "Use batch materials and recordings for revision",
          "Complete the live pathway for a certificate of attainment",
        ],
    whatYouLearn: whatYouLearn.length
      ? whatYouLearn
      : [
          { title: "Live classrooms", description: "Interactive Zoom sessions with your trainer and batch." },
          { title: "Practice", description: "Case studies and exercises tied to this program’s outcomes." },
          { title: "Materials", description: "Notes and recordings for this batch after enrollment." },
          { title: "Certificate", description: "Issued for this program level when you complete requirements." },
        ],
    requirements: [
      "A computer or tablet with Zoom and a stable internet connection.",
      "Willingness to attend live sessions for this specific batch.",
      "Apply tools and methods only in authorised workplace or lab settings.",
    ],
    faqs: program.faqs?.length
      ? program.faqs
      : [
          {
            q: "Is this the same page as other tutor-led courses?",
            a: `No. This description, timetable, and classroom belong only to ${program.title}.`,
          },
          {
            q: "How do I enroll?",
            a: "Use Enroll Now on this page. After payment, your Zoom link appears in My Learning.",
          },
        ],
    highlights: highlights.length ? highlights : [`Live Zoom training for ${program.title}`],
  };
}

export function tutorLedLandingCopy(program: TutorLedProgramStored): Iso22000LandingCopy {
  const days = formatTrainingDuration(getCurriculumSessionCount(program));
  const raw = iso22000LandingCopy(program.slug) ?? fallbackCopy(program);
  const inject = (s: string) =>
    s
      .replace(/\b5-day\b/gi, days.toLowerCase())
      .replace(/\b5 days\b/gi, days.toLowerCase())
      .replace(/\bthe 5-day live\b/gi, `the ${days.toLowerCase()} live`);
  const faqs = (program.faqs?.length ? program.faqs : raw.faqs).map((f) => ({
    q: f.q,
    a: inject(f.a),
  }));
  const batchDate = program.nextBatchDate?.trim();
  if (batchDate) {
    const schedule = program.schedule?.trim();
    faqs.unshift({
      q: "When is the next batch?",
      a: `The next live batch starts ${batchDate}${schedule ? ` · ${schedule}` : ""}. Training length is ${days}. Each day has its own Zoom meeting.`,
    });
  }
  return {
    ...raw,
    tagline: program.subtitle?.trim() || raw.tagline,
    about: inject(raw.about),
    highlights: raw.highlights.map(inject),
    requirements: raw.requirements.map(inject),
    faqs,
  };
}

export function tutorLedLandingImage(program: {
  slug: string;
  heroSrc?: string;
  learnerHeroSrc?: string;
  category?: string;
}): string {
  const slug = program.slug.trim();
  if (UNIQUE_IMAGES[slug]) return UNIQUE_IMAGES[slug];
  const stored = (program.heroSrc || program.learnerHeroSrc || "").trim();
  if (stored && !GENERIC_HERO.has(stored)) return stored;
  if (program.category && CATEGORY_IMAGE[program.category]) return CATEGORY_IMAGE[program.category];
  return "/chatgpt-hero.png";
}
