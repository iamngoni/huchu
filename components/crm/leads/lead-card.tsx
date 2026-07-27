"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Clock } from "@/lib/icons";
import type { CrmBoardCard } from "@/lib/crm/crm-v2";
import { cn } from "@/lib/utils";

import { formatDaysAgo, formatLeadValue, initialsOf, isOverdue } from "./stage-config";

export function LeadCardBody({ lead }: { lead: CrmBoardCard }) {
  const overdue = isOverdue(lead.nextFollowUp?.dueAt);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{lead.title ?? lead.leadNo}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {lead.client?.name ?? lead.contactName ?? "No client"}
          </p>
        </div>
        {overdue ? (
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--status-error-border)]"
            title={`Overdue: ${lead.nextFollowUp?.title ?? "task"}`}
            aria-label="Has an overdue task"
          />
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm">
          {formatLeadValue(lead.estimatedValue, lead.currency)}
        </span>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[10px] font-medium"
          title={lead.assignedTo?.name ?? "Unassigned"}
        >
          {initialsOf(lead.assignedTo?.name)}
        </span>
      </div>

      <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
        <Clock className="h-3 w-3" />
        <span>{formatDaysAgo(lead.stageEnteredAt)} in stage</span>
      </div>
    </div>
  );
}

/**
 * A draggable pipeline card. The title stays a real link so the board is still
 * navigable by keyboard and the card opens in a new tab like any other link.
 */
export function LeadCard({ lead }: { lead: CrmBoardCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { stage: lead.stage },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--surface)] p-3",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      <Link
        href={`/crm/leads/${lead.id}`}
        className="block focus:outline-none focus-visible:underline"
        // Let the drag sensor own pointer gestures; the link still works for
        // clicks, keyboard activation, and open-in-new-tab.
        onClick={(event) => event.stopPropagation()}
      >
        <LeadCardBody lead={lead} />
      </Link>
    </div>
  );
}
