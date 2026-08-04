"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { CrmLeadStage } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { NumericCell } from "@/components/ui/numeric-cell";
import { StatusChip } from "@/components/ui/status-chip";
import { ClientDate } from "@/components/ui/client-date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "@/lib/icons";
import type { CrmLeadListRecord } from "@/lib/crm/crm-v2";
import type { LeadSort } from "@/lib/crm/views";
import type { ColumnOption } from "@/lib/ui/visible-columns";
import { cn } from "@/lib/utils";

import { RecordMark } from "@/components/crm/records/record-mark";
import { RecordList } from "@/components/crm/records/record-list";

import type { LeadFilterOwner } from "./leads-filters";
import {
  CRM_CHANNEL_LABELS,
  CRM_LEAD_STAGES,
  CRM_STAGE_LABELS,
  CRM_STAGE_STATUS,
  formatLeadValue,
  isOverdue,
} from "./stage-config";

/**
 * Every column this table knows how to draw, for the picker.
 *
 * Kept beside the definitions rather than in a shared file so the two cannot
 * drift: a column somebody can turn on that the table does not render is worse
 * than no picker at all.
 */
export const LEAD_TABLE_COLUMNS: ColumnOption[] = [
  { id: "leadNo", label: "Lead", required: true },
  { id: "client", label: "Client" },
  { id: "stage", label: "Stage" },
  { id: "value", label: "Value" },
  { id: "owner", label: "Owner" },
  { id: "nextTask", label: "Next task" },
  { id: "source", label: "Source" },
  { id: "updatedAt", label: "Updated" },
];

function OwnerCell({ owner }: { owner: CrmLeadListRecord["assignedTo"] }) {
  if (!owner) {
    return <span className="text-sm text-[var(--text-muted)]">Unassigned</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <RecordMark kind="rep" name={owner.name} size="sm" />
      <span className="truncate text-sm">{owner.name ?? "Unnamed"}</span>
    </div>
  );
}

function NextTaskCell({ task }: { task: CrmLeadListRecord["nextFollowUp"] }) {
  if (!task) return <span className="text-sm text-[var(--text-muted)]">—</span>;
  const overdue = isOverdue(task.dueAt);
  return (
    <div className="min-w-0">
      <div className="truncate text-sm">{task.title}</div>
      <div
        className={cn(
          "text-sm",
          overdue ? "font-medium text-[var(--status-error-text)]" : "text-[var(--text-muted)]",
        )}
      >
        {overdue ? "Overdue · " : ""}
        <ClientDate value={task.dueAt} />
      </div>
    </div>
  );
}

