/** URL-safe slug for catalog courses and programs. */
export function slugifyCourseTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueCourseSlug(base: string, taken: Set<string>): string {
  const root = slugifyCourseTitle(base) || "course";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
