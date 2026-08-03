"use client";

import { useState, type ReactNode } from "react";

import { RecordList, type RecordListRow } from "./record-list";
import { cn } from "@/lib/utils";

/**
 * A kanban board, on a phone.
 *
 * A board is a horizontal instrument. It works because you can see four
 * columns at once and compare them; at 390px you can see one, and swiping
 * between them means losing your place in a strip with no landmarks. So a
 * phone gets the thing the board is actually for — which records are in which
 * stage — as a stage picker and a single list.
 *
 * Dragging stays on the desktop board. Nothing becomes unreachable: tapping a
 * row opens the record, where the stage control already lives.
 */

export type MobileBoardStage = {
  id: string;
  label: string;
  count: number;
  /** The column's colour on the board, so the chips read as the same stages. */
  dot?: string;
  /** A one-line summary under the picker — a stage total, usually. */
  meta?: ReactNode;
  rows: RecordListRow[];
};

export function MobileBoard({
  stages,
  emptyTitle = "Nothing in this stage",
  emptyBody,
  className,
}: {
  stages: MobileBoardStage[];
  emptyTitle?: string;
  emptyBody?: string;
  className?: string;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  // Resolved rather than stored: a stage the reader picked can disappear when
  // the filters change, and the first stage holding anything is a better
  // landing place than an empty one. No effect needed, and no stale id.
  const active =
    stages.find((stage) => stage.id === picked) ??
    stages.find((stage) => stage.count > 0) ??
    stages[0];

  if (!active) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="scroll-rail -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {stages.map((stage) => {
          const selected = stage.id === active.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setPicked(stage.id)}
              aria-pressed={selected}
              className={cn(
                "flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm transition-colors",
                selected
                  ? "border-[var(--border-strong)] bg-[var(--surface-muted)] font-medium text-[var(--text-strong)]"
                  : "border-[var(--border)] text-[var(--text-muted)]",
              )}
            >
              {stage.dot ? (
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-full", stage.dot)}
                />
              ) : null}
              {stage.label}
              <span className="font-mono tabular-nums text-[var(--text-subtle)]">
                {stage.count}
              </span>
            </button>
          );
        })}
      </div>

      {active.meta ? (
        <p className="text-sm text-[var(--text-muted)]">{active.meta}</p>
      ) : null}

      <RecordList rows={active.rows} emptyTitle={emptyTitle} emptyBody={emptyBody} />
    </div>
  );
}
