import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";
import { resolveTrainingDuration } from "@/lib/tutor-led-training-schedule";
import {
  getProgramTrainingDays,
  isWorkshopProgram,
} from "@/lib/workshop-program";

/** Cart / checkout line item (stored in `sft_cart`). */
export type ShopCartItem = {
  slug: string;
  title: string;
  price: string;
  image?: string;
  qty: number;
  /** Live programs from Admin → Tutor Led vs one-day workshops vs catalog courses */
  deliveryKind?: "managed" | "tutor-led" | "workshop";
  learningModules?: number;
  learningDuration?: string;
  learningTone?: string;
  learningAction?: string;
};

export function tutorLedProgramBySlug(
  programs: TutorLedProgramStored[] | undefined,
  slug: string,
): TutorLedProgramStored | null {
  const hit = programs?.find((p) => p.slug === slug && p.published);
  return hit ?? null;
}

/** Attach tutor-led progress metadata when the slug matches a published program. */
export function applyTutorLedShopMeta(
  item: ShopCartItem,
  programs: TutorLedProgramStored[] | undefined,
): ShopCartItem {
  const program = tutorLedProgramBySlug(programs, item.slug);
  if (!program) return item;
  const workshop = isWorkshopProgram(program);
  return {
    ...item,
    deliveryKind: workshop ? "workshop" : "tutor-led",
    learningModules: getProgramTrainingDays(program),
    learningDuration: workshop ? "1 Day" : resolveTrainingDuration(program),
    learningTone: workshop ? "rose" : "amber",
    learningAction: workshop ? "Join workshop" : "Continue",
    image: item.image || program.heroSrc,
  };
}

export async function fetchTutorLedProgramsClient(): Promise<TutorLedProgramStored[]> {
  try {
    const res = await fetch("/api/admin/content", { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { tutorLedPrograms?: TutorLedProgramStored[] };
    return Array.isArray(data.tutorLedPrograms) ? data.tutorLedPrograms : [];
  } catch {
    return [];
  }
}
