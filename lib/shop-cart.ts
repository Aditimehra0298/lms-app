import type { TutorLedProgramStored } from "@/lib/default-tutor-led-programs";

/** Cart / checkout line item (stored in `sft_cart`). */
export type ShopCartItem = {
  slug: string;
  title: string;
  price: string;
  image?: string;
  qty: number;
  /** Live programs from Admin → Tutor Led vs catalog managed courses */
  deliveryKind?: "managed" | "tutor-led";
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
  const modules = Math.max(1, program.curriculum.length * 5);
  const durationFromDetail = program.batchDetails?.find((d) => d.label === "Duration")?.value;
  return {
    ...item,
    deliveryKind: "tutor-led",
    learningModules: modules,
    learningDuration: durationFromDetail?.trim() || "Live cohort",
    learningTone: "amber",
    learningAction: "Continue",
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
