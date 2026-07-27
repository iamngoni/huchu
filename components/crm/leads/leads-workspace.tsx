"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrmLeadStage } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { Plus } from "@/lib/icons";
import {
  bulkUpdateCrmLeads,
  fetchCrmLeads,
  fetchCrmSavedViews,
  type CrmSavedViewRecord,
} from "@/lib/crm/crm-v2";
import { DEFAULT_LEAD_SORT, type LeadSort, type LeadViewFilters } from "@/lib/crm/views";

import { LeadsBoard } from "./leads-board";
import { LeadsFilters, type LeadFilterOwner } from "./leads-filters";
import { LeadsTable } from "./leads-table";
import { LeadFormSheet } from "./lead-form-sheet";
import { LostReasonDialog } from "./lost-reason-dialog";
import { SavedViewsBar } from "./saved-views-bar";

const PAGE_SIZE = 50;

type PendingLostBulk = { ids: string[]; done: () => void };

export function LeadsWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [viewType, setViewType] = useState<"TABLE" | "BOARD">("TABLE");
  const [filters, setFilters] = useState<LeadViewFilters>({});
  const [sort, setSort] = useState<LeadSort>(DEFAULT_LEAD_SORT);
  const [page, setPage] = useState(1);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
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
  const savedViews = useMemo<CrmSavedViewRecord[]>(
    () => savedViewsQuery.data?.data.data ?? [],
    [savedViewsQuery.data],
  );

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
      const { updated, skipped } = result.data;
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
  const total = leadsQuery.data?.total ?? leads.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SavedViewsBar
          views={savedViews}
          filters={filters}
          sort={sort}
          activeViewId={activeViewId}
          onSelectView={(view) => {
            setActiveViewId(view.id);
            setFilters(view.filters);
            if (view.sort) setSort(view.sort);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          <SegmentedControl
            value={viewType}
            onValueChange={(value) => setViewType(value as "TABLE" | "BOARD")}
            options={[
              { value: "TABLE", label: "Table" },
              { value: "BOARD", label: "Board" },
            ]}
          />
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New lead
          </Button>
        </div>
      </div>

      <LeadsFilters
        filters={filters}
        onChange={applyFilters}
        owners={owners}
        sources={sources}
      />

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
        <LeadsBoard filters={filters} />
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
