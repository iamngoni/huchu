"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * In-page horizontal tab strip — the row that sits above a section's content,
 * usually next to a {@link NavRail}.
 *
 * Styling lives in `app/styles/components.css` under `.section-tabs`. The
 * active tab is strong text over a neutral rule; it is deliberately not the
 * brand colour, which is reserved for primary actions. Modules used to inline
 * their own `border-b-2 border-[var(--action-primary-bg)] text-[…]` variant of
 * this, which is why every one of them drifted.
 */

type SectionTabsProps = React.ComponentPropsWithoutRef<"nav"> & {
  /** Accessible name, e.g. "Accounting section navigation". */
  label: string;
};

export function SectionTabs({
  label,
  className,
  children,
  ...props
}: SectionTabsProps) {
  return (
    <nav aria-label={label} className={cn("section-tabs", className)} {...props}>
      {children}
    </nav>
  );
}

type SectionTabBaseProps = {
  active?: boolean;
  icon?: React.ReactNode;
  count?: number;
  className?: string;
  children: React.ReactNode;
};

type SectionTabProps = SectionTabBaseProps &
  (
    | { to: string; onClick?: never; disabled?: never }
    | { to?: never; onClick: () => void; disabled?: boolean }
  );

export function SectionTab({
  to,
  active,
  icon,
  count,
  className,
  onClick,
  disabled,
  children,
}: SectionTabProps) {
  const inner = (
    <>
      {icon}
      <span>{children}</span>
      {typeof count === "number" ? (
        <span className="section-tab-count">{count}</span>
      ) : null}
    </>
  );

  const classes = cn("section-tab", active && "active", className);

  if (to) {
    return (
      <Link
        href={to}
        className={classes}
        aria-current={active ? "page" : undefined}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "true" : undefined}
    >
      {inner}
    </button>
  );
}
