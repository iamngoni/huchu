"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * DataTableFloatingActions — the bulk-selection bar a DataTable raises once
 * rows are checked.
 *
 * This used to forward to `PrimaryActionBar`, which is a *page* save bar: a
 * light surface framed in a border. The design system ships `.bulk-edit-bar`
 * for the selection case — the same shape inverted, so it reads as an overlay
 * over the table rather than another region of the page. `.bulk-edit-count`
 * carries the hint (and the `flex: 1` that pushes the actions right),
 * `.bulk-edit-actions` groups the buttons.
 *
 * The DS class is presentation only, so the sticky-to-the-viewport positioning
 * `PrimaryActionBar` provided is kept as local utilities — a selection bar that
 * scrolls out of reach on a long table is a behaviour change, not a restyle.
 *
 * The prop shape is unchanged; `DataTable` is the only caller.
 */
type DataTableFloatingActionsProps = {
  children: ReactNode;
  hint?: string;
  className?: string;
};

export function DataTableFloatingActions({
  children,
  hint,
  className,
}: DataTableFloatingActionsProps) {
  return (
    <div className={cn("bulk-edit-bar sticky bottom-3 z-20 sm:static", className)}>
      <span className="bulk-edit-count">{hint}</span>
      <div className="bulk-edit-actions">{children}</div>
    </div>
  );
}
