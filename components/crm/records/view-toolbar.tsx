"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SlidersHorizontal } from "@/lib/icons";
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
 *
 * On a phone the row is not a row. Six controls at 36px wrap onto three
 * lines and push the records themselves below the fold, and the reader has to
 * read six labels before they can look at anything. So below `sm` the whole
 * lot goes behind one button, and what stays on screen is what somebody came
 * for: the search box, and the records under it.
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
  const [open, setOpen] = useState(false);
  const hasControls = Boolean(start || end);

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
      {/* Phone: one button for every control, and the search beside it. */}
      {hasControls ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="sm:hidden" aria-label="View and filters">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              View
            </Button>
          </SheetTrigger>
          {/* A sheet rather than a dropdown menu: these controls are
              themselves popovers and selects, and a menu that closes the
              moment one of them opens is a menu you cannot use. Bottom-
              anchored, which is where a thumb is. */}
          {/* `SheetContent` ships with no padding — call sites bring their
              own — so without this the title sits against the left edge of
              the screen and the controls run edge to edge. */}
          <SheetContent side="bottom" size="md" className="p-4 sm:hidden">
            <SheetHeader className="pb-3 text-left">
              <SheetTitle>View and filters</SheetTitle>
            </SheetHeader>
            {/* Stacked and full width — each control gets a line, which is
                the only way a nine-option filter reads on a phone. Labels go
                to the left edge: a button centres its label, which is right
                for a button you press and wrong for a row you read down. */}
            {/* `w-full` on each control is what tells the button it is a row:
                the left-aligned label and far-right caret come from that, in
                globals.css, rather than from a rule written here. */}
            <div className="flex flex-col items-stretch gap-2 [&>*]:w-full [&_.btn]:w-full">
              {start}
              {end}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      <div className="hidden flex-wrap items-center gap-2 sm:flex">{start}</div>

      {/* The spacer pushes search and display controls to the right of a
          single row. Once the row wraps — which it always does on a phone —
          a flex-1 spacer becomes a whole blank line between the filters and
          the search, so it only exists at widths where the row fits. */}
      <span className="hidden min-w-2 flex-1 sm:block" aria-hidden="true" />

      {/* Search stays out of the sheet: it is how you find one record, which
          is the most common reason to touch this row at all. */}
      <div className="min-w-0 flex-1 sm:flex-none">{search}</div>

      <div className="hidden flex-wrap items-center gap-2 sm:flex">{end}</div>
    </div>
  );
}
