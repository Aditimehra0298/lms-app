import { isCertificateWorkflowMediaFile } from "@/lib/server/certificate-workflow-media";
import { readAdminContent } from "@/lib/server/content-store";
import { isAdminEmail } from "@/lib/server/admin-emails";
import { prisma } from "@/lib/prisma";
import type { MediaAccessPayload } from "@/lib/server/media-access-token";
import { mimeFromFileName } from "@/lib/server/private-media-storage";

async function learnerHasCourseAccess(email: string, courseSlug: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const slug = courseSlug.trim();
  if (!normalized || !slug) return false;

  try {
    const purchase = await prisma.lmsPurchase.findFirst({
      where: { learnerEmail: normalized, courseSlug: slug },
    });
    if (purchase) return true;
  } catch {
    /* DATABASE_URL optional */
  }

  if (process.env.MEDIA_REQUIRE_MYSQL_ENROLLMENT === "true") {
    return false;
  }

  return Boolean(normalized && slug);
}

async function isPublishedCatalogImage(courseSlug: string, fileName: string): Promise<boolean> {
  try {
    const content = await readAdminContent();
    const course = (content.managedCourses ?? []).find((c) => c.slug === courseSlug);
    if (!course || course.published === false) return false;
    const refs = [
      course.image,
      course.hero?.backgroundImage,
      course.hero?.previewImage,
      course.hero?.certificatePreviewImage,
      course.instructorSection?.teamImage,
      course.certificateConfig?.templateImage,
      course.certificateConfig?.badgeImage,
      course.certificateConfig?.transcriptFile,
    ];
    return refs.some((ref) => typeof ref === "string" && ref.includes(fileName));
  } catch {
    return false;
  }
}

export async function mediaAccessAllowed(
  payload: MediaAccessPayload,
  requestEmail?: string,
): Promise<boolean> {
  const fileName = payload.f;
  const mime = mimeFromFileName(fileName);
  const isVideo = mime.startsWith("video/");
  const isDoc =
    mime.startsWith("application/") || mime === "text/csv" || mime === "text/plain";

  if (payload.scope === "admin") {
    const email = (requestEmail ?? payload.email ?? "").trim().toLowerCase();
    if (!email) return false;

    // Strong mode: only allow real admin users that exist in MySQL.
    // This prevents “guessed admin email” token abuse.
    if (process.env.MEDIA_TECHNICIAN_ONLY === "true") {
      try {
        const user = await prisma.lmsUser.findUnique({
          where: { email },
          select: { role: true },
        });
        return user?.role === "admin";
      } catch {
        return false;
      }
    }

    // Fallback (dev mode): allow based on configured admin emails list.
    return isAdminEmail(email);
  }

  if (payload.scope === "workflow") {
    return isCertificateWorkflowMediaFile(fileName);
  }

  if (payload.scope === "catalog") {
    if (isVideo || isDoc) return false;
    if (!mime.startsWith("image/")) return false;
    const course = payload.course?.trim();
    if (!course) return false;
    return isPublishedCatalogImage(course, fileName);
  }

  if (payload.scope === "learner") {
    const email = (requestEmail ?? payload.email ?? "").trim().toLowerCase();
    const course = payload.course?.trim();
    if (!email || !course) return false;
    return learnerHasCourseAccess(email, course);
  }

  return false;
}
