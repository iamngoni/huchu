"use client";

import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { formatSchoolDate } from "@/lib/schools/format";

import { useParentPortal } from "./parent-portal-context";

/**
 * S-6.4 — attendance, and any single day.
 *
 * The summary is above the days rather than instead of them: "94%" is what a
 * parent glances at and "you marked her away on the 14th" is what they came to
 * ask about, so both are here and the days are the list.
 *
 * A day whose register is still DRAFT is labelled as not yet submitted. Telling a
 * parent their child was absent off a register a teacher has not finished is how
 * an argument starts over a tick somebody was about to correct.
 */

type Day = {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
  register: string;
  className: string | null;
  term: { id: string; name: string } | null;
};

const TONE: Record<string, string> = {
  PRESENT: "text-[var(--status-success-text)]",
  ABSENT: "text-[var(--status-error-text)]",
  LATE: "text-[var(--status-warning-text)]",
  EXCUSED: "text-[var(--text-muted)]",
};

const LABEL: Record<string, string> = {
  PRESENT: "In school",
  ABSENT: "Away",
  LATE: "Late",
  EXCUSED: "Away — excused",
};

export function ParentAttendanceScreen() {
  const { child, term } = useParentPortal();

  const query = useQuery({
    queryKey: ["portal", "parent", "attendance", child?.id, term?.id],
    queryFn: () =>
      fetchJson<{ days: Day[] }>(
        `/api/v2/schools/portal/parent/child/attendance?childId=${child!.id}${
          term?.id ? `&termId=${term.id}` : ""
        }`,
      ),
    enabled: Boolean(child?.id),
  });

  if (!child) {
    return <p className="py-8 text-center text-sm text-[var(--text-muted)]">No child selected.</p>;
  }

  const rate =
    child.attendance.sessions > 0
      ? Math.round((child.attendance.present / child.attendance.sessions) * 100)
      : null;

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
        <p className="text-sm text-[var(--text-muted)]">
          {term?.name ?? "This term"} — {child.firstName}
        </p>
        <p className="text-3xl font-semibold tabular-nums">
          {rate === null ? "No register yet" : `${rate}%`}
        </p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {child.attendance.sessions === 0
            ? "Nothing has been recorded for this term."
            : `${child.attendance.present} in school · ${child.attendance.absent} away · ${child.attendance.late} late`}
        </p>
      </div>

      {query.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Attendance could not be loaded</AlertTitle>
          <AlertDescription>{getApiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      ) : (query.data?.days ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--text-muted)]">
          No registers have been taken for {child.firstName} this term.
        </p>
      ) : (
        <ul className="space-y-2">
          {(query.data?.days ?? []).map((day) => (
            <li
              key={day.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-3"
            >
              <span className="min-w-0">
                <span className="block font-medium">{formatSchoolDate(day.date)}</span>
                <span className="block text-sm text-[var(--text-muted)]">
                  {[day.className, day.remarks].filter(Boolean).join(" · ") || "—"}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block text-sm font-medium ${TONE[day.status] ?? ""}`}>
                  {LABEL[day.status] ?? day.status.toLowerCase()}
                </span>
                {day.register !== "SUBMITTED" && day.register !== "LOCKED" ? (
                  <span className="block text-sm text-[var(--text-subtle)]">not yet submitted</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
