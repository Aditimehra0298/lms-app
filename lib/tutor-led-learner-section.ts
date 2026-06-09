import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import {
  groupLearningMaterialsByKind,
  type TutorLedLearningMaterial,
} from "@/lib/tutor-led-learning-tools";

export type TutorLedLearnerForumPost = {
  user: string;
  title: string;
  replies: number;
};

export type TutorLedLearnerAchievement = {
  label: string;
  icon: string;
};

export type TutorLedLearnerResourceTileType =
  | "pdf"
  | "slides"
  | "workbook"
  | "podcast"
  | "links";

export type TutorLedLearnerResourceTile = {
  label: string;
  count: string;
  type: TutorLedLearnerResourceTileType;
};

export type TutorLedLearnerQuickLink = {
  label: string;
  href: string;
  icon: string;
};

/** Admin-managed copy & config for `/my-learning/course/[slug]` tutor-led hub. */
export type TutorLedLearnerSection = {
  enrolledBadgeLabel?: string;
  checklistItems?: string[];
  examEligibleTitle?: string;
  examLockedTitle?: string;
  examLockedHint?: string;
  startExamLabel?: string;
  nextSessionPrefix?: string;
  joinZoomLabel?: string;
  watchRecordingLabel?: string;
  downloadNotesLabel?: string;
  upcomingSessionTitle?: string;
  upcomingSessionBadge?: string;
  certificateCenterTitle?: string;
  liveClassroomTitle?: string;
  quickLinksTitle?: string;
  recordingsTitle?: string;
  forumTitle?: string;
  resourcesTitle?: string;
  finalExamTitle?: string;
  finalExamDescription?: string;
  feedbackTitle?: string;
  continueLearningTitle?: string;
  achievementsTitle?: string;
  learningJourneyTitle?: string;
  courseProgressTitle?: string;
  showLiveNowBadge?: boolean;
  examQuestions?: number;
  examMinutes?: number;
  examPassingScore?: number;
  /** CSV exam file for the final assessment (Admin upload URL). */
  examUploadUrl?: string;
  reviewRating?: number;
  reviewCount?: number;
  forumPosts?: TutorLedLearnerForumPost[];
  resourceTiles?: TutorLedLearnerResourceTile[];
  useMaterialCounts?: boolean;
  achievements?: TutorLedLearnerAchievement[];
  quickLinks?: TutorLedLearnerQuickLink[];
  footerJoinLabel?: string;
  footerRecordingLabel?: string;
  footerNotesLabel?: string;
  footerTrainerLabel?: string;
};

export type ResolvedTutorLedLearnerSection = Required<
  Omit<
    TutorLedLearnerSection,
    | "forumPosts"
    | "resourceTiles"
    | "achievements"
    | "quickLinks"
    | "checklistItems"
  >
> & {
  checklistItems: string[];
  forumPosts: TutorLedLearnerForumPost[];
  resourceTiles: TutorLedLearnerResourceTile[];
  achievements: TutorLedLearnerAchievement[];
  quickLinks: TutorLedLearnerQuickLink[];
};

const DEFAULT_CHECKLIST = [
  "All sessions attended",
  "Learning materials completed",
  "Recordings watched",
  "Assignments completed",
];

const DEFAULT_FORUM: TutorLedLearnerForumPost[] = [
  { user: "Priya S.", title: "Clarification on hazard analysis steps", replies: 4 },
  { user: "James R.", title: "Best practices for temperature logs?", replies: 2 },
  { user: "Trainer", title: "Day 2 materials uploaded — check resources", replies: 8 },
];

const DEFAULT_ACHIEVEMENTS: TutorLedLearnerAchievement[] = [
  { label: "First Class Completed", icon: "Trophy" },
  { label: "Quiz Master", icon: "Star" },
  { label: "Active Learner", icon: "Award" },
  { label: "Feedback Star", icon: "MessageCircle" },
];

const DEFAULT_QUICK_LINKS: TutorLedLearnerQuickLink[] = [
  { label: "Download notes", href: "#learning-materials", icon: "Download" },
  { label: "View assignments", href: "/my-learning?tab=assignments", icon: "ClipboardList" },
  { label: "Take quiz", href: "#live-curriculum", icon: "FileText" },
  { label: "Join discussion", href: "/my-learning?tab=community", icon: "MessageCircle" },
];

const DEFAULT_RESOURCE_TILES: TutorLedLearnerResourceTile[] = [
  { label: "PDF Notes", count: "12 Files", type: "pdf" },
  { label: "Presentation Slides", count: "13 Files", type: "slides" },
  { label: "Workbook", count: "8 Files", type: "workbook" },
  { label: "Podcast", count: "6 Episodes", type: "podcast" },
  { label: "External Resources", count: "15 Links", type: "links" },
];

