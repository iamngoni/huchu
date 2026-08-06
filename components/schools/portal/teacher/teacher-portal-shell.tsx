"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell, Avatar, Badge, NavRail, NavRailGroup } from "@corelithzw/react";
import { NavRailItem } from "@/components/ui/nav-rail";
import {
  BarChart3,
  Bell,
  Calendar,
  ChatCircle,
  CheckCircle,
  ClipboardList,
  Clock,
  EditSquare,
  Grid3x3,
  HelpCircle,
  Home,
  Layers,
  ListBullets,
  LogOut,
  Settings2,
  UserRound,
} from "@/lib/icons";
import { useTeacherPortal } from "./teacher-portal-context";

/**
 * Route → page title. The old two-line bar put a category label above the
 * title ("Parents", "Assessment"), which repeated what the rail already says.
 * The bar now spends its one caption line on real context: the active term
 * and the class in view.
 */
const TITLES: Record<string, string> = {
  "/portal/teacher": "Your day",
  "/portal/teacher/attendance": "Mark the register",
  "/portal/teacher/marks": "Enter marks",
  "/portal/teacher/marks-book": "Marks book",
  "/portal/teacher/messages": "Messages",
  "/portal/teacher/timetable": "Your week",
  "/portal/teacher/lessons": "Lesson plans",
  "/portal/teacher/homework": "Homework and tasks",
  "/portal/teacher/files": "Shared files",
  "/portal/teacher/reports": "Reports",
  "/portal/teacher/meetings": "Parent meetings",
  "/portal/teacher/profile": "Your profile",
  "/portal/teacher/settings": "Settings",
  "/portal/teacher/help": "Help",
};

const DAILY = [
  { href: "/portal/teacher", label: "Today", icon: Home },
  { href: "/portal/teacher/attendance", label: "Attendance", icon: CheckCircle },
  { href: "/portal/teacher/marks", label: "Enter marks", icon: EditSquare },
  { href: "/portal/teacher/marks-book", label: "Marks book", icon: Grid3x3 },
  { href: "/portal/teacher/messages", label: "Messages", icon: ChatCircle },
  { href: "/portal/teacher/timetable", label: "Timetable", icon: Calendar },
  { href: "/portal/teacher/lessons", label: "Lesson plans", icon: Layers },
];

const MORE = [
  { href: "/portal/teacher/homework", label: "Homework", icon: ListBullets },
  { href: "/portal/teacher/files", label: "Shared files", icon: ClipboardList },
  { href: "/portal/teacher/reports", label: "Reports", icon: BarChart3 },
  { href: "/portal/teacher/meetings", label: "Parent meetings", icon: Clock },
];

const ACCOUNT = [
  { href: "/portal/teacher/profile", label: "Profile", icon: UserRound },
  { href: "/portal/teacher/settings", label: "Settings", icon: Settings2 },
  { href: "/portal/teacher/help", label: "Help", icon: HelpCircle },
];

/**
 * The teacher portal's own chrome.
 *
 * A portal is not the dashboard with a different nav: a teacher signs in on a
 * shared tablet between lessons, and the surface they get is anchored to a
 * class and a term rather than to a module tree. That is SHL·07, and it is
 * why this shell owns its rail instead of borrowing the admin one.
 *
 * The class rail sits above the navigation because it changes what every
 * screen below it means. Picking Form 2A once is what lets Attendance, Enter
 * marks and Lesson plans all agree about whose lesson this is.
 */
