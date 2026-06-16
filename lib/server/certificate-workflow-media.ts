import type { AdminContent } from "@/lib/content-schema";
import { readAdminContent } from "@/lib/server/content-store";
import { storageFileNameFromUrl } from "@/lib/server/private-media-storage";

function addUrlRef(refs: Set<string>, url?: string | null): void {
  const name = storageFileNameFromUrl(url?.trim() ?? "");
  if (name) refs.add(name);
}

/** File names allowed for n8n workflow downloads (certificate / badge / transcript samples). */
export function collectCertificateWorkflowMediaFileNames(content: AdminContent): Set<string> {
  const refs = new Set<string>();
  const g = content.globalCertificateAssets ?? {};
  addUrlRef(refs, g.templateImage);
  addUrlRef(refs, g.badgeImage);
  addUrlRef(refs, g.transcriptFile);

  for (const course of content.managedCourses ?? []) {
    const cfg = course.certificateConfig ?? {};
    addUrlRef(refs, cfg.templateImage);
    addUrlRef(refs, cfg.badgeImage);
    addUrlRef(refs, cfg.transcriptFile);
    if (Array.isArray(cfg.supplementaryDocs)) {
      for (const doc of cfg.supplementaryDocs) addUrlRef(refs, doc.url);
    }
  }

  for (const program of content.tutorLedPrograms ?? []) {
    const cfg = program.certificateConfig ?? {};
    addUrlRef(refs, cfg.templateImage);
    addUrlRef(refs, cfg.badgeImage);
    addUrlRef(refs, cfg.transcriptFile);
    if (Array.isArray(cfg.supplementaryDocs)) {
      for (const doc of cfg.supplementaryDocs) addUrlRef(refs, doc.url);
    }
  }

  return refs;
}

export async function isCertificateWorkflowMediaFile(fileName: string): Promise<boolean> {
  const safe = fileName.trim();
  if (!safe || safe.includes("..") || safe.includes("/")) return false;
  const content = await readAdminContent();
  return collectCertificateWorkflowMediaFileNames(content).has(safe);
}
