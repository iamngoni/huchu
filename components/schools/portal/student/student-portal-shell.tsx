"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BottomTabItem,
  BottomTabs,
  MobileShell,
  MobileShellBody,
  MobileShellHeader,
} from "@corelithzw/react";
import { PersonAvatar } from "@/components/schools/common/person-avatar";
import { BarChart3, Bell, Calendar, Home, UserRound } from "@/lib/icons";
import { useStudentPortal } from "./student-portal-context";
import "./student-portal.css";

/** The screen's own title, so the app bar never has to be told twice. */
const TITLES: Record<string, string> = {
  "/portal/student": "Home",
  "/portal/student/timetable": "Timetable",
  "/portal/student/marks": "My marks",
  "/portal/student/homework": "Homework",
  "/portal/student/library": "Library",
  "/portal/student/goals": "My goals",
  "/portal/student/notifications": "Notifications",
  "/portal/student/profile": "Profile",
  "/portal/student/settings": "Settings",
  "/portal/student/help": "Help",
};

const TABS = [
  { href: "/portal/student", label: "Home", icon: Home },
  { href: "/portal/student/timetable", label: "Timetable", icon: Calendar },
  { href: "/portal/student/marks", label: "Marks", icon: BarChart3 },
  { href: "/portal/student/profile", label: "Profile", icon: UserRound },
];

/**
 * The student portal's own chrome.
 *
 * A phone app, not a dashboard: an app bar, one screen at a time, and four
 * bottom tabs. The prototype is mobile-first because that is the only device
 * most pupils have, and the design system has a shell for exactly this
 * (`MobileShell` + `BottomTabs`) — the four tabs are the four things a pupil
 * opens the app to do, and everything else is reached from Home.
 */
export function StudentPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const day = useStudentPortal();

  const title = TITLES[pathname] ?? "Home";
  const name = day.student
    ? `${day.student.firstName} ${day.student.lastName}`
    : "Student";

  const isActive = (href: string) =>
    href === "/portal/student" ? pathname === href : pathname.startsWith(href);

  return (
    <MobileShell className="student-portal">
      <MobileShellHeader
        title={title}
        rightAction={
          <span className="sp-appbar-right">
            <Link
              href="/portal/student/notifications"
              aria-label="Notifications"
              className="sp-nav-btn"
            >
              <Bell className="size-[18px]" aria-hidden />
            </Link>
            <Link
              href="/portal/student/profile"
              aria-label="Your profile"
              className="sp-nav-btn"
            >
              <PersonAvatar
                name={name}
                src={day.student?.user?.image ?? null}
                size="sm"
              />
            </Link>
          </span>
        }
      />
      <MobileShellBody style={{ padding: 0 }}>
        <div className="sp-page">{children}</div>
      </MobileShellBody>
      <BottomTabs aria-label="Primary">
        {TABS.map((tab) => (
          <BottomTabItem
            key={tab.href}
            active={isActive(tab.href)}
            icon={
              <span className="b-bt-ic">
                <tab.icon className="size-[22px]" aria-hidden />
              </span>
            }
            label={tab.label}
            onClick={() => router.push(tab.href)}
          />
        ))}
      </BottomTabs>
    </MobileShell>
  );
}