export function TeacherPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { day, classSubjectId, setClassSubjectId } = useTeacherPortal();

  const title = TITLES[pathname] ?? TITLES["/portal/teacher"];
  const teacherName = day.teacher?.user.name ?? "Teacher";
  const subjects = [...new Set((day.classes).map((row) => row.subjectName))];
  const papers = day.workload?.papersToMark ?? 0;
  const selected = day.classes.find((row) => row.classSubjectId === classSubjectId);
  /**
   * What the bar's caption line says: the term and the class in view. Both are
   * live state rather than a category label — they change what every number on
   * the screen means, which is what earns them the space.
   */
  const context = [
    day.term?.name,
    selected
      ? `${selected.className}${selected.streamName ? ` ${selected.streamName}` : ""} · ${selected.subjectName}`
      : null,
  ]
    .filter(Boolean)
    .join(" — ");

  const isActive = (href: string) =>
    href === "/portal/teacher" ? pathname === href : pathname.startsWith(href);

  const sidebar = (
    <div className="flex min-h-0 flex-col gap-3">
      {/* No brand label. The profile card is the rail's identity: whose
          classes these are is the only heading the portal needs. */}
      <Link
        href="/portal/teacher/profile"
        className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 no-underline"
      >
        <Avatar
          name={teacherName}
          {...(day.teacher?.user.image ? { src: day.teacher.user.image } : {})}
          size="md"
        />
        <span className="min-w-0">
          <span className="block truncate text-[length:var(--type-body-sm)] font-semibold text-[color:var(--text-strong)]">
            {teacherName}
          </span>
          <span className="block truncate text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
            {subjects.length > 0 ? subjects.join(" · ") : "No classes this term"}
          </span>
        </span>
      </Link>

      <NavRail label="Teacher portal navigation" className="min-h-0 flex-1 overflow-y-auto">
        <NavRailGroup label="Your classes">
          {(day.classes).map((row) => (
            <NavRailItem
              key={row.classSubjectId}
              active={row.classSubjectId === classSubjectId}
              onClick={() => setClassSubjectId(row.classSubjectId)}
              count={row.size}
            >
              {row.className}
              {row.streamName ? ` ${row.streamName}` : ""} · {row.subjectName}
            </NavRailItem>
          ))}
          {day.classes.length === 0 ? (
            <p className="px-3 py-2 text-[length:var(--type-caption)] text-[color:var(--text-muted)]">
              No classes are assigned to you this term.
            </p>
          ) : null}
        </NavRailGroup>

        <NavRailGroup label="Daily work">
          {DAILY.map((item) => (
            <NavRailItem
              key={item.href}
              to={item.href}
              active={isActive(item.href)}
              icon={<item.icon className="size-4" aria-hidden />}
              {...(item.href === "/portal/teacher/marks" && papers > 0
                ? { count: papers }
                : {})}
            >
              {item.label}
            </NavRailItem>
          ))}
        </NavRailGroup>

        <NavRailGroup label="More">
          {MORE.map((item) => (
            <NavRailItem
              key={item.href}
              to={item.href}
              active={isActive(item.href)}
              icon={<item.icon className="size-4" aria-hidden />}
            >
              {item.label}
            </NavRailItem>
          ))}
        </NavRailGroup>

        <NavRailGroup label="Account">
          {ACCOUNT.map((item) => (
            <NavRailItem
              key={item.href}
              to={item.href}
              active={isActive(item.href)}
              icon={<item.icon className="size-4" aria-hidden />}
            >
              {item.label}
            </NavRailItem>
          ))}
          <NavRailItem
            to="/api/auth/signout"
            icon={<LogOut className="size-4" aria-hidden />}
          >
            Sign out
          </NavRailItem>
        </NavRailGroup>
      </NavRail>
    </div>
  );

  const topbar = (
    <div className="flex w-full min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="flex min-w-0 items-baseline gap-2 truncate text-[length:var(--type-h4)] font-semibold text-[color:var(--text-strong)]">
          <span className="truncate">{title}</span>
          {context ? (
            <span className="truncate text-[length:var(--type-body-sm)] font-normal text-[color:var(--text-muted)]">
              {context}
            </span>
          ) : null}
        </h1>
      </div>
      {papers > 0 ? (
        <Badge tone="warn">
          {papers} paper{papers === 1 ? "" : "s"} to mark
        </Badge>
      ) : null}
      <Link
        href="/portal/teacher/messages"
        aria-label="Messages"
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-strong)]"
      >
        <Bell className="size-4" aria-hidden />
      </Link>
    </div>
  );

  return (
    <AppShell sidebar={sidebar} topbar={topbar}>
      {children}
    </AppShell>
  );
}
