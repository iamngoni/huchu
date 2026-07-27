"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import { NumericCell } from "@/components/ui/numeric-cell";
import { StatusChip } from "@/components/ui/status-chip";
import { ClientDate } from "@/components/ui/client-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useDebounced } from "@/hooks/use-debounced";
import { fetchCrmDeals, fetchCrmPipelines, type CrmDealRecord } from "@/lib/crm/crm-v2";
import { isDealStale } from "@/lib/crm/pipelines";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";

import { DealFormSheet } from "./deal-form-sheet";
import { RecordListShell } from "./record-list-shell";

const PAGE_SIZE = 50;

const STATUS_PRESENTATION: Record<string, CanonicalUiStatus> = {
  OPEN: "in_progress",
  WON: "passing",
  LOST: "failing",
};

function formatMoney(value: number | null, currency: string): string {
  if (typeof value !== "number") return "—";
  return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function DealsContent({ openCreate = false }: { openCreate?: boolean }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "WON" | "LOST" | "ALL">("OPEN");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(openCreate);
  const debouncedSearch = useDebounced(search, 300);

  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines"],
    queryFn: () => fetchCrmPipelines(),
  });

  const dealsQuery = useQuery({
    queryKey: ["crm", "deals", debouncedSearch, statusFilter, page],
    queryFn: () =>
      fetchCrmDeals({
        filters: {
          q: debouncedSearch,
          statuses: statusFilter === "ALL" ? undefined : [statusFilter],
        },
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  });

  const rows = useMemo(() => dealsQuery.data?.data ?? [], [dealsQuery.data]);
  const total = dealsQuery.data?.pagination?.total ?? rows.length;
  const pipelineCount = pipelinesQuery.data?.data.length ?? 0;

  const columns = useMemo<ColumnDef<CrmDealRecord>[]>(
    () => [
      {
        id: "deal",
        header: "Deal",
        size: 240,
        cell: ({ row }) => (
          <Link href={`/crm/deals/${row.original.id}`} className="block min-w-0 hover:underline">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate font-mono text-xs text-[var(--text-muted)]">
              {row.original.dealNo}
            </div>
          </Link>
        ),
      },
      {
        id: "company",
        header: "Company",
        size: 190,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-sm">{row.original.client?.name ?? "—"}</div>
            {row.original.primaryContact ? (
              <div className="truncate text-xs text-[var(--text-muted)]">
                {row.original.primaryContact.fullName}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "stage",
        header: "Stage",
        size: 170,
        cell: ({ row }) => {
          const stale = isDealStale(
            { stageEnteredAt: row.original.stageEnteredAt, status: row.original.status },
            { inactivityDays: row.original.stage.inactivityDays, status: row.original.stage.status },
          );
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusChip
                status={STATUS_PRESENTATION[row.original.stage.status] ?? "pending"}
                label={row.original.stage.name}
              />
              {stale ? (
                <Badge variant="outline" className="text-[11px] text-[var(--status-warning-text)]">
                  Stale
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "value",
        header: "Value",
        size: 130,
        cell: ({ row }) => (
          <NumericCell>{formatMoney(row.original.value, row.original.currency)}</NumericCell>
        ),
      },
      {
        id: "close",
        header: "Expected close",
        size: 140,
        cell: ({ row }) => (
          <span className="text-sm text-[var(--text-muted)]">
            {row.original.expectedCloseDate ? (
              <ClientDate value={row.original.expectedCloseDate} mode="date" />
            ) : (
              "—"
            )}
          </span>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        size: 150,
        cell: ({ row }) => (
          <span className="truncate text-sm">{row.original.assignedTo?.name ?? "Unassigned"}</span>
        ),
      },
      {
        id: "next",
        header: "Next task",
        size: 180,
        cell: ({ row }) =>
          row.original.nextFollowUp ? (
            <div className="min-w-0">
              <div className="truncate text-sm">{row.original.nextFollowUp.title}</div>
              <div className="truncate text-xs text-[var(--text-muted)]">
                <ClientDate value={row.original.nextFollowUp.dueAt} />
              </div>
            </div>
          ) : (
            <span className="text-sm text-[var(--text-muted)]">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <RecordListShell
      title="Deals"
      description="Every live opportunity, and what has to happen next on it."
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search deals by title, number or company"
      createLabel="New deal"
      onCreate={() => setCreateOpen(true)}
      error={dealsQuery.error}
      filters={
        <>
          <SegmentedControl
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as typeof statusFilter);
              setPage(1);
            }}
            size="sm"
            ariaLabel="Filter by status"
            options={[
              { value: "OPEN", label: "Open" },
              { value: "WON", label: "Won" },
              { value: "LOST", label: "Lost" },
              { value: "ALL", label: "All" },
            ]}
          />
          <Button asChild size="sm" variant="outline">
            <Link href="/crm/settings?tab=pipelines">
              {pipelineCount} pipeline{pipelineCount === 1 ? "" : "s"}
            </Link>
          </Button>
        </>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        edgeToEdge
        stickyHeader
        queryState={{ mode: "paginated", page, pageSize: PAGE_SIZE }}
        onQueryStateChange={(next) => {
          if (next.page && next.page !== page) setPage(next.page);
        }}
        pagination={{
          enabled: true,
          server: true,
          total,
          totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        }}
        mobileCardRenderer={({ row }) => (
          <Link
            href={`/crm/deals/${row.id}`}
            className="flex flex-col gap-1.5 rounded-[var(--card-radius)] border border-[var(--border)] p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{row.title}</div>
                <div className="truncate font-mono text-xs text-[var(--text-muted)]">
                  {row.dealNo} · {row.client?.name ?? "No company"}
                </div>
              </div>
              <StatusChip
                status={STATUS_PRESENTATION[row.stage.status] ?? "pending"}
                label={row.stage.name}
              />
            </div>
            <span className="font-mono text-sm">{formatMoney(row.value, row.currency)}</span>
          </Link>
        )}
        emptyState={
          dealsQuery.isLoading
            ? "Loading deals…"
            : statusFilter === "OPEN"
              ? "No open deals. Convert a qualified lead to start one."
              : "No deals match this filter."
        }
      />

      <DealFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </RecordListShell>
  );
}
