import type { SupplementaryDoc } from "@/lib/certificate-types";
import type { AdminContent, ManagedCourse } from "@/lib/content-schema";

const DEFAULT_TEMPLATE = "/certificates/haccp-certificate-template.jpg";

export type ResolvedGlobalCertificateAssets = {
  templateImage: string;
  badgeImage: string;
  transcriptFile: string;
};

/** One shared design for every course — uploaded once in Admin → Certificates. */
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
  return { ...global, supplementaryDocs: docs };
}
