"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import { NumericCell } from "@/components/ui/numeric-cell";
import { StatusChip } from "@/components/ui/status-chip";
import { ClientDate } from "@/components/ui/client-date";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useDebounced } from "@/hooks/use-debounced";
import { fetchCrmDeals, fetchCrmPipelines, type CrmDealRecord } from "@/lib/crm/crm-v2";
import { isDealStale } from "@/lib/crm/pipelines";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";

import { DealsBoard } from "./deals-board";
import { BoardFieldsProvider, DEAL_CARD_FIELDS } from "./board-fields";
import { ColumnPicker } from "@/components/ui/column-picker";
import { useVisibleColumns, type ColumnOption } from "@/lib/ui/visible-columns";
import { DealFormSheet } from "./deal-form-sheet";
import { PipelineSwitcher } from "./pipeline-switcher";
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

/** Every column the deals table knows how to draw, for the picker. */
const DEAL_TABLE_COLUMNS: ColumnOption[] = [
  { id: "deal", label: "Deal", required: true },
  { id: "company", label: "Company" },
  { id: "stage", label: "Stage" },
  { id: "value", label: "Value" },
  { id: "close", label: "Expected close" },
  { id: "owner", label: "Owner" },
  { id: "next", label: "Next task" },
];

export function DealsContent({
  openCreate = false,
  pipelineId: pipelineIdProp,
  onPickPipeline,
}: {
  openCreate?: boolean;
  /** Set by the unified workspace, which owns which pipeline is showing. */
  pipelineId?: string;
  onPickPipeline?: (target: "leads" | string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "WON" | "LOST" | "ALL">("OPEN");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(openCreate);
  const debouncedSearch = useDebounced(search, 300);

  // Which pipeline, and whether to work it as a board or read it as a list.
  // Both live in state rather than the URL because they are how you are
  // looking at the page, not what the page is.
  // Arriving from the leads page's pipeline menu lands on ?pipeline=<id>.
  const requestedPipeline = useSearchParams().get("pipeline");
  const [ownPipelineId, setOwnPipelineId] = useState<string | null>(requestedPipeline);
  // The parent wins when there is one: the unified workspace holds the choice
  // so the menu can cross to leads, which this component knows nothing about.
  const pipelineId = pipelineIdProp ?? ownPipelineId;
  const setPipelineId = (next: string) =>
    onPickPipeline ? onPickPipeline(next) : setOwnPipelineId(next);
  const [layout, setLayout] = useState<"BOARD" | "LIST">("BOARD");

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
  const pipelines = useMemo(() => pipelinesQuery.data?.data ?? [], [pipelinesQuery.data]);
  // Nothing chosen means the default one, which is what the board falls back
  // to server-side; naming it here keeps the picker's label honest.
  const activePipeline =
    pipelines.find((pipeline) => pipeline.id === pipelineId) ??
    pipelines.find((pipeline) => pipeline.isDefault) ??
    pipelines[0] ??
    null;

  const tableColumns = useVisibleColumns("crm.deals.table", DEAL_TABLE_COLUMNS);
  const boardFields = useVisibleColumns("crm.deals.board", DEAL_CARD_FIELDS);

  const columns = useMemo<ColumnDef<CrmDealRecord>[]>(
    () => [
      {
        id: "deal",
        header: "Deal",
        size: 240,
        cell: ({ row }) => (
          <Link
            href={`/crm/deals/${row.original.id}`}
            className="block min-w-0 underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--text-muted)]"
          >
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate font-mono text-sm text-[var(--text-muted)]">
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
              <div className="truncate text-sm text-[var(--text-muted)]">
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
                <Badge variant="outline" className="text-sm text-[var(--status-warning-text)]">
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
              <div className="truncate text-sm text-[var(--text-muted)]">
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

  const visibleColumns = useMemo(
    () => columns.filter((column) => tableColumns.isVisible(String(column.id))),
    [columns, tableColumns],
  );

  return (
    <RecordListShell
      title="Deals"
      search={search}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      searchPlaceholder="Search deals by title, number or company"
      createLabel="New deal"
      onCreate={() => setCreateOpen(true)}
      error={dealsQuery.error}
      display={
        <ColumnPicker
          columns={layout === "BOARD" ? DEAL_CARD_FIELDS : DEAL_TABLE_COLUMNS}
          state={layout === "BOARD" ? boardFields : tableColumns}
          label={layout === "BOARD" ? "Card fields" : "Columns"}
        />
      }
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
          {/* A pipeline is a different shape of work, not a filter over one
              shape — supply-only and supply-and-fit do not share stages — so
              picking one swaps the board rather than narrowing it. */}
          <PipelineSwitcher
            active={activePipeline?.id ?? null}
            onPick={onPickPipeline}
            onPickPipeline={setPipelineId}
          />

          <SegmentedControl
            value={layout}
            onValueChange={(value) => setLayout(value as typeof layout)}
            size="sm"
            ariaLabel="Board or list"
            options={[
              { value: "BOARD", label: "Board" },
              { value: "LIST", label: "List" },
            ]}
          />

        </>
      }
    >
      {layout === "BOARD" ? (
        <BoardFieldsProvider hidden={boardFields.hidden}>
          <DealsBoard
            pipelineId={activePipeline?.id ?? null}
            search={debouncedSearch}
            className="min-h-[24rem]"
          />
        </BoardFieldsProvider>
      ) : (
      <DataTable
        // The shell above owns search; a second box in the table toolbar is the
        // duplicate-control failure the cookbook's one-filter-pathway rule exists to stop.
        features={{ globalFilter: false }}
        data={rows}
        columns={visibleColumns}
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
                <div className="truncate font-mono text-sm text-[var(--text-muted)]">
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
      )}

      <DealFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </RecordListShell>
  );
}
