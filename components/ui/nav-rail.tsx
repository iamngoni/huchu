"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Vertical secondary navigation — the one rail every module shares.
 *
 * The visual contract lives in `app/styles/components.css` under `.nav-rail`
 * (aliased by the older `.settings-rail`): a quiet list of labels with a soft
 * fill for hover and active, no outline, no shadow, no link colour and no
 * underline. Anything that used to render this as a stack of `<Button>`s or as
 * bare `<Link>`s picking up the global anchor colour should render these
 * instead, so the rail in Accounting reads exactly like the rail in Settings.
 *
 * Items are anchors when given a `to`, and real buttons when given `onClick` —
 * client-side view switchers should not be links.
 */

type NavRailProps = React.ComponentPropsWithoutRef<"nav"> & {
  /** Accessible name for the rail, e.g. "Accounting category navigation". */
  label: string;
  /**
   * `responsive` collapses the rail into a horizontally scrolling strip below
   * the `lg` breakpoint instead of stacking full height on small screens.
   */
  orientation?: "vertical" | "responsive";
};

export function NavRail({
  label,
  orientation = "vertical",
  className,
  children,
  ...props
}: NavRailProps) {
  return (
    <nav
      aria-label={label}
      data-orientation={orientation}
      className={cn("nav-rail", className)}
      {...props}
    >
      {children}
    </nav>
  );
}

type NavRailGroupProps = {
  /** Omit for an ungrouped rail — the label row is skipped entirely. */
  label?: string;
  children: React.ReactNode;
};

export function NavRailGroup({ label, children }: NavRailGroupProps) {
  return (
    <>
      {label ? <div className="group-label">{label}</div> : null}
      {children}
    </>
  );
}

type NavRailItemBaseProps = {
  active?: boolean;
  icon?: React.ReactNode;
  /** Right-aligned count. Rendered muted and tabular, never as a badge. */
  count?: number;
  /**
   * Right-aligned slot for the rare item that needs more than a count — a
   * severity badge, say. Prefer `count`; a rail of badges is a rail of noise.
   */
  trailing?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

type NavRailItemProps = NavRailItemBaseProps &
  (
    | { to: string; onClick?: never; disabled?: never }
    | { to?: never; onClick: () => void; disabled?: boolean }
  );

export function NavRailItem({
  to,
  active,
  icon,
  count,
  trailing,
  className,
  onClick,
  disabled,
  children,
}: NavRailItemProps) {
  const inner = (
    <>
      {icon ? (
        <span className="rail-item-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="rail-item-label">{children}</span>
      {typeof count === "number" ? (
        <span className="rail-item-count">{count}</span>
      ) : null}
      {trailing ? <span className="rail-item-trailing">{trailing}</span> : null}
    </>
  );

  const classes = cn("rail-item", active && "active", className);

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
