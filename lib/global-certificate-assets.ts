import type { SupplementaryDoc } from "@/lib/certificate-types";
import type { ManagedCourseCertificateConfig } from "@/lib/certificate-program-config";
import type { AdminContent, ManagedCourse } from "@/lib/content-schema";

/** Fallback certificate background when admin has not uploaded a custom file. */
export const DEFAULT_CERTIFICATE_TEMPLATE = "/certificates/haccp-certificate-template.jpg";

const DEFAULT_TEMPLATE = DEFAULT_CERTIFICATE_TEMPLATE;

export type ResolvedGlobalCertificateAssets = {
  templateImage: string;
  badgeImage: string;
  transcriptFile: string;
};

/** Default design — used when a course/program field is empty. */
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

export function findCertificateConfigForSlug(
  content: AdminContent,
  courseSlug: string,
): ManagedCourseCertificateConfig | undefined {
  const slug = courseSlug.trim();
  if (!slug) return undefined;
  const course = content.managedCourses?.find((c) => c.slug === slug);
  if (course?.certificateConfig) return course.certificateConfig;
  const program = content.tutorLedPrograms?.find((p) => p.slug === slug);
  return program?.certificateConfig;
}

export function resolveCertificateAssetsFromConfig(
  content: AdminContent,
  cfg: ManagedCourseCertificateConfig | undefined,
): ResolvedGlobalCertificateAssets & { supplementaryDocs: SupplementaryDoc[] } {
  const global = resolveGlobalCertificateAssets(content);
  const templateImage = cfg?.templateImage?.trim() || global.templateImage;
  const badgeImage = cfg?.badgeImage?.trim() || global.badgeImage;
  const transcriptFile = cfg?.transcriptFile?.trim() || global.transcriptFile;
  const docs: SupplementaryDoc[] = [];
  if (transcriptFile) {
    docs.push({ title: "Transcript", url: transcriptFile });
  }
  if (Array.isArray(cfg?.supplementaryDocs)) {
    for (const d of cfg.supplementaryDocs) {
      if (d.title?.trim() && d.url?.trim()) {
        docs.push({ title: d.title.trim(), url: d.url.trim() });
      }
    }
  }
  return {
    templateImage,
    badgeImage,
    transcriptFile,
    supplementaryDocs: docs,
  };
}

export function resolveCertificateAssetsForSlug(
  content: AdminContent,
  courseSlug: string,
): ResolvedGlobalCertificateAssets & { supplementaryDocs: SupplementaryDoc[] } {
  return resolveCertificateAssetsFromConfig(content, findCertificateConfigForSlug(content, courseSlug));
}

/** Per-course assets with global fallback. */
export function resolveCertificateAssetsForCourse(
  content: AdminContent,
  course: ManagedCourse,
): ResolvedGlobalCertificateAssets & { supplementaryDocs: SupplementaryDoc[] } {
  return resolveCertificateAssetsFromConfig(content, course.certificateConfig);
}

export function resolveCourseBadgeImage(content: AdminContent, course: ManagedCourse): string {
  return resolveCertificateAssetsForCourse(content, course).badgeImage;
}

export function resolveCourseBadgeImageBySlug(content: AdminContent, courseSlug: string): string {
  return resolveCertificateAssetsForSlug(content, courseSlug).badgeImage;
}