export function LeadsTable({
  leads,
  total,
  page,
  pageSize,
  sort,
  isLoading,
  owners,
  onPageChange,
  onSortChange,
  onBulkAssign,
  onBulkStage,
  hiddenColumns,
}: {
  leads: CrmLeadListRecord[];
  total: number;
  page: number;
  pageSize: number;
  sort: LeadSort;
  isLoading: boolean;
  owners: LeadFilterOwner[];
  onPageChange: (page: number) => void;
  onSortChange: (sort: LeadSort) => void;
  onBulkAssign: (ids: string[], assignedToId: string | null, done: () => void) => void;
  onBulkStage: (ids: string[], stage: CrmLeadStage, done: () => void) => void;
  /** Column ids the reader has switched off. */
  hiddenColumns?: string[];
}) {

  const columns = useMemo<ColumnDef<CrmLeadListRecord>[]>(
    () => [
      {
        id: "leadNo",
        header: "Lead",
        size: 220,
        cell: ({ row }) => (
          <Link
            href={`/crm/leads/${row.original.id}`}
            className="block min-w-0 underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--text-muted)]"
          >
            <div className="truncate font-medium">
              {row.original.title ?? row.original.leadNo}
            </div>
            <div className="truncate font-mono text-sm text-[var(--text-muted)]">
              {row.original.leadNo}
            </div>
          </Link>
        ),
      },
      {
        id: "client",
        header: "Client",
        size: 200,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm">{row.original.client?.name ?? "—"}</div>
            {row.original.contactName ? (
              <div className="truncate text-sm text-[var(--text-muted)]">
                {row.original.contactName}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "stage",
        header: "Stage",
        size: 140,
        cell: ({ row }) => (
          <StatusChip
            status={CRM_STAGE_STATUS[row.original.stage]}
            label={CRM_STAGE_LABELS[row.original.stage]}
          />
        ),
      },
      {
        id: "value",
        header: "Value",
        size: 130,
        cell: ({ row }) => (
          <NumericCell>
            {formatLeadValue(row.original.estimatedValue, row.original.currency)}
          </NumericCell>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        size: 170,
        cell: ({ row }) => <OwnerCell owner={row.original.assignedTo} />,
      },
      {
        id: "nextTask",
        header: "Next task",
        size: 180,
        cell: ({ row }) => <NextTaskCell task={row.original.nextFollowUp} />,
      },
      {
        id: "source",
        header: "Source",
        size: 150,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm">{row.original.source ?? "—"}</div>
            <div className="truncate text-sm text-[var(--text-muted)]">
              {CRM_CHANNEL_LABELS[row.original.sourceChannel ?? ""] ??
                row.original.sourceChannel ??
                ""}
            </div>
          </div>
        ),
      },
      {
        id: "updatedAt",
        header: "Updated",
        size: 130,
        cell: ({ row }) => (
          <span className="text-sm text-[var(--text-muted)]">
            <ClientDate value={row.original.updatedAt} />
          </span>
        ),
      },
    ],
    [],
  );

  const hiddenSet = useMemo(() => new Set(hiddenColumns ?? []), [hiddenColumns]);
  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenSet.has(String(column.id))),
    [columns, hiddenSet],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <DataTable
      data={leads}
      columns={visibleColumns}
      edgeToEdge
      stickyHeader
      queryState={{
        mode: "paginated",
        page,
        pageSize,
        sortBy: sort.field,
        sortDirection: sort.direction,
      }}
      onQueryStateChange={(next) => {
        if (next.page && next.page !== page) onPageChange(next.page);
        if (next.sortBy && next.sortBy !== sort.field) {
          onSortChange({
            field: next.sortBy as LeadSort["field"],
            direction: next.sortDirection ?? "desc",
          });
        } else if (next.sortDirection && next.sortDirection !== sort.direction) {
          onSortChange({ field: sort.field, direction: next.sortDirection });
        }
      }}
      pagination={{ enabled: true, server: true, total, totalPages }}
      rowSelection={{
        enabled: true,
        bulkActions: ({ selectedRows, clearSelection }) => {
          const ids = selectedRows.map((lead) => lead.id);
          return (
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    Assign owner
                    <ChevronDown className="size-3 text-[var(--text-muted)]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  <DropdownMenuLabel>Assign {ids.length} lead{ids.length === 1 ? "" : "s"} to</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {owners.map((owner) => (
                    <DropdownMenuItem
                      key={owner.id}
                      onClick={() => onBulkAssign(ids, owner.id, clearSelection)}
                    >
                      {owner.name ?? "Unnamed"}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onBulkAssign(ids, null, clearSelection)}>
                    Leave unassigned
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    Change stage
                    <ChevronDown className="size-3 text-[var(--text-muted)]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {CRM_LEAD_STAGES.map((stage: CrmLeadStage) => (
                    <DropdownMenuItem
                      key={stage}
                      onClick={() => onBulkStage(ids, stage, clearSelection)}
                    >
                      {CRM_STAGE_LABELS[stage]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }}
      // On a phone the table becomes the same list every other CRM surface
      // uses: one row per lead, two lines inside it, rows separated by
      // whitespace. The owner joins the reference line rather than earning a
      // third row of its own, and the value sits on the right.
      mobileListRenderer={({ rows: mobileRows }) => (
        <RecordList
          rows={mobileRows.map(({ row }) => ({
            id: row.id,
            href: `/crm/leads/${row.id}`,
            title: row.title ?? row.leadNo,
            subtitle: `${row.leadNo} · ${row.client?.name ?? "No client"} · ${
              row.assignedTo?.name ?? "Unassigned"
            }`,
            status: (
              <StatusChip
                status={CRM_STAGE_STATUS[row.stage]}
                label={CRM_STAGE_LABELS[row.stage]}
              />
            ),
            facts: [
              { value: formatLeadValue(row.estimatedValue, row.currency), mono: true },
            ],
          }))}
        />
      )}
      emptyState={
        isLoading ? "Loading leads…" : "No leads match these filters."
      }
    />
  );
}
