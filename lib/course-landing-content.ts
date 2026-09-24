import type { ManagedCourse, ManagedCourseHeroSection } from "@/lib/content-schema";
import { isCehSlug } from "@/lib/ceh-course";
import { canonicalCategorySlug } from "@/lib/category-page-resolve";
import type { ResolvedCourseHero } from "@/lib/course-hero-resolve";
import {
  learningOutcomeBullets,
  requirementBullets,
  whatYouLearnGrid,
} from "@/lib/course-detail-template";
import type { LucideIcon } from "lucide-react";
import { Award, FileText, FolderKanban, Infinity, Smartphone, Tv, Video } from "lucide-react";

const CYBER_LEARN_GRID: [string, string][] = [
  [
    "Threat Detection",
    "Identify, analyze, and respond to potential security breaches using industry-standard tools.",
  ],
  [
    "Network Security",
    "Configure firewalls, VPNs, and secure architectures to protect organizational assets.",
  ],
  [
    "Incident Response",
    "Follow structured playbooks to contain, eradicate, and recover from security incidents.",
  ],
  [
    "Penetration Testing",
    "Conduct ethical hacking exercises to uncover vulnerabilities before attackers do.",
  ],
  [
    "Security Frameworks",
    "Apply NIST, ISO 27001, and compliance-aligned controls in real environments.",
  ],
  [
    "Real-world Projects",
    "Complete hands-on labs and capstone scenarios modeled on live security operations.",
  ],
];

const CYBER_OUTCOMES = [
  "Identify and analyze cyber threats across endpoints, networks, and cloud workloads",
  "Design and harden network defenses using industry-standard tools and frameworks",
  "Execute incident response workflows from detection through recovery",
  "Perform ethical hacking and vulnerability assessments in controlled lab environments",
  "Align security practices with compliance, risk management, and business objectives",
];

const CYBER_REQUIREMENTS = [
  "Basic understanding of networking and operating systems",
  "Familiarity with IT concepts is helpful but not required",
  "A computer with internet access to complete hands-on labs",
];

const CEH_ABOUT =
  "This self-paced professional course delivers 85 video lectures and 85 assessments across the ethical hacking lifecycle. You begin with ethical hacking foundations, the modern threat landscape, cyber kill chain and MITRE ATT&CK, then move into footprinting, reconnaissance, and network scanning.\n\nLater modules continue through containers/Kubernetes and cryptography — matching the Cybersecurity, Ethical Hacking & Penetration Testing Professional Course certificate pathway (25 hours, e-learning, video-based, self-paced).";

const CEH_OUTCOMES = [
  "Explain ethical hacking concepts, laws, and security standards",
  "Apply footprinting and reconnaissance techniques responsibly",
  "Scan and interpret network attack surfaces",
  "Relate threats to Cyber Kill Chain and MITRE ATT&CK",
  "Assess modern surfaces including containers and cryptography themes",
  "Complete module assessments to prove understanding before moving on",
];

const CEH_LEARN_GRID: [string, string][] = [
  ["Ethical hacking foundations", "Threat landscape, controls, laws, and standards."],
  ["ATT&CK & kill chain", "How real adversary behavior is framed."],
  ["Footprinting & recon", "Information gathering before deeper testing."],
  ["Network scanning", "Discover hosts, ports, and services."],
  ["Modern platforms", "Containers, Kubernetes, and crypto modules."],
  ["Assessment discipline", "Prove learning after each lecture part."],
];

const CEH_REQUIREMENTS = [
  "Basic networking and OS familiarity",
  "Authorization to practice only on permitted systems",
  "Computer with internet access for video lessons",
  "Commitment to complete lecture + assessment pairs",
];

const CYBER_ABOUT =
  "This comprehensive course takes you from foundational cybersecurity concepts to advanced defensive and offensive techniques. You will work through real-world scenarios, hands-on labs, and structured assessments designed to build job-ready skills for security analyst and engineer roles.";

export function landingAboutText(
  course: ManagedCourse,
  heroAbout?: string,
): string {
  const custom = (heroAbout ?? "").trim();
  if (custom) return custom;
  if (isCehSlug(course.slug)) return CEH_ABOUT;
  const cat = canonicalCategorySlug(course.category);
  if (cat === "cyber-security") return CYBER_ABOUT;
  return course.subtitle.trim();
}

export function landingLearnOutcomes(course: ManagedCourse): string[] {
  if (isCehSlug(course.slug)) return CEH_OUTCOMES;
  const cat = canonicalCategorySlug(course.category);
  if (cat === "cyber-security") return CYBER_OUTCOMES;
  return learningOutcomeBullets(course.title).slice(0, 5);
}

export function landingWhatYouLearnGrid(course: ManagedCourse): [string, string][] {
  if (isCehSlug(course.slug)) return CEH_LEARN_GRID;
  const cat = canonicalCategorySlug(course.category);
  if (cat === "cyber-security") return CYBER_LEARN_GRID;
  return whatYouLearnGrid(course.title);
}

export function landingRequirements(course: ManagedCourse): string[] {
  if (isCehSlug(course.slug)) return CEH_REQUIREMENTS;
  const cat = canonicalCategorySlug(course.category);
  if (cat === "cyber-security") return CYBER_REQUIREMENTS;
  return requirementBullets(
    cat
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  ).slice(0, 3);
}

export type CourseIncludeRow = { icon: LucideIcon; text: string };

export function landingCourseIncludes(
  course: ManagedCourse,
  hero: ResolvedCourseHero,
  lectureCount: number,
  customLines?: string[],
): CourseIncludeRow[] {
  if (customLines && customLines.length > 0) {
    const icons = [Video, FileText, FolderKanban, Infinity, Smartphone, Award];
    return customLines.map((text, i) => ({
      icon: icons[i % icons.length]!,
      text,
    }));
  }

  const duration = course.duration?.trim() || "12 Hours";
  const resources =
    lectureCount > 0 ? `${lectureCount} downloadable resources` : "85 downloadable resources";
  const projects = hero.projects?.trim() || "5 hands-on projects";
  const access =
    hero.access?.toLowerCase() === "lifetime"
      ? "Full lifetime access"
      : `Full ${hero.access} access`;

  return [
    { icon: Video, text: `${duration} on-demand video` },
    { icon: FileText, text: resources },
    { icon: FolderKanban, text: projects },
    { icon: Infinity, text: access },
    { icon: Tv, text: "Access on mobile and TV" },
    { icon: Award, text: "Certificate of completion" },
  ];
}

export function parseCourseIncludesFromHero(
  hero: ManagedCourseHeroSection | undefined,
): string[] | undefined {
  const lines = hero?.courseIncludes;
  if (!Array.isArray(lines)) return undefined;
  const filtered = lines.map((s) => String(s).trim()).filter(Boolean);
  return filtered.length > 0 ? filtered : undefined;
}
