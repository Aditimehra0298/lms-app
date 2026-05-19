import { Award, BookOpen, Globe, MessageCircle, MonitorPlay, Users, Video, Zap } from "lucide-react";
import type { ManagedCourse } from "@/lib/content-schema";
import type { PostHeroCourse } from "@/components/TutorLedPostHeroSections";

const DEFAULT_HIGHLIGHTS = [
  "Learn at your own pace with structured modules",
  "Replay lessons and revisit materials anytime",
  "Quizzes and exams to check your understanding",
  "Certificate when you complete the program",
  "Study on desktop or mobile",
];

const DEFAULT_FAQS: { q: string; a: string }[] = [
  {
    q: "How long do I have access?",
    a: "You can study on your own schedule. Access duration depends on your enrollment plan — details are shown at checkout.",
  },
  {
    q: "Are there live sessions?",
    a: "This is a self-paced program. You work through recorded lessons and materials without fixed class times.",
  },
  {
    q: "Do I get a certificate?",
    a: "When you complete the required modules and any final assessment, you can earn a completion certificate.",
  },
];

function highlightsFromCourse(c: ManagedCourse): string[] {
  if (c.highlights && c.highlights.length > 0) return c.highlights;
  const fromMods =
    c.curriculum?.flatMap((m) => [m.title, ...m.items.map((i) => i.label)]).filter(Boolean) ?? [];
  const uniq = [...new Set(fromMods)].slice(0, 8);
  return uniq.length > 0 ? uniq : DEFAULT_HIGHLIGHTS;
}

function curriculumFromManaged(c: ManagedCourse): PostHeroCourse["curriculum"] {
  const mods = c.curriculum ?? [];
  if (mods.length === 0) {
    return [
      {
        week: 1,
        label: "Introduction",
        topic: c.title || "Course overview",
        keyLearning: c.subtitle || "Goals, structure, and how to succeed in this program.",
        sessionType: "On-demand",
      },
    ];
  }
  return mods.map((m, i) => ({
    week: i + 1,
    label: m.title.length > 48 ? `${m.title.slice(0, 45)}…` : m.title,
    topic: m.items[0]?.label ?? m.title,
    keyLearning:
      m.items
        .slice(0, 5)
        .map((it) => it.label)
        .join(" · ") || "Lessons and practice",
    sessionType: m.items.some((x) => x.kind === "exam") ? "Video + quiz" : "On-demand",
  }));
}

export function managedCourseToPostHero(c: ManagedCourse): PostHeroCourse {
  const name = (c.instructorName ?? "").trim() || "Your instructor";
  return {
    trainer: {
      name,
      role: c.trainerRole?.trim() || "Instructor",
      experience: c.trainerExperience?.trim() || `${c.level} · ${c.duration}`,
      bio: c.trainerBio?.trim() || c.subtitle || "Experienced instructor guiding you through this program.",
      certifications:
        c.trainerCertifications && c.trainerCertifications.length > 0 ? c.trainerCertifications : ["Verified instructor"],
      workedWith: c.trainerWorkedWith && c.trainerWorkedWith.length > 0 ? c.trainerWorkedWith : ["Global learners"],
    },
    highlights: highlightsFromCourse(c),
    curriculum: curriculumFromManaged(c),
    whyChoose: [
      { icon: MonitorPlay, title: "Structured path", desc: "Clear modules from fundamentals to completion." },
      { icon: BookOpen, title: "Deep explanations", desc: "Concepts broken down with examples you can revisit." },
      { icon: Users, title: "Learn your way", desc: "Fit study around work and life — no fixed class times." },
      { icon: Zap, title: "Stay motivated", desc: "Progress checkpoints and assessments keep you on track." },
      { icon: Globe, title: "Anywhere access", desc: "Use your laptop or tablet whenever you are ready." },
    ],
    faqs: c.faqs && c.faqs.length > 0 ? c.faqs : DEFAULT_FAQS,
    features: [
      { icon: MonitorPlay, title: "HD Video Lessons", desc: "Watch anytime — pause, rewind, and revisit" },
      { icon: BookOpen, title: "Course Materials", desc: "Readings, notes, and downloads in each module" },
      { icon: MessageCircle, title: "Instructor Support", desc: "Get answers when you need clarification" },
      { icon: Users, title: "Self-Paced Learning", desc: "Study on the schedule that fits your life" },
      { icon: Video, title: "Lifetime Access", desc: "Return to lessons whenever you need a refresher" },
      { icon: Award, title: "Certificate", desc: "Earn a completion certificate when you finish" },
    ],
  };
}

/** For avatar initial display consistency with hero. */
export function instructorInitialLetter(c: ManagedCourse): string {
  const name = (c.instructorName ?? "").trim() || "I";
  return name.replace(/^Mr\.?\s*|^Ms\.?\s*|^Mrs\.?\s*|^Dr\.?\s*/i, "").charAt(0) || "?";
}