function fileCount(n: number): string {
  if (n <= 0) return "0 Files";
  return `${n} ${n === 1 ? "File" : "Files"}`;
}

function applyMaterialCounts(
  tiles: TutorLedLearnerResourceTile[],
  materials: TutorLedLearningMaterial[],
): TutorLedLearnerResourceTile[] {
  const grouped = groupLearningMaterialsByKind(materials);
  const counts: Record<TutorLedLearnerResourceTileType, string | undefined> = {
    pdf: fileCount(grouped["pad-notes"].length),
    slides: fileCount(grouped.ppt.length),
    workbook: fileCount(grouped.webbook.length),
    podcast: undefined,
    links: undefined,
  };
  return tiles.map((tile) =>
    counts[tile.type] ? { ...tile, count: counts[tile.type]! } : tile,
  );
}

export const DEFAULT_TUTOR_LED_LEARNER_SECTION: ResolvedTutorLedLearnerSection = {
  enrolledBadgeLabel: "Enrolled",
  checklistItems: DEFAULT_CHECKLIST,
  examEligibleTitle: "You are eligible for the Final Certification Exam",
  examLockedTitle: "Complete all training days to unlock the final exam",
  examLockedHint: "Attend every live Zoom session — the final exam opens after all training days.",
  startExamLabel: "Start final exam",
  nextSessionPrefix: "Next live session:",
  joinZoomLabel: "Join Zoom session",
  watchRecordingLabel: "Watch recording",
  downloadNotesLabel: "Download notes",
  upcomingSessionTitle: "Upcoming Live Session",
  upcomingSessionBadge: "Today",
  certificateCenterTitle: "Certificate Center",
  liveClassroomTitle: "Live Classroom",
  quickLinksTitle: "Quick links",
  recordingsTitle: "Session recordings",
  forumTitle: "Discussion forum",
  resourcesTitle: "Learning resources",
  finalExamTitle: "Final Certification Assessment",
  finalExamDescription: "Complete the final exam to earn your certificate of attainment.",
  feedbackTitle: "Feedback & reviews",
  continueLearningTitle: "Continue learning",
  achievementsTitle: "Achievements",
  learningJourneyTitle: "Learning Journey",
  courseProgressTitle: "Course Progress",
  showLiveNowBadge: true,
  examQuestions: 50,
  examMinutes: 60,
  examPassingScore: 70,
  reviewRating: 4.9,
  reviewCount: 125,
  forumPosts: DEFAULT_FORUM,
  resourceTiles: DEFAULT_RESOURCE_TILES,
  useMaterialCounts: true,
  achievements: DEFAULT_ACHIEVEMENTS,
  quickLinks: DEFAULT_QUICK_LINKS,
  footerJoinLabel: "Join live session",
  footerRecordingLabel: "Watch last recording",
  footerNotesLabel: "Download notes",
  footerTrainerLabel: "Ask trainer",
};

export function resolveLearnerSection(
  program: Pick<TutorLedProgramStored, "learnerSection" | "learningMaterials">,
): ResolvedTutorLedLearnerSection {
  const raw = program.learnerSection ?? {};
  const merged: ResolvedTutorLedLearnerSection = {
    ...DEFAULT_TUTOR_LED_LEARNER_SECTION,
    ...raw,
    checklistItems: raw.checklistItems?.length ? raw.checklistItems : DEFAULT_CHECKLIST,
    forumPosts: raw.forumPosts?.length ? raw.forumPosts : DEFAULT_FORUM,
    achievements: raw.achievements?.length ? raw.achievements : DEFAULT_ACHIEVEMENTS,
    quickLinks: raw.quickLinks?.length ? raw.quickLinks : DEFAULT_QUICK_LINKS,
    resourceTiles: raw.resourceTiles?.length ? raw.resourceTiles : DEFAULT_RESOURCE_TILES,
    useMaterialCounts: raw.useMaterialCounts ?? true,
  };

  if (merged.useMaterialCounts) {
    merged.resourceTiles = applyMaterialCounts(
      merged.resourceTiles,
      program.learningMaterials ?? [],
    );
  }

  return merged;
}

export function newLearnerForumPost(): TutorLedLearnerForumPost {
  return { user: "", title: "", replies: 0 };
}

export function newLearnerAchievement(): TutorLedLearnerAchievement {
  return { label: "", icon: "Trophy" };
}

export function newLearnerQuickLink(): TutorLedLearnerQuickLink {
  return { label: "", href: "#", icon: "Link2" };
}

export function newLearnerResourceTile(): TutorLedLearnerResourceTile {
  return { label: "", count: "0 Files", type: "pdf" };
}
