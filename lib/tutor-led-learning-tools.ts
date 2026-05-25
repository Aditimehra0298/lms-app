export type TutorLedToolKind = "pad-notes" | "ppt" | "webbook";

/** Admin-managed row on a tutor-led program; learners only download. */
export type TutorLedLearningMaterial = {
  id: string;
  kind: TutorLedToolKind;
  title: string;
  downloadUrl: string;
};

export function groupLearningMaterialsByKind(
  materials: TutorLedLearningMaterial[],
): Record<TutorLedToolKind, TutorLedLearningMaterial[]> {
  const map: Record<TutorLedToolKind, TutorLedLearningMaterial[]> = {
    "pad-notes": [],
    ppt: [],
    webbook: [],
  };
  for (const item of materials) {
    if (map[item.kind]) map[item.kind].push(item);
  }
  return map;
}

export function newLearningMaterialId() {
  return `mat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const TUTOR_LED_TOOL_META: Record<
  TutorLedToolKind,
  { label: string; shortLabel: string; description: string }
> = {
  "pad-notes": {
    label: "Pad Notes",
    shortLabel: "Notes",
    description: "Your scratchpad and session notes",
  },
  ppt: {
    label: "PPT",
    shortLabel: "Slides",
    description: "Presentations and slide decks",
  },
  webbook: {
    label: "Webbook",
    shortLabel: "Webbook",
    description: "Interactive workbook and readings",
  },
};
