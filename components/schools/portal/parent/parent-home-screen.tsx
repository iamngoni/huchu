"use client";

import Link from "next/link";

import { PersonAvatar } from "@/components/schools/common/person-avatar";
import { formatSchoolMoney } from "@/lib/schools/format";
import { ArrowRight } from "@/lib/icons";

import { useParentPortal } from "./parent-portal-context";

/**
 * S-6.3 — what changed for this child.
 *
 * Four answers, in the order a parent asks them: is anything owed, was my child in
 * school, are there marks to read, has the school said anything. Each is a link to
 * the screen that expands it, because a home screen that answers everything is a
 * screen nobody reads.
 *
 * A figure a parent may not see is not shown as zero. A guardian without
 * `canReceiveFinancials` gets no fees card at all — the loader does not even fetch
 * the balance — because "0.00 owed" is a wrong answer where "not shown to you" is
 * a true one.
 */
export function ParentHomeScreen() {
  const { guardian, child, term, unreadNotices } = useParentPortal();

  if (!guardian) {
    return (
      <div className="space-y-2 py-8 text-center">
        <p className="font-medium">This account is not linked to a family yet.</p>
        <p className="text-sm text-[var(--text-muted)]">
          Ask the school office to send you a portal invite.
        </p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="space-y-2 py-8 text-center">
        <p className="font-medium">Hello, {guardian.firstName}.</p>
        <p className="text-sm text-[var(--text-muted)]">
          The school has not linked any children to your account yet.
        </p>
      </div>
    );
  }

  const attendanceRate =
    child.attendance.sessions > 0
      ? Math.round((child.attendance.present / child.attendance.sessions) * 100)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PersonAvatar
          firstName={child.firstName}
          lastName={child.lastName}
          src={child.avatarUrl}
          size="lg"
        />
        <div className="min-w-0">
          <p className="text-lg font-semibold">
            {child.firstName} {child.lastName}
          </p>
          <p className="truncate text-sm text-[var(--text-muted)]">
            {[child.currentClass?.name, child.isBoarding ? "Boarder" : "Day pupil", term?.name]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {child.fees ? (
        <Card
          href="/portal/parent/fees"
          label={Number(child.fees.overdue) > 0 ? "Overdue" : "Fees"}
          value={formatSchoolMoney(Number(child.fees.outstanding), child.fees.currency)}
          detail={
            Number(child.fees.outstanding) === 0
              ? "Nothing outstanding — thank you."
              : Number(child.fees.overdue) > 0
                ? `${formatSchoolMoney(Number(child.fees.overdue), child.fees.currency)} of this is past its due date.`
                : `Across ${child.fees.invoices} ${child.fees.invoices === 1 ? "invoice" : "invoices"}.`
          }
          tone={Number(child.fees.overdue) > 0 ? "danger" : undefined}
        />
      ) : null}

      <Card
        href="/portal/parent/attendance"
        label="Attendance this term"
        value={attendanceRate === null ? "No register yet" : `${attendanceRate}%`}
        detail={
          child.attendance.sessions === 0
            ? "Nothing has been recorded for this term."
            : `${child.attendance.present} present · ${child.attendance.absent} away · ${child.attendance.late} late`
        }
        tone={attendanceRate !== null && attendanceRate < 90 ? "warning" : undefined}
      />

      {child.canSeeResults ? (
        <Card
          href="/portal/parent/marks"
          label="Marks"
          value={child.hasPublishedMarks ? "Ready to read" : "Not published yet"}
          detail={
            child.hasPublishedMarks
              ? `${term?.name ?? "This term"}'s marks have been released.`
              : "The school releases marks once they have been checked."
          }
        />
      ) : null}

      <Card
        href="/portal/parent/notices"
        label="From the school"
        value={unreadNotices > 0 ? `${unreadNotices} new` : "Nothing new"}
        detail={
          unreadNotices > 0
            ? "Tap to read what the school has sent."
            : "You are up to date."
        }
      />
    </div>
  );
}

function Card({
  href,
  label,
  value,
  detail,
  tone,
}: {
  href: string;
  label: string;
  value: string;
  detail: string;
  tone?: "danger" | "warning";
}) {
  const accent =
    tone === "danger"
      ? "text-[var(--status-error-text)]"
      : tone === "warning"
        ? "text-[var(--status-warning-text)]"
        : "text-[var(--text-strong)]";

  return (
    <Link
      href={href}
      className="block rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
        <ArrowRight className="size-4 text-[var(--text-subtle)]" aria-hidden />
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{detail}</p>
    </Link>
  );
}
