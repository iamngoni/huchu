"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The one toolbar every list and board sits under.
 *
 * Leads had its own header row, deals another, and people, companies and
 * sites a third — same intent, three orderings, three control heights. The
 * user's words: "the top bar area and header for kanban and lists should be
 * the same." So there is one row now, with one grammar:
 *
 *   what you are looking at (view / layout / pipeline) → how it is narrowed
 *   (filters) → …spacer… → how you find one (search) → what is shown
 *   (columns / card fields).
 *
 * Switching between table and board must not move this row — that is the
 * whole point of it. Anything that only makes sense in one layout (a sort
 * button on a board, say) disappears from its slot rather than reshaping the
 * row.
 */
export function ViewToolbar({
  start,
  search,
  end,
  className,
}: {
  /** What you are looking at, and how it is narrowed. */
  start?: ReactNode;
  /** The search control, right-aligned with the display controls. */
  search?: ReactNode;
  /** Display controls: column picker, card fields. */
  end?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // The hairline is what reads as "this is the toolbar, that is the
        // content" — the same seam the sidebar draws against the main pane.
        // Sticky: the row is the page's header, and a header that scrolls
        // away takes the filters and the search with it.
        "sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-surface-base pb-3 pt-1",
        className,
      )}
    >
      {start}
      <span className="min-w-2 flex-1" aria-hidden="true" />
      {search}
      {end}
    </div>
  );
}
