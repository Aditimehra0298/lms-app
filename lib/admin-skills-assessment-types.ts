export type SkillsAssessmentRow = {
  id: string;
  learnerEmail: string;
  learnerName: string | null;
  registrationId: number | null;
  courseSlug: string;
  courseTitle: string;
  skillArea: string;
  assessmentType: "module_exam" | "course_completion" | "certificate";
  assessmentTitle: string;
  moduleIndex: number | null;
  scorePercent: number | null;
  passed: boolean | null;
  status: string;
  assessedAt: string | null;
  certificateNumber: string | null;
};
