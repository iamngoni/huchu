"use client";

import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  RowCard,
  StatCard,
} from "@corelithzw/react";
import { getApiErrorMessage } from "@/lib/api-client";
import { useTeacherPortal, type TeacherPeriod } from "./teacher-portal-context";

/** Minutes since midnight, in the browser's own clock. */
function nowMinute() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function greeting(minute: number) {
  if (minute < 12 * 60) return "Good morning";
  if (minute < 17 * 60) return "Good afternoon";
  return "Good evening";
}

/** The lesson a teacher is standing in, or the next one they walk into. */
function currentPeriod(periods: TeacherPeriod[], minute: number) {
  const inProgress = periods.find(
    (period) => minute >= period.startMinute && minute < period.endMinute,
  );
  if (inProgress) return { period: inProgress, live: true as const };
  const next = periods.find((period) => period.startMinute > minute);
  return next ? { period: next, live: false as const } : null;
}

/**
 * The teacher's day, opened on the period they are in.
 *
 * The whole screen is built outward from the timetable: every period of the
 * day is a cell, free ones included, and the register a teacher has not taken
 * is a lit cell rather than a missing one. A screen that only listed what had
 * been done would be silent about exactly the thing a teacher is behind on.
 */
export function TeacherTodayContent() {
  const { day, error, setClassSubjectId } = useTeacherPortal();

  const minute = nowMinute();
  const periods = day?.periods ?? [];
  const classes = day?.classes ?? [];
  const marking = day?.workload?.marking ?? [];
  const current = currentPeriod(periods, minute);
  const surname = (day?.teacher?.user.name ?? "").split(" ").filter(Boolean).slice(-1)[0];
  const taught = periods.filter((period) => period.lesson).length;
  const free = periods.length - taught;
  const unmarked = periods.filter((period) => period.lesson && !period.register).length;

  if (error) {
    return (
      <Alert tone="danger" title="Your day would not load">
        {getApiErrorMessage(error)}
      </Alert>
    );
  }

  if (!day?.teacher) {
    return (
      <EmptyState
        title="You are not linked to a teacher profile"
        body="Ask the school office to link your account to your staff record. Until then the portal has no classes to show you."
      />
    );
  }

  if (!day?.term) {
    return (
      <EmptyState
        title="No term is running"
        body="The school has no active term, so there is no timetable to build a day from."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[length:var(--type-h3)] font-semibold text-[color:var(--text-strong)]">
            {greeting(minute)}
            {surname ? `, ${surname}` : ""}
          </h2>
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-muted)]">
            {classes.length} class{classes.length === 1 ? "" : "es"}
            {day?.term ? ` · ${day.term.name}` : ""} · {taught} lesson
            {taught === 1 ? "" : "s"} today
            {free > 0 ? ` · ${free} free` : ""}
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/portal/teacher/homework">Set homework</Link>
        </Button>
      </div>

      <Card
        title="Today's lessons"
        subtitle={
          current
            ? current.live
              ? `Right now · ${current.period.name}`
              : `Next · ${current.period.name} at ${current.period.startsAt}`
            : "Nothing left on the timetable today"
        }
      >
        {periods.length === 0 ? (
          <EmptyState
            title="No periods are set up"
            body="The school day has no periods on it yet, so there is nothing to lay a timetable against."
          />
        ) : (
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]">
            {periods.map((period) => {
              const live = current?.live && current.period.periodId === period.periodId;
              return (
                <div
                  key={period.periodId}
                  className={[
                    "flex min-h-[4.5rem] flex-col gap-1 rounded-[var(--radius-md)] border p-3",
                    live
                      ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]"
                      : "border-transparent bg-[color:var(--surface-muted)]",
                    period.lesson ? "" : "opacity-60",
                  ].join(" ")}
                >
                  <span className="font-[family-name:var(--font-mono)] text-[length:var(--type-caption)] uppercase text-[color:var(--text-subtle)]">
                    {period.code} · {period.startsAt}
                  </span>
                  <span className="text-[length:var(--type-body-sm)] font-semibold text-[color:var(--text-strong)]">
                    {period.lesson
                      ? `${period.lesson.className}${period.lesson.streamName ? ` ${period.lesson.streamName}` : ""}`
                      : "Free"}
                  </span>
                  <span className="truncate font-[family-name:var(--font-mono)] text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
                    {period.lesson
                      ? `${period.lesson.subjectName}${period.lesson.roomName ? ` · ${period.lesson.roomName}` : ""}`
                      : "Not teaching"}
                  </span>
                  {period.lesson ? (
                    <span className="mt-auto">
                      {period.register ? (
                        <Badge tone="success" dot>
                          Register taken
                        </Badge>
                      ) : (
                        <Badge tone="warn" dot>
                          Not marked
                        </Badge>
                      )}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {current?.period.lesson ? (
        <Card
          tone="brand"
          title={`Mark the register — ${current.period.lesson.className}${current.period.lesson.streamName ? ` ${current.period.lesson.streamName}` : ""} · ${current.period.lesson.subjectName}`}
          subtitle={
            current.live
              ? `${current.period.name} · ${current.period.startsAt} – ${current.period.endsAt}`
              : `Starts at ${current.period.startsAt}`
          }
          actions={
            <Button variant="primary" asChild>
              <Link
                href="/portal/teacher/attendance"
                onClick={() => {
                  const lesson = current.period.lesson;
                  if (lesson) setClassSubjectId(lesson.classSubjectId);
                }}
              >
                Mark the register
              </Link>
            </Button>
          }
        >
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-body)]">
            {current.period.register
              ? `Already taken — ${current.period.register.marked} pupils recorded. Opening it again edits what is there.`
              : `${classes.find((row) => row.classSubjectId === current.period.lesson?.classSubjectId)?.size ?? 0} pupils on the class list. Nobody has been marked yet.`}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Papers to mark"
          actions={
            marking.length > 0 ? (
              <Badge tone="warn">{marking.length} waiting</Badge>
            ) : null
          }
        >
          {marking.length === 0 ? (
            <EmptyState
              title="Nothing waiting"
              body="Every open assessment has a mark against every pupil on the roll."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {marking.slice(0, 4).map((row) => (
                <RowCard
                  key={row.assessmentId}
                  title={`${row.className} · ${row.subjectName} · ${row.title}`}
                  subtitle={`${row.marked} of ${row.expected} marked`}
                  status={
                    <span className="font-[family-name:var(--font-mono)] tabular-nums text-[color:var(--text-strong)]">
                      {row.outstanding} to go
                    </span>
                  }
                  action={
                    <Button variant="ghost" asChild>
                      <Link href={`/portal/teacher/marks?assessment=${row.assessmentId}`}>
                        Open
                      </Link>
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </Card>

        <Card title="This week">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Registers unmarked"
              value={unmarked}
              tone={unmarked > 0 ? "warn" : "neutral"}
            />
            <StatCard label="Papers to mark" value={day?.workload?.papersToMark ?? 0} />
            <StatCard label="Homework open" value={day?.workload?.homeworkOpen ?? 0} />
          </div>
        </Card>
      </div>
    </div>
  );
}
