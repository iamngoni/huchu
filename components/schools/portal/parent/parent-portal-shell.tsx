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
import { Bell, Home, ReceiptLong, UserRound, Users } from "@/lib/icons";

import { useParentPortal } from "./parent-portal-context";

/**
 * The parent portal's own chrome.
 *
 * A phone app, not the staff dashboard with a different menu — the same decision
 * S-6.36 and S-6.60 made for the pupil and the teacher, and for the same reason: a
 * parent opens this standing at a school gate on a phone, and a sidebar full of
 * modules is not what they need.
 *
 * Four tabs, which are the four reasons a parent opens it: how their child is
 * doing, what is owed, what the school has said, and their own account. The child
 * switcher sits in the app bar rather than on Home, because it applies to every
 * screen — see `parent-portal-context.tsx`.
 */

const TITLES: Record<string, string> = {
  "/portal/parent": "Home",
  "/portal/parent/fees": "Fees",
  "/portal/parent/attendance": "Attendance",
  "/portal/parent/marks": "Marks",
  "/portal/parent/notices": "Notices",
  "/portal/parent/profile": "Profile",
  "/portal/parent/help": "Help",
};

const TABS = [
  { href: "/portal/parent", label: "Home", icon: Home },
  { href: "/portal/parent/fees", label: "Fees", icon: ReceiptLong },
  { href: "/portal/parent/notices", label: "Notices", icon: Bell },
  { href: "/portal/parent/profile", label: "Profile", icon: UserRound },
];

export function ParentPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { guardian, child, children: household, selectChild, unreadNotices } = useParentPortal();

  const title = TITLES[pathname] ?? "Home";
  const isActive = (href: string) =>
    href === "/portal/parent" ? pathname === href : pathname.startsWith(href);

  return (
    <MobileShell>
      <MobileShellHeader
        title={title}
        rightAction={
          <span className="flex items-center gap-1">
            <Link
              href="/portal/parent/notices"
              aria-label={
                unreadNotices > 0 ? `Notices, ${unreadNotices} unread` : "Notices"
              }
              className="relative inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] text-[color:var(--text-muted)]"
            >
              <Bell className="size-5" aria-hidden />
              {unreadNotices > 0 ? (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[var(--status-error-border)]" />
              ) : null}
            </Link>
            <Link
              href="/portal/parent/profile"
              aria-label="Your profile"
              className="inline-flex size-10 items-center justify-center"
            >
              <PersonAvatar
                name={guardian ? `${guardian.firstName} ${guardian.lastName}` : "Parent"}
                size="sm"
              />
            </Link>
          </span>
        }
      />
      <MobileShellBody>
        {/* The child switcher. Shown only when there is a choice to make: one
            child and a row of one chip is furniture. */}
        {household.length > 1 ? (
          <div className="scroll-rail flex gap-2 border-b border-[var(--border-subtle)] px-4 py-2">
            {household.map((candidate) => {
              const active = candidate.id === child?.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => selectChild(candidate.id)}
                  aria-pressed={active}
                  className={
                    active
                      ? "flex shrink-0 items-center gap-2 rounded-full bg-[var(--surface-strong,var(--surface-muted))] px-2 py-1 text-sm font-medium"
                      : "flex shrink-0 items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--text-muted)]"
                  }
                >
                  <PersonAvatar
                    firstName={candidate.firstName}
                    lastName={candidate.lastName}
                    src={candidate.avatarUrl}
                    size="xs"
                  />
                  {candidate.firstName}
                </button>
              );
            })}
            <Link
              href="/portal/parent/profile"
              className="ml-auto shrink-0 self-center text-sm text-[var(--text-muted)]"
            >
              <Users className="size-4" aria-hidden />
              <span className="sr-only">All my children</span>
            </Link>
          </div>
        ) : null}

        <div className="p-4 pb-24">{children}</div>
      </MobileShellBody>
      <BottomTabs aria-label="Primary">
        {TABS.map((tab) => (
          <BottomTabItem
            key={tab.href}
            active={isActive(tab.href)}
            icon={<tab.icon className="size-5" aria-hidden />}
            label={tab.label}
            onClick={() => router.push(tab.href)}
          />
        ))}
      </BottomTabs>
    </MobileShell>
  );
}
