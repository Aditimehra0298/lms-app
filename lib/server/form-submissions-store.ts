import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FormSubmissionType = "contact" | "newsletter" | "enrollment";
export type FormSubmissionStatus = "new" | "read" | "done" | "archived";

export type FormSubmissionView = "active" | "done" | "archived" | "all";

export type CreateFormSubmissionInput = {
  formType: FormSubmissionType;
  email: string;
  name?: string;
  phone?: string;
  subject?: string;
  category?: string;
  message?: string;
  pagePath?: string;
  metadata?: Record<string, unknown>;
};

export async function createFormSubmission(input: CreateFormSubmissionInput) {
  return prisma.lmsFormSubmission.create({
    data: {
      formType: input.formType,
      email: input.email.trim().toLowerCase(),
      name: input.name?.trim() || null,
      phone: input.phone?.trim() || null,
      subject: input.subject?.trim() || null,
      category: input.category?.trim() || null,
      message: input.message?.trim() || null,
      pagePath: input.pagePath?.trim() || null,
      metadata: input.metadata ?? undefined,
      status: "new",
    },
  });
}

export async function listFormSubmissions(filters: {
  formType?: string;
  status?: string;
  /** active = new+read (inbox), done, archived, or all rows */
  view?: FormSubmissionView;
  q?: string;
  take?: number;
}) {
  const q = filters.q?.trim();
  const view = filters.view;
  const statusWhere =
    filters.status
      ? { status: filters.status }
      : view === "active"
        ? { status: { in: ["new", "read"] } }
        : view === "done"
          ? { status: "done" }
          : view === "archived"
            ? { status: "archived" }
            : {};

  return prisma.lmsFormSubmission.findMany({
    where: {
      ...(filters.formType ? { formType: filters.formType } : {}),
      ...statusWhere,
      ...(q
        ? {
            OR: [
              { email: { contains: q } },
              { name: { contains: q } },
              { phone: { contains: q } },
              { message: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filters.take ?? 200,
  });
}

export async function updateFormSubmissionStatus(id: string, status: FormSubmissionStatus) {
  const existing = await prisma.lmsFormSubmission.findUnique({ where: { id } });
  if (!existing) throw new Error("Submission not found");

  const meta =
    existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? { ...(existing.metadata as Record<string, unknown>) }
      : {};

  if (status === "archived" && existing.status !== "archived") {
    meta.previousStatus = existing.status;
  }

  if (status === "new" || status === "read") {
    delete meta.previousStatus;
  }

  return prisma.lmsFormSubmission.update({
    where: { id },
    data: {
      status,
      metadata: Object.keys(meta).length > 0 ? meta : Prisma.DbNull,
    },
  });
}

/** Restore archived/done row back to inbox (new, or previous status if saved). */
export async function revertFormSubmissionToInbox(id: string) {
  const existing = await prisma.lmsFormSubmission.findUnique({ where: { id } });
  if (!existing) throw new Error("Submission not found");

  const meta =
    existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const prev = meta.previousStatus;
  const restoreStatus: FormSubmissionStatus =
    prev === "read" || prev === "new" ? prev : "new";

  const nextMeta = { ...meta };
  delete nextMeta.previousStatus;

  return prisma.lmsFormSubmission.update({
    where: { id },
    data: {
      status: restoreStatus,
      metadata: Object.keys(nextMeta).length > 0 ? nextMeta : Prisma.DbNull,
    },
  });
}
