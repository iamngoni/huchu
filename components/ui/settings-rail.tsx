"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Settings-rail navigation.
 *
 * `@corelithzw/react` ships the CSS for this surface — `.settings-rail`,
 * `.group-label`, `.rail-item` and `.rail-item.active` — but exports no React
 * component for it (there is no `NavGroup`/`NavItem` in the package; see the
 * export list in `dist/index.d.ts`). Rather than forking a design-system
 * component, these two render the package's markup contract directly, so the
 * styling still comes entirely from the package.
 *
 * Drop these in favour of the real exports if a future release ships them.
 */

type NavGroupProps = {
  label: string;
  children: React.ReactNode;
};

export function NavGroup({ label, children }: NavGroupProps) {
  return (
    <>
      <div className="group-label">{label}</div>
      {children}
    </>
  );
}

type NavItemProps = {
  /** Destination href. Named `to` to match the design system's nav API. */
  to: string;
  active?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

export function NavItem({ to, active, icon, children }: NavItemProps) {
  return (
    <Link
      href={to}
      className={cn("rail-item", active && "active")}
      aria-current={active ? "page" : undefined}
    >
      {icon ? (
        <span className="mr-2 inline-flex shrink-0 items-center">{icon}</span>
      ) : null}
      {children}
    </Link>
  );
}
