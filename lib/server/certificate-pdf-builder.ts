import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  isPngImage,
  loadCertificateTemplateBytes,
} from "@/lib/server/certificate-template-image";
import { resolveCertificateTemplateLayout } from "@/lib/certificate-template-layout";
import { formatGrade } from "@/lib/certificate-payload-fields";

export type BuildTemplatedCertificatePdfInput = {
  learnerName: string;
  courseTitle: string;
  certificateNumber: string;
  issueDate: string;
  scorePercent?: number | null;
  templateImageUrl: string;
  badgeImageUrl?: string | null;
  layout?: {
    nameTopPercent?: number;
    numberTopPercent?: number;
    dateTopPercent?: number;
    overlayCourseTitle?: boolean;
    overlayScore?: boolean;
    overlayBadge?: boolean;
  };
};

export type BuildCourseCertificatePdfInput = BuildTemplatedCertificatePdfInput & {
  transcriptImageUrl?: string | null;
  grade?: string | null;
};

async function embedImage(pdfDoc: PDFDocument, bytes: Buffer) {
  return isPngImage(bytes) ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes);
}

function yFromTop(pageHeight: number, topPercent: number, fontSize: number): number {
  return pageHeight - (topPercent / 100) * pageHeight - fontSize * 0.75;
}

/** Build one PDF page: full uploaded template at native size + centered text overlays. */
async function drawTemplatePage(input: {
  pdfDoc: PDFDocument;
  templateBytes: Buffer;
  badgeImageUrl?: string | null;
  layout: ReturnType<typeof resolveCertificateTemplateLayout>;
  learnerName: string;
  certificateNumber: string;
  issueDate: string;
  courseTitle?: string;
  scorePercent?: number | null;
  /** Transcript page uses simpler field layout. */
  mode?: "certificate" | "transcript";
  grade?: string | null;
}): Promise<void> {
  const embedded = await embedImage(input.pdfDoc, input.templateBytes);
  const pageWidth = embedded.width;
  const pageHeight = embedded.height;
  const page = input.pdfDoc.addPage([pageWidth, pageHeight]);

  page.drawImage(embedded, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  if (input.badgeImageUrl?.trim() && input.mode !== "transcript" && input.layout.overlayBadge) {
    const badgeBytes = await loadCertificateTemplateBytes(input.badgeImageUrl);
    if (badgeBytes) {
      const badge = await embedImage(input.pdfDoc, badgeBytes);
      const badgeSize = pageHeight * 0.14;
      page.drawImage(badge, {
        x: pageWidth * 0.92 - badgeSize,
        y: pageHeight * 0.92 - badgeSize,
        width: badgeSize,
        height: badgeSize,
      });
    }
  }

  const fontBold = await input.pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const font = await input.pdfDoc.embedFont(StandardFonts.TimesRoman);
  const dark = rgb(0.1, 0.1, 0.18);
  const mid = rgb(0.2, 0.2, 0.2);
  const muted = rgb(0.27, 0.27, 0.27);

  const drawCentered = (
    text: string,
    y: number,
    size: number,
    textFont: typeof fontBold,
    color: typeof dark,
  ) => {
    const textWidth = textFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - textWidth) / 2,
      y,
      size,
      font: textFont,
      color,
    });
  };

  const drawLeft = (
    text: string,
    xPercent: number,
    y: number,
    size: number,
    textFont: typeof font,
    color: typeof dark,
  ) => {
    page.drawText(text, {
      x: (xPercent / 100) * pageWidth,
      y,
      size,
      font: textFont,
      color,
    });
  };

  if (input.mode === "transcript") {
    const bodySize = Math.max(10, pageHeight * 0.018);
    drawLeft(input.learnerName, 14, yFromTop(pageHeight, 22, bodySize), bodySize, font, dark);
    if (input.grade) {
      drawLeft(input.grade, 72, yFromTop(pageHeight, 24, bodySize), bodySize, font, mid);
    }
    const footerSize = Math.max(9, pageHeight * 0.014);
    drawLeft(
      input.certificateNumber,
      12,
      yFromTop(pageHeight, 91, footerSize),
      footerSize,
      font,
      mid,
    );
    drawLeft(
      input.issueDate,
      50,
      yFromTop(pageHeight, 91, footerSize),
      footerSize,
      font,
      mid,
    );
    return;
  }

  const nameSize = Math.max(18, pageHeight * 0.045);
  const numberSize = Math.max(11, pageHeight * 0.022);
  const detailSize = Math.max(9, pageHeight * 0.016);
  const layout = input.layout;

  drawCentered(
    input.learnerName,
    yFromTop(pageHeight, layout.nameTopPercent, nameSize),
    nameSize,
    fontBold,
    dark,
  );
  drawCentered(
    input.certificateNumber,
    yFromTop(pageHeight, layout.numberTopPercent, numberSize),
    numberSize,
    font,
    mid,
  );

  const dateY = yFromTop(pageHeight, layout.dateTopPercent, detailSize);
  if (layout.overlayCourseTitle && input.courseTitle?.trim()) {
    drawCentered(input.courseTitle, dateY + detailSize + 4, detailSize, font, muted);
  }
  drawCentered(`Issued ${input.issueDate}`, dateY, detailSize, font, muted);
  if (layout.overlayScore && input.scorePercent != null) {
    drawCentered(
      `Final grade: ${input.scorePercent}%`,
      dateY - detailSize - 4,
      detailSize,
      font,
      muted,
    );
  }
}

