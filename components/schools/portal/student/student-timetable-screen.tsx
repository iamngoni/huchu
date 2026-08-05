"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, EmptyState, SegmentedControl, Skeleton } from "@corelithzw/react";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { DAY_NAMES } from "@/lib/schools/timetable-format";
import { useStudentPortal } from "./student-portal-context";

type WeekSlot = {
  dayOfWeek: number;
  period: { id: string; code: string; name: string; startMinute: number };
  subjectName: string;
  roomName: string | null;
  teacherName: string | null;
};

type Week = { slots: WeekSlot[] };

const DAYS = [1, 2, 3, 4, 5, 6] as const;

function minuteLabel(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/**
 * A pupil's timetable, a day at a time on a phone.
 *
 * The demo shows day and week. On a phone the week grid is unreadable, so the
 * day is the view and the day picker is the week — same information, laid out
 * for the device it is read on. Today is where it opens.
 */
export function StudentTimetableScreen() {
  const { student, term, periods } = useStudentPortal();
  const todayIso = (() => {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
  })();
  const [day, setDay] = useState<string>(String(Math.min(todayIso, 6)));

  const week = useQuery({
    queryKey: ["schools", "portal", "student", "week", student?.currentClassId, term?.id],
    queryFn: () =>
      fetchJson<Week>(
        `/api/v2/schools/portal/student/me/timetable?dayOfWeek=${day}`,
      ),
    enabled: Boolean(student?.currentClassId && term),
  });

  if (!student) {
    return (
      <EmptyState
        title="This account is not linked to a pupil"
        body="Ask the school office to link your sign-in to your student record."
      />
    );
  }

  if (!student.currentClassId) {
    return (
      <EmptyState
        title="You are not in a year group yet"
        body="A timetable is your class's timetable, so there is nothing to show until the office puts you in one."
      />
    );
  }

  // Today comes from the shell, already loaded; other days are fetched.
  const isToday = Number(day) === todayIso;
  const rows = isToday
    ? periods.map((period) => ({
        key: period.periodId,
        code: period.code,
        name: period.name,
        time: `${period.startsAt} – ${period.endsAt}`,
        subject: period.lesson?.subjectName ?? null,
        room: period.lesson?.roomName ?? null,
        teacher: period.lesson?.teacherName ?? null,
      }))
    : (week.data?.slots ?? [])
        .filter((slot) => slot.dayOfWeek === Number(day))
        .sort((a, b) => a.period.startMinute - b.period.startMinute)
        .map((slot) => ({
          key: `${slot.period.id}-${slot.dayOfWeek}`,
          code: slot.period.code,
          name: slot.period.name,
          time: minuteLabel(slot.period.startMinute),
          subject: slot.subjectName,
          room: slot.roomName,
          teacher: slot.teacherName,
        }));

  return (
    <div className="flex flex-col gap-4">
      {week.error && !isToday ? (
        <Alert tone="danger" title="That day would not load">
          {getApiErrorMessage(week.error)}
        </Alert>
      ) : null}

      <SegmentedControl
        aria-label="Day of the week"
        size="sm"
        value={day}
        onValueChange={setDay}
        options={DAYS.map((value) => ({
          value: String(value),
          label: (DAY_NAMES[value] ?? "").slice(0, 3),
        }))}
      />

      <Card
        title={DAY_NAMES[Number(day)] ?? "Timetable"}
        subtitle={
          isToday
            ? "Today"
            : term
              ? `${student.currentClass?.name ?? ""} · ${term.name}`
              : undefined
        }
      >
        {!isToday && week.isPending ? (
          <Skeleton variant="text" height={200} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No lessons that day"
            body="Nothing is on your class timetable for this day."
          />
        ) : (
          <ul className="flex flex-col">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex items-center gap-3 border-b border-[color:var(--border-subtle)] py-3 last:border-b-0"
              >
                <span className="w-16 shrink-0 font-[family-name:var(--font-mono)] text-[length:var(--type-caption)] tabular-nums text-[color:var(--text-muted)]">
                  {row.time}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[length:var(--type-body-sm)] font-medium text-[color:var(--text-strong)]">
                    {row.subject ?? "Free"}
                  </span>
                  <span className="block truncate text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
                    {row.subject
                      ? [row.room, row.teacher].filter(Boolean).join(" · ") ||
                        row.name
                      : "No lesson"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
