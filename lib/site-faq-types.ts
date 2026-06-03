export type SiteFaqItem = { q: string; a: string };

export type SiteFaqGroup = {
  /** Matches admin FAQ target id (home, courses-page, course:slug, tutor-led:slug). */
  id: string;
  label: string;
  href?: string;
  items: SiteFaqItem[];
};
