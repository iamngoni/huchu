import { AttendanceStatus } from "@prisma/client";

/**
 * The attendance statuses, once, from the schema.
 *
 * `Attendance.status` used to be a `String` with `// PRESENT, ABSENT, LATE` after
 * it, and that comment was duplicated as a literal array in three places: a zod
 * enum in the mark-attendance route, a second zod enum in gold's shift-output
 * route, and an `includes` check driving the register's search box. Three copies
 * of a rule the database did not enforce.
 *
 * Now the schema enforces it and this derives from it, so adding a status to
 * `enum AttendanceStatus` reaches every caller. The list is ordered as the enum
 * is, which is also the order a register offers them in.
 */
export const ATTENDANCE_STATUSES = Object.values(AttendanceStatus);

/**
 * A query-string value as a status, or null if it is not one.
 *
 * This exists because of a regression the enum would otherwise have introduced.
 * The register's list route took `?status=` straight off the URL and assigned it
 * into a `Record<string, unknown>` where clause — which typechecks, and which
 * used to answer `?status=bogus` with an empty list. Against an enum column
 * Postgres raises instead, so an unrecognised filter turned a page of attendance
 * into a 500. Unknown means "no such status", which means no rows, not an error.
 */
export function parseAttendanceStatus(value: string | null | undefined): AttendanceStatus | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return (ATTENDANCE_STATUSES as string[]).includes(upper)
    ? (upper as AttendanceStatus)
    : null;
}

/**
 * How a status reads to somebody looking at a register.
 *
 * `ON_LEAVE` and `REST_DAY` are the two that matter here: both are absences, and
 * a register that prints them as raw enum names invites being read as the same
 * kind of absence as `ABSENT`, which is the one that costs somebody a day's pay.
 */
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  ON_LEAVE: "On leave",
  REST_DAY: "Rest day",
  HOLIDAY: "Public holiday",
};
