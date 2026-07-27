"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { CrmLeadStage } from "@prisma/client";

import type { CrmBoardColumn } from "@/lib/crm/crm-v2";
import { cn } from "@/lib/utils";

import { LeadCard } from "./lead-card";
import { CRM_STAGE_LABELS, formatLeadValue } from "./stage-config";

/** Won and lost columns are tinted so the ends of the pipeline read at a glance. */
const COLUMN_TONE: Partial<Record<CrmLeadStage, string>> = {
  WON: "bg-[var(--status-success-bg)]/40",
  LOST: "bg-[var(--surface-muted)]/60",
};

export function BoardColumn({
  column,
  currency,
  onViewAll,
}: {
  column: CrmBoardColumn;
  currency: string;
  onViewAll: (stage: CrmLeadStage) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.stage}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-[var(--card-radius)] border border-[var(--border)]",
        "transition-colors duration-[var(--motion-duration-fast,120ms)]",
        COLUMN_TONE[column.stage] ?? "bg-[var(--surface-muted)]/30",
        isOver &&
          "border-[var(--action-primary-bg)] bg-[var(--action-primary-bg)]/[0.06] ring-1 ring-[var(--action-primary-bg)]",
      )}
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium">{CRM_STAGE_LABELS[column.stage]}</h3>
          <span className="font-mono text-xs text-[var(--text-muted)]">{column.count}</span>
        </div>
        {column.totalValue > 0 ? (
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {formatLeadValue(column.totalValue, currency)}
          </span>
        ) : null}
      </header>

      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2">
        <SortableContext
          items={column.leads.map((lead) => lead.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {column.leads.length === 0 ? (
          <p
            className={cn(
              "rounded-[var(--radius-md)] border border-dashed border-[var(--border)] px-1 py-6 text-center text-xs transition-colors",
              isOver
                ? "border-[var(--action-primary-bg)] text-[var(--action-primary-bg)]"
                : "text-[var(--text-muted)]",
            )}
          >
            Drop a lead here
          </p>
        ) : null}

        {column.hasMore ? (
          <button
            type="button"
            onClick={() => onViewAll(column.stage)}
            className="rounded px-2 py-1.5 text-xs text-[var(--text-muted)] underline hover:text-[var(--text)]"
          >
            View all {column.count} in table
          </button>
        ) : null}
      </div>
    </div>
  );
}
