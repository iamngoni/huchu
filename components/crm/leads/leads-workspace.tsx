"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrmLeadStage } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { Funnel, Plus } from "@/lib/icons";
import { PageChrome } from "@/components/layout/page-chrome";
import {
  bulkUpdateCrmLeads,
  fetchCrmLeads,
  fetchCrmSavedViews,
} from "@/lib/crm/crm-v2";
import { DEFAULT_LEAD_SORT, type LeadSort, type LeadViewFilters } from "@/lib/crm/views";

import { LeadsBoard } from "./leads-board";
import {
  LeadsFilters,
  LeadsSortButton,
  LeadStageFilter,
  type LeadFilterOwner,
} from "./leads-filters";
import { LeadsTable } from "./leads-table";
import { LeadFormSheet } from "./lead-form-sheet";
import { LostReasonDialog } from "./lost-reason-dialog";
import {
  BUILT_IN_VIEWS,
  savedViewToLeadView,
  ViewPicker,
  type LeadView,
} from "./view-picker";

const PAGE_SIZE = 50;

type PendingLostBulk = { ids: string[]; done: () => void };

export function LeadsWorkspace({
  initialFilters = {},
  initialView = "BOARD",
  initialViewId = null,
}: {
  /** Parsed from the page's query string, so links like /crm/leads?stages=QUOTED land pre-filtered. */
  initialFilters?: LeadViewFilters;
  initialView?: "TABLE" | "BOARD";
  /** From `?view=`, so the sidebar's saved-view links land on that view. */
  initialViewId?: string | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [viewType, setViewType] = useState<"TABLE" | "BOARD">(initialView);
  const [filters, setFilters] = useState<LeadViewFilters>(initialFilters);
  const [sort, setSort] = useState<LeadSort>(DEFAULT_LEAD_SORT);
  const [page, setPage] = useState(1);
  const [activeViewKey, setActiveViewKey] = useState<string>(
    initialViewId ?? BUILT_IN_VIEWS[0].key,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingLostBulk, setPendingLostBulk] = useState<PendingLostBulk | null>(null);

  const teamQuery = useQuery({
    queryKey: ["crm", "team"],
    queryFn: () => fetchJson<{ data: LeadFilterOwner[] }>("/api/v2/crm/team"),
  });

  const sourcesQuery = useQuery({
    queryKey: ["crm", "lead-sources"],
    queryFn: () =>
      fetchJson<{ data: Array<{ id: string; name: string; isActive: boolean }> }>(
        "/api/v2/crm/lead-sources",
      ),
  });

  const savedViewsQuery = useQuery({
    queryKey: ["crm", "saved-views"],
    queryFn: () => fetchCrmSavedViews(),
  });

  const leadsQuery = useQuery({
    queryKey: ["crm", "leads", filters, sort, page],
    queryFn: () => fetchCrmLeads({ filters, sort, page, limit: PAGE_SIZE }),
    enabled: viewType === "TABLE",
    placeholderData: (previous) => previous,
  });

  const owners = useMemo(() => teamQuery.data?.data ?? [], [teamQuery.data]);
  const sources = useMemo(
    () => (sourcesQuery.data?.data ?? []).filter((s) => s.isActive).map((s) => s.name),
    [sourcesQuery.data],
  );
  // Built-ins first, then whatever has been saved — one list, so the picker
  // does not have to know which is which beyond whether it can be renamed.
  const views = useMemo<LeadView[]>(
    () => [
      ...BUILT_IN_VIEWS,
      ...(savedViewsQuery.data?.data ?? []).map(savedViewToLeadView),
    ],
    [savedViewsQuery.data],
  );

  // A saved view arriving by link is only known once the list has loaded, so
  // its filters are applied during render the moment it appears rather than in
  // an effect that would paint the wrong leads first.
  const [appliedViewKey, setAppliedViewKey] = useState<string | null>(null);
  if (initialViewId && appliedViewKey !== initialViewId) {
    const linked = views.find((view) => view.key === initialViewId);
    if (linked) {
      setAppliedViewKey(initialViewId);
      setActiveViewKey(linked.key);
      setViewType(linked.layout);
      setFilters(linked.filters);
      setSort(linked.sort ?? DEFAULT_LEAD_SORT);
    }
  }

  const refreshLeadLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
    queryClient.invalidateQueries({ queryKey: ["crm", "board"] });
  }, [queryClient]);

  const applyFilters = useCallback((next: LeadViewFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const bulk = useMutation({
    mutationFn: bulkUpdateCrmLeads,
    onSuccess: (result) => {
      refreshLeadLists();
      const { updated, skipped } = result;
      toast({
        title: `${updated} lead${updated === 1 ? "" : "s"} updated`,
        description:
          skipped > 0
            ? `${skipped} skipped — they belong to someone else.`
            : undefined,
      });
    },
    onError: (error) =>
      toast({
        title: "Bulk update failed",
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  const handleBulkAssign = useCallback(
    (ids: string[], assignedToId: string | null, done: () => void) => {
      bulk.mutate({ action: "assign", ids, assignedToId }, { onSuccess: done });
    },
    [bulk],
  );

  const handleBulkStage = useCallback(
    (ids: string[], stage: CrmLeadStage, done: () => void) => {
      // Losing deals always asks why — see LostReasonDialog.
      if (stage === "LOST") {
        setPendingLostBulk({ ids, done });
        return;
      }
      bulk.mutate({ action: "stage", ids, stage }, { onSuccess: done });
    },
    [bulk],
  );

  const leads = leadsQuery.data?.data ?? [];
  const total = leadsQuery.data?.pagination?.total ?? leads.length;

  const newLeadAction = useMemo(
    () => (
      <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
        <Plus className="h-4 w-4" />
        New lead
      </Button>
    ),
    [],
  );

  return (
    // A column that fills the scroll area, so the board underneath can be told
    // to take whatever height is left rather than sizing to its tallest column.
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4">
      <PageChrome title="Leads" icon={Funnel}>
        {newLeadAction}
      </PageChrome>

      {/* One row: which leads, what is hidden, and in what order. The view
          carries its own layout, so there is no separate Table/Board switch to
          contradict it. Stage stays out here rather than inside Filter because
          on a board it is not a filter at all — it decides which columns
          exist. */}
      <div className="flex flex-wrap items-center gap-2">
        <ViewPicker
          views={views}
          activeKey={activeViewKey}
          filters={filters}
          sort={sort}
          onSelect={(view) => {
            setActiveViewKey(view.key);
            setViewType(view.layout);
            setFilters(view.filters);
            setSort(view.sort ?? DEFAULT_LEAD_SORT);
            setPage(1);
          }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["crm", "saved-views"] })}
        />

        <LeadsFilters
          filters={filters}
          onChange={applyFilters}
          owners={owners}
          sources={sources}
        />

        {/* A board is already ordered by stage, so sorting it means nothing. */}
        {viewType === "TABLE" ? (
          <LeadsSortButton
            sort={sort}
            onChange={(next) => {
              setSort(next);
              setPage(1);
            }}
          />
        ) : null}

        <LeadStageFilter filters={filters} onChange={applyFilters} />
      </div>

      {leadsQuery.error && viewType === "TABLE" ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load leads</AlertTitle>
          <AlertDescription>{getApiErrorMessage(leadsQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {viewType === "TABLE" ? (
        <LeadsTable
          leads={leads}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          sort={sort}
          isLoading={leadsQuery.isLoading}
          owners={owners}
          onPageChange={setPage}
          onSortChange={(next) => {
            setSort(next);
            setPage(1);
          }}
          onBulkAssign={handleBulkAssign}
          onBulkStage={handleBulkStage}
        />
      ) : (
        <LeadsBoard filters={filters} className="min-h-0 flex-1" />
      )}

      <LeadFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        owners={owners}
        onSaved={refreshLeadLists}
      />

      <LostReasonDialog
        open={Boolean(pendingLostBulk)}
        count={pendingLostBulk?.ids.length}
        isPending={bulk.isPending}
        onCancel={() => setPendingLostBulk(null)}
        onConfirm={(reason) => {
          if (!pendingLostBulk) return;
          const { ids, done } = pendingLostBulk;
          bulk.mutate(
            { action: "stage", ids, stage: "LOST", lostReason: reason },
            {
              onSuccess: () => {
                done();
                setPendingLostBulk(null);
              },
            },
          );
        }}
      />
    </div>
  );
}
