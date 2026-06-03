/** Shared copy for admin image upload fields (matches /api/admin/upload limits). */

export const ADMIN_IMAGE_FORMATS = "JPEG, PNG, WebP, or GIF";
export const ADMIN_IMAGE_MAX_MB = 6;

export const selfPacedCoverImageHint = `Recommended 1600×1000 px (16:10). ${ADMIN_IMAGE_FORMATS}. Max ${ADMIN_IMAGE_MAX_MB} MB.`;

export const heroBackgroundImageHint = `Full-width hero background. Recommended 1920×1080 px (16:9) or wider. ${ADMIN_IMAGE_FORMATS}. Max ${ADMIN_IMAGE_MAX_MB} MB.`;

export const heroPreviewImageHint = `Enroll card preview (16:9). Recommended 1280×720 px. ${ADMIN_IMAGE_FORMATS}. Max ${ADMIN_IMAGE_MAX_MB} MB.`;

export const heroCertificatePreviewImageHint = `Certificate preview in sidebar (~3:4). Recommended 800×1080 px. ${ADMIN_IMAGE_FORMATS}. Max ${ADMIN_IMAGE_MAX_MB} MB.`;

export const testimonialPhotoHint = `Client headshot. Recommended 400×400 px (1:1). ${ADMIN_IMAGE_FORMATS}. Max ${ADMIN_IMAGE_MAX_MB} MB.`;

export const faqAvatarImageHint = `FAQ page / home FAQ avatar. Recommended 600×800 px. ${ADMIN_IMAGE_FORMATS}. Max ${ADMIN_IMAGE_MAX_MB} MB.`;
