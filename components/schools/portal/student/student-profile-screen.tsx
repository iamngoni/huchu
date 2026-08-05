"use client";

import Link from "next/link";
import {
  Badge,
  Callout,
  Card,
  EmptyState,
  MobileList,
  MobileListChevron,
  MobileListContent,
  MobileListIcon,
  MobileListItem,
  MobileListSubtitle,
  MobileListTitle,
} from "@corelithzw/react";
import { PersonAvatar } from "@/components/schools/common/person-avatar";
import { Bell, HelpCircle, Settings2, TrendingUp } from "@/lib/icons";
import { useStudentPortal } from "./student-portal-context";

/** Where the rest of the pupil's own account lives. */
const ELSEWHERE = [
  {
    href: "/portal/student/goals",
    label: "My goals",
    body: "What you are aiming for in each subject",
    icon: TrendingUp,
  },
  {
    href: "/portal/student/notifications",
    label: "Messages",
    body: "What the school has sent you",
    icon: Bell,
  },
  {
    href: "/portal/student/settings",
    label: "Settings",
    body: "Alerts, theme and your PIN",
    icon: Settings2,
  },
  {
    href: "/portal/student/help",
    label: "Help",
    body: "How this app works",
    icon: HelpCircle,
  },
];

/**
 * Fields the school owns, and why each one is theirs rather than the pupil's.
 *
 * The demo puts an edit pencil in the app bar and a contact list under it —
 * email, phone, guardian, home address — all of them editable. Two problems
 * with that here. The product does not store a pupil's phone or address at all,
 * so those rows would be invented; and the ones it does store are the school's
 * record, printed on registers, mark sheets and reports. A child changing their
 * own name on a phone would change what a report card says.
 *
 * Naming the owner is more use than a greyed-out input: it tells the pupil who
 * to go and ask.
 */
const SCHOOL_OWNED = [
  {
    field: "Your name",
    owner: "School office",
    why: "It goes on the register, your marks and your report, so it follows the school's record and not this app.",
  },
  {
    field: "Student number",
    owner: "School office",
    why: "Given to you once when you joined. It is how everything in the school finds your record.",
  },
  {
    field: "Year group and stream",
    owner: "School office",
    why: "It decides your timetable and who teaches you. It changes when the office moves you.",
  },
  {
    field: "Boarding or day",
    owner: "School office",
    why: "Set by the boarding house, because it decides where you sleep and who is looking after you.",
  },
  {
    field: "Sign-in email",
    owner: "School office",
    why: "It is how you sign in. Changing it would change the account, so an adult has to do it.",
  },
];

/**
 * Who the pupil is, as the school holds it.
 *
 * There is no fetch on this screen and no skeleton: the portal layout reads the
 * pupil's own record on the server, from the signed-in account rather than
 * anything the URL says, and hands it down. That also means there is no error
 * state to render — nothing here can fail on its own. The one condition worth
 * rendering is an account that was never linked to a pupil, because that is
 * real, it happens on the day an invite is claimed wrongly, and it has a next
 * step: ask the office.
 *
 * The face is the pupil's own, drawn by `PersonAvatar` so the same child is the
 * same colour here as on the register their teacher takes.
 */
export function StudentProfileScreen() {
  const { student, term } = useStudentPortal();

  if (!student) {
    return (
      <EmptyState
        title="This account is not linked to a pupil"
        body="Ask the school office to link your sign-in to your student record. Until they do, there is no profile to show."
      />
    );
  }

  const name = `${student.firstName} ${student.lastName}`;
  const yearGroup = student.currentClass
    ? `${student.currentClass.name}${student.currentStream ? ` ${student.currentStream.name}` : ""}`
    : "Not in a year group yet";

  const facts: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "Student number", value: student.studentNo, mono: true },
    { label: "Year group", value: yearGroup },
    { label: "Boarding", value: student.isBoarding ? "Boarder" : "Day pupil" },
    { label: "Term", value: term?.name ?? "No term running" },
    {
      label: "Sign-in email",
      value: student.user?.email ?? "No portal account linked",
      mono: Boolean(student.user?.email),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center gap-4">
          <PersonAvatar
            firstName={student.firstName}
            lastName={student.lastName}
            src={student.user?.image ?? null}
            size="lg"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="t-body-lg t-strong truncate">{name}</span>
            <span className="t-caption t-muted truncate">{yearGroup}</span>
            <span className="flex flex-wrap gap-2">
              <Badge tone="neutral">{student.studentNo}</Badge>
              {student.isBoarding ? <Badge tone="info">Boarder</Badge> : null}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Your details" subtitle="The school keeps these. You cannot change them here.">
        <dl className="m-0 flex flex-col gap-3">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-1">
              <dt className="t-caption t-subtle">{fact.label}</dt>
              <dd
                className={`m-0 ${fact.mono ? "t-mono t-strong tabular-nums" : "t-body t-strong"}`}
              >
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="More" flush>
        <MobileList>
          {/* `asChild` onto a Next `Link` keeps the whole row one real anchor —
              a 44px tap target that is also a link a keyboard can reach — while
              still routing on the client. */}
          {ELSEWHERE.map((item) => (
            <MobileListItem
              key={item.href}
              variant="touchable"
              className="min-h-[var(--h-control-lg)]"
              asChild
            >
              <Link href={item.href}>
                <MobileListIcon>
                  <item.icon className="size-5" aria-hidden />
                </MobileListIcon>
                <MobileListContent>
                  <MobileListTitle>{item.label}</MobileListTitle>
                  <MobileListSubtitle>{item.body}</MobileListSubtitle>
                </MobileListContent>
                <MobileListChevron />
              </Link>
            </MobileListItem>
          ))}
        </MobileList>
      </Card>

      <Card title="Held by the school" subtitle="Who to ask when one of these is wrong">
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {SCHOOL_OWNED.map((row) => (
            <li key={row.field} className="flex flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="t-label-sm">{row.field}</span>
                <Badge tone="outline">{row.owner}</Badge>
              </span>
              <span className="t-caption">{row.why}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Callout tone="info" title="Something here is wrong">
        Tell your form teacher or the school office. They hold the record this
        app reads from, so fixing it there fixes it on your report too.
      </Callout>
    </div>
  );
}
