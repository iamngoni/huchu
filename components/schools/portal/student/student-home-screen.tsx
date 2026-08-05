"use client";

import Link from "next/link";
import { Card, EmptyState, RowCard, StatCard } from "@corelithzw/react";
import {
  BarChart3,
  MedusaBookOpenIcon,
  Calendar,
  ListBullets,
  UserRound,
} from "@/lib/icons";
import { useStudentPortal } from "./student-portal-context";

/** Where the rest of the app lives, since only four things get a tab. */
const ELSEWHERE = [
  {
    href: "/portal/student/homework",
    label: "Homework",
    body: "What is set and what you have handed in",
    icon: ListBullets,
  },
  {
    href: "/portal/student/library",
    label: "Library",
    body: "Borrow a book, or see what you have out",
    icon: MedusaBookOpenIcon,
  },
  {
    href: "/portal/student/goals",
    label: "My goals",
    body: "What you are aiming for in each subject",
    icon: BarChart3,
  },
  {
    href: "/portal/student/profile",
    label: "Profile",
    body: "Your details and settings",
    icon: UserRound,
  },
];

function nowMinute() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * A pupil's home screen: what is happening now, and what is next.
 *
 * The day is the anchor because that is what a pupil opens the app to check
 * between lessons. Everything else on the phone is one tap from here, which is
 * why only four things earn a bottom tab — a row of eight is a row nobody
 * reads.
 */
export function StudentHomeScreen() {
  const { student, term, periods } = useStudentPortal();

  if (!student) {
    return (
      <EmptyState
        title="This account is not linked to a pupil"
        body="Ask the school office to link your sign-in to your student record. Until they do, there is nothing here to show you."
      />
    );
  }

  const minute = nowMinute();
  const lessons = periods.filter((period) => period.lesson);
  const current =
    periods.find(
      (period) => minute >= period.startMinute && minute < period.endMinute,
    ) ?? null;
  const next = periods.find(
    (period) => period.startMinute > minute && period.lesson !== null,
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[length:var(--type-h3)] font-semibold text-[color:var(--text-strong)]">
          Hello, {student.firstName}
        </h2>
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-muted)]">
          {student.currentClass?.name ?? "No year group yet"}
          {student.currentStream ? ` ${student.currentStream.name}` : ""}
          {term ? ` · ${term.name}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Lessons today" value={lessons.length} />
        <StatCard
          label="Right now"
          value={current?.lesson?.subjectName ?? (current ? "Free" : "—")}
          {...(current ? { footer: `${current.startsAt} – ${current.endsAt}` } : {})}
        />
      </div>

      <Card
        title="Next lesson"
        subtitle={next ? `${next.name} at ${next.startsAt}` : undefined}
        actions={
          <Link
            href="/portal/student/timetable"
            className="text-[length:var(--type-body-sm)] text-[color:var(--text-link)]"
          >
            Whole week
          </Link>
        }
      >
        {next?.lesson ? (
          <RowCard
            icon={<Calendar className="size-5" aria-hidden />}
            title={next.lesson.subjectName}
            subtitle={[
              next.lesson.roomName,
              next.lesson.teacherName ? `with ${next.lesson.teacherName}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            status={
              <span className="font-[family-name:var(--font-mono)] tabular-nums text-[color:var(--text-strong)]">
                {next.startsAt}
              </span>
            }
          />
        ) : (
          <EmptyState
            title="Nothing left today"
            body={
              lessons.length > 0
                ? "Your last lesson has been and gone."
                : "There are no lessons on your timetable for today."
            }
          />
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {ELSEWHERE.map((item) => (
          <Link key={item.href} href={item.href} className="no-underline">
            <RowCard
              icon={<item.icon className="size-5" aria-hidden />}
              title={item.label}
              subtitle={item.body}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
