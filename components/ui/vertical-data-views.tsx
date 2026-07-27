"use client";

import * as React from "react";

import { NavRail, NavRailItem } from "@/components/ui/nav-rail";
import { cn } from "@/lib/utils";

export type VerticalDataViewItem = {
  id: string;
  label: string;
  description?: string;
  count?: number;
};

type VerticalDataViewsProps = {
  items: VerticalDataViewItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  railLabel?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * A view switcher rendered as the shared nav rail.
 *
 * These were `<Button>`s carrying a border and a pill radius, so a list of
 * views read as a column of controls rather than as navigation. They are now
 * the same quiet rail Settings uses, and counts sit at the right as plain
 * tabular text instead of outlined badges.
 */
export function VerticalDataViews({
  items,
  value,
  onValueChange,
  className,
  railLabel = "Views",
  children,
}: VerticalDataViewsProps) {
  const accessibleLabel = typeof railLabel === "string" ? railLabel : "Views";

  return (
    <section
      className={cn(
        "grid gap-4 lg:grid-cols-[var(--rail-w)_minmax(0,1fr)]",
        className,
      )}
    >
      <aside className="lg:sticky lg:top-16 lg:self-start">
        <NavRail label={accessibleLabel} orientation="responsive">
          {railLabel ? <div className="group-label">{railLabel}</div> : null}
          {items.map((item) => (
            <NavRailItem
              key={item.id}
              active={item.id === value}
              count={item.count}
              onClick={() => onValueChange(item.id)}
            >
              {item.label}
            </NavRailItem>
          ))}
        </NavRail>
      </aside>
      <div className="min-w-0 space-y-2.5">{children}</div>
    </section>
  );
}
