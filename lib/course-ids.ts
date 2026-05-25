/** First permanent course ID in MySQL table `lms_course`. */
export const COURSE_ID_START = 101;

/** Display code for n8n / reports, e.g. "101" */
export function formatCourseCode(courseIdentificationNumber: number): string {
  return String(courseIdentificationNumber);
}

export function describeCourseIdStorage(): string {
  return (
    "Courses in MySQL table lms_course — courseIdentificationNumber from 101, 102, 103… " +
    "Linked by slug to admin catalog JSON."
  );
}
