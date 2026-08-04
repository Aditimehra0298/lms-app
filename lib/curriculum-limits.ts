/**
 * Curriculum module limits — intentionally unlimited for admin uploads.
 * Practical bounds are request/DB size only (timeouts + MySQL packet), not a module count.
 */
export const MAX_CURRICULUM_MODULES = Number.POSITIVE_INFINITY;

export function assertCurriculumModuleCapacity(
  curriculum: unknown[],
): { ok: true } | { ok: false; error: string } {
  if (!Array.isArray(curriculum)) {
    return { ok: false, error: "curriculum must be an array" };
  }
  return { ok: true };
}