/** Certificate page only (legacy). */
export async function buildTemplatedCertificatePdf(
  input: BuildTemplatedCertificatePdfInput,
): Promise<Buffer | null> {
  const templateBytes = await loadCertificateTemplateBytes(input.templateImageUrl);
  if (!templateBytes) return null;

  const layout = resolveCertificateTemplateLayout(input.layout);
  const pdfDoc = await PDFDocument.create();
  await drawTemplatePage({
    pdfDoc,
    templateBytes,
    badgeImageUrl: input.badgeImageUrl,
    layout,
    learnerName: input.learnerName,
    certificateNumber: input.certificateNumber,
    issueDate: input.issueDate,
    courseTitle: input.courseTitle,
    scorePercent: input.scorePercent,
    mode: "certificate",
  });

  return Buffer.from(await pdfDoc.save());
}

/**
 * Build certificate + transcript PDF using admin-uploaded templates at native resolution.
 * Matches the on-screen template preview (no stretch to wrong page size).
 */
export async function buildCourseCertificateAndTranscriptPdf(
  input: BuildCourseCertificatePdfInput,
): Promise<Buffer | null> {
  const certBytes = await loadCertificateTemplateBytes(input.templateImageUrl);
  if (!certBytes) return null;

  const layout = resolveCertificateTemplateLayout(input.layout);
  const pdfDoc = await PDFDocument.create();
  const grade = input.grade ?? (input.scorePercent != null ? formatGrade(input.scorePercent) : null);

  await drawTemplatePage({
    pdfDoc,
    templateBytes: certBytes,
    badgeImageUrl: input.badgeImageUrl,
    layout,
    learnerName: input.learnerName,
    certificateNumber: input.certificateNumber,
    issueDate: input.issueDate,
    courseTitle: input.courseTitle,
    scorePercent: input.scorePercent,
    mode: "certificate",
  });

  const transcriptUrl = input.transcriptImageUrl?.trim();
  if (transcriptUrl) {
    const transcriptBytes = await loadCertificateTemplateBytes(transcriptUrl);
    if (transcriptBytes) {
      await drawTemplatePage({
        pdfDoc,
        templateBytes: transcriptBytes,
        layout,
        learnerName: input.learnerName,
        certificateNumber: input.certificateNumber,
        issueDate: input.issueDate,
        grade,
        mode: "transcript",
      });
    }
  }

  return Buffer.from(await pdfDoc.save());
}
