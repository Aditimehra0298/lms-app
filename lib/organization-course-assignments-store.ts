import type { ManagedCourse } from "@/lib/content-schema";
import {
  getActiveOrgPremiumPlan,
  orgPremiumPlanIdToPurchaseType,
  orgPremiumPlanLabelFromPurchaseType,
  readOrgPremiumPlanState,
} from "@/lib/organization-premium-plans";
import {
  getCachedOrganizationTeamRecord,
  ORG_TEAM_DATA_EVENT,
  saveOrganizationTeamToServer,
} from "@/lib/organization-team-sync-client";

export const ORG_COURSE_ASSIGNMENTS_EVENT = ORG_TEAM_DATA_EVENT;

export type OrgPlanPurchaseType = "monthly" | "yearly" | "premium" | "per-course";

export type OrgPurchasedCourse = {
  slug: string;
  title: string;
  planType: OrgPlanPurchaseType;
  category?: string;
  purchasedAt: string;
};

export type OrgCourseAssignmentMap = Record<string, string[]>;

export function readOrgPurchasedCourses(): OrgPurchasedCourse[] {
  return [];
}

export function writeOrgPurchasedCourses(_courses: OrgPurchasedCourse[]) {
  /* Purchased courses derive from admin catalog + org plan — not stored separately */
}

export function seedOrgPurchasedCoursesFromCatalog(catalog: ManagedCourse[]): OrgPurchasedCourse[] {
  const plan = getActiveOrgPremiumPlan(readOrgPremiumPlanState());
  const purchaseType = orgPremiumPlanIdToPurchaseType(plan.id);
  const published = catalog.filter((c) => c.published !== false);
  return published.map((c) => ({
    slug: c.slug,
    title: c.title,
    planType: purchaseType,
    category: c.category,
    purchasedAt: new Date().toISOString(),
  }));
}

export function readOrgCourseAssignments(): OrgCourseAssignmentMap {
  const record = getCachedOrganizationTeamRecord();
  return record?.courseAssignments ?? {};
}

export function writeOrgCourseAssignments(map: OrgCourseAssignmentMap) {
  void saveOrganizationTeamToServer({ courseAssignments: map });
}

export function setOrgCourseAssignees(courseSlug: string, employeeIds: string[]) {
  const map = readOrgCourseAssignments();
  map[courseSlug] = [...new Set(employeeIds.filter(Boolean))];
  writeOrgCourseAssignments(map);
  return map;
}

export function planTypeLabel(plan: OrgPlanPurchaseType): string {
  return orgPremiumPlanLabelFromPurchaseType(plan);
}

export function countUniqueAssignedEmployees(assignments: OrgCourseAssignmentMap): number {
  const ids = new Set<string>();
  for (const list of Object.values(assignments)) {
    for (const id of list) ids.add(id);
  }
  return ids.size;
}

export function employeeCourseAssignmentCount(
  assignments: OrgCourseAssignmentMap,
  employeeId: string,
): number {
  let count = 0;
  for (const list of Object.values(assignments)) {
    if (list.includes(employeeId)) count += 1;
  }
  return count;
}

export function buildOrgAssignmentReportRows(input: {
  purchased: OrgPurchasedCourse[];
  assignments: OrgCourseAssignmentMap;
  employees: Array<{ id: string; name: string; email: string; position: string; userId: string }>;
}): Array<{
  employeeName: string;
  employeeId: string;
  email: string;
  position: string;
  courseTitle: string;
  courseSlug: string;
  planType: string;
}> {
  const rows: Array<{
    employeeName: string;
    employeeId: string;
    email: string;
    position: string;
    courseTitle: string;
    courseSlug: string;
    planType: string;
  }> = [];

  for (const course of input.purchased) {
    const ids = input.assignments[course.slug] ?? [];
    for (const empId of ids) {
      const emp = input.employees.find((e) => e.id === empId);
      if (!emp) continue;
      rows.push({
        employeeName: emp.name,
        employeeId: emp.userId,
        email: emp.email,
        position: emp.position,
        courseTitle: course.title,
        courseSlug: course.slug,
        planType: planTypeLabel(course.planType),
      });
    }
  }
  return rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export function downloadOrgAssignmentReportCsv(
  rows: ReturnType<typeof buildOrgAssignmentReportRows>,
  companyName: string,
) {
  const header = ["Employee", "User ID", "Email", "Position", "Course", "Plan type"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.employeeName, r.employeeId, r.email, r.position, r.courseTitle, r.planType]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${companyName.replace(/\s+/g, "-").toLowerCase() || "team"}-assignment-report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
