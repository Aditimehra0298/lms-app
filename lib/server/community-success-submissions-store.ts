import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  CommunitySuccessSubmissionsStoreFile,
  StoredCommunitySuccessSubmission,
} from "@/lib/community-success-submission-types";

const storePath = path.join(process.cwd(), "data", "community-success-submissions.json");

async function ensureStoreFile(): Promise<void> {
  const dir = path.dirname(storePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    const empty: CommunitySuccessSubmissionsStoreFile = { submissions: [] };
    await fs.writeFile(storePath, JSON.stringify(empty, null, 2), "utf8");
  }
}

export async function readCommunitySuccessSubmissionsStore(): Promise<CommunitySuccessSubmissionsStoreFile> {
  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");
  try {
    const parsed = JSON.parse(raw) as CommunitySuccessSubmissionsStoreFile;
    return { submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [] };
  } catch {
    return { submissions: [] };
  }
}

async function writeStore(data: CommunitySuccessSubmissionsStoreFile): Promise<void> {
  await ensureStoreFile();
  await fs.writeFile(storePath, JSON.stringify(data, null, 2), "utf8");
}

export async function listSubmissionsForViewer(
  viewerEmail?: string | null,
): Promise<StoredCommunitySuccessSubmission[]> {
  const store = await readCommunitySuccessSubmissionsStore();
  const email = viewerEmail?.trim().toLowerCase() || "";
  return store.submissions
    .filter((s) => {
      if (s.status === "approved") return true;
      return email.length > 0 && s.authorEmail.toLowerCase() === email;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createCommunitySuccessSubmission(input: {
  authorEmail: string;
  authorName: string;
  courseSlug: string;
  courseTitle: string;
  externalPlatform?: string;
  body?: string;
  attachmentUrl: string;
}): Promise<StoredCommunitySuccessSubmission> {
  const store = await readCommunitySuccessSubmissionsStore();
  const row: StoredCommunitySuccessSubmission = {
    id: randomUUID(),
    authorEmail: input.authorEmail.trim().toLowerCase(),
    authorName: input.authorName.trim() || "Learner",
    courseSlug: input.courseSlug.trim(),
    courseTitle: input.courseTitle.trim(),
    externalPlatform: input.externalPlatform?.trim() || undefined,
    body: input.body?.trim() || undefined,
    attachmentUrl: input.attachmentUrl.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.submissions.unshift(row);
  await writeStore(store);
  return row;
}
