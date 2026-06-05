import type { SupplementaryDoc } from "@/lib/certificate-types";
import type { AdminContent, ManagedCourse } from "@/lib/content-schema";

/** Fallback certificate background when admin has not uploaded a custom file. */
export const DEFAULT_CERTIFICATE_TEMPLATE = "/certificates/haccp-certificate-template.jpg";

const DEFAULT_TEMPLATE = DEFAULT_CERTIFICATE_TEMPLATE;

export type ResolvedGlobalCertificateAssets = {
  templateImage: string;
  badgeImage: string;
  transcriptFile: string;
};

/** One shared design for every course — uploaded in Admin → Users & Access → Certificates. */
export function resolveGlobalCertificateAssets(
  content: AdminContent,
): ResolvedGlobalCertificateAssets {
  const g = content.globalCertificateAssets ?? {};
  return {
    templateImage: g.templateImage?.trim() || DEFAULT_TEMPLATE,
    badgeImage: g.badgeImage?.trim() || "",
    transcriptFile: g.transcriptFile?.trim() || "",
  };
}

export function globalCertificateAssetsReady(content: AdminContent): boolean {
  const a = resolveGlobalCertificateAssets(content);
  return Boolean(a.templateImage && a.badgeImage && a.transcriptFile);
}

/** Course badge from admin (per course) with global fallback. Same for all learners on that course. */
export function resolveCourseBadgeImage(content: AdminContent, course: ManagedCourse): string {
  const courseBadge = course.certificateConfig?.badgeImage?.trim();
  if (courseBadge) return courseBadge;
  return resolveGlobalCertificateAssets(content).badgeImage;
}

export function resolveCourseBadgeImageBySlug(content: AdminContent, courseSlug: string): string {
  const slug = courseSlug.trim();
  if (!slug) return resolveGlobalCertificateAssets(content).badgeImage;
  const course = content.managedCourses?.find((c) => c.slug === slug);
  if (!course) return resolveGlobalCertificateAssets(content).badgeImage;
  return resolveCourseBadgeImage(content, course);
}

/** Assets + transcript doc list for a single certificate issue. */
export function resolveCertificateAssetsForCourse(
  content: AdminContent,
  course: ManagedCourse,
): ResolvedGlobalCertificateAssets & { supplementaryDocs: SupplementaryDoc[] } {
  const global = resolveGlobalCertificateAssets(content);
  const docs: SupplementaryDoc[] = [];
  if (global.transcriptFile) {
    docs.push({ title: "Transcript", url: global.transcriptFile });
  }
  return {
    ...global,
    badgeImage: resolveCourseBadgeImage(content, course),
    supplementaryDocs: docs,
  };
}
