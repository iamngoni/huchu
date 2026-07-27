"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrmLeadStage } from "@prisma/client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  fetchCrmLeadsBoard,
  updateCrmLeadStage,
  type CrmBoardCard,
  type CrmBoardColumn,
} from "@/lib/crm/crm-v2";
import type { LeadViewFilters } from "@/lib/crm/views";

import { BoardColumn } from "./board-column";
import { LeadCardBody } from "./lead-card";
import { LostReasonDialog } from "./lost-reason-dialog";
import { CRM_STAGE_LABELS } from "./stage-config";

type BoardData = { columns: CrmBoardColumn[]; cardsPerColumn: number };

/** Move a card between columns in the cache, keeping counts and totals in step. */
function moveCardInCache(
  data: BoardData,
  leadId: string,
  toStage: CrmLeadStage,
): BoardData {
  let moved: CrmBoardCard | undefined;
  const stripped = data.columns.map((column) => {
    const found = column.leads.find((lead) => lead.id === leadId);
    if (!found) return column;
    moved = found;
    const value = found.estimatedValue ?? 0;
    return {
      ...column,
      count: Math.max(0, column.count - 1),
      totalValue: column.totalValue - value,
      leads: column.leads.filter((lead) => lead.id !== leadId),
    };
  });

  if (!moved) return data;
  const card = { ...moved, stage: toStage, stageEnteredAt: new Date().toISOString() };
  const value = card.estimatedValue ?? 0;

  return {
    ...data,
    columns: stripped.map((column) =>
      column.stage === toStage
        ? {
            ...column,
            count: column.count + 1,
            totalValue: column.totalValue + value,
            leads: [card, ...column.leads],
          }
        : column,
    ),
  };
}

export function LeadsBoard({ filters }: { filters: LeadViewFilters }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeCard, setActiveCard] = useState<CrmBoardCard | null>(null);
  const [pendingLost, setPendingLost] = useState<CrmBoardCard | null>(null);

  const queryKey = useMemo(() => ["crm", "board", filters] as const, [filters]);

  const boardQuery = useQuery({
    queryKey,
    queryFn: () => fetchCrmLeadsBoard(filters),
    placeholderData: (previous) => previous,
  });

  const sensors = useSensors(
    // A small activation distance keeps a click on the card title a click,
    // not an accidental one-pixel drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const moveStage = useMutation({
    mutationFn: ({
      leadId,
      stage,
      lostReason,
    }: {
      leadId: string;
      stage: CrmLeadStage;
      lostReason?: string;
    }) => updateCrmLeadStage(leadId, stage, lostReason),
    onMutate: async ({ leadId, stage }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ data: BoardData }>(queryKey);
      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          data: moveCardInCache(previous.data, leadId, stage),
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast({
        title: "Could not move the lead",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
    onSuccess: (_result, { stage }) => {
      toast({ title: `Moved to ${CRM_STAGE_LABELS[stage]}` });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "board"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
    },
  });

  const columns = boardQuery.data?.data.columns ?? [];

  const resolveDropStage = (overId: string): CrmLeadStage | null => {
    if (overId.startsWith("column:")) return overId.slice("column:".length) as CrmLeadStage;
    // Dropped onto another card — inherit that card's column.
    const target = columns.find((column) => column.leads.some((lead) => lead.id === overId));
    return target?.stage ?? null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const found = columns.flatMap((column) => column.leads).find((lead) => lead.id === id);
    setActiveCard(found ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const card = activeCard;
    setActiveCard(null);
    if (!card || !event.over) return;

    const toStage = resolveDropStage(String(event.over.id));
    if (!toStage || toStage === card.stage) return;

    if (toStage === "LOST") {
      setPendingLost(card);
      return;
    }
    moveStage.mutate({ leadId: card.id, stage: toStage });
  };

  if (boardQuery.isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-96 w-72 shrink-0 rounded-[var(--card-radius)]" />
        ))}
      </div>
    );
  }

  if (boardQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load the pipeline</AlertTitle>
        <AlertDescription>{getApiErrorMessage(boardQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  // Columns report their own currency mix; the first lead's currency is a
  // reasonable label for a tenant that trades in one.
  const currency =
    columns.flatMap((column) => column.leads).find((lead) => lead.currency)?.currency ?? "USD";

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCard(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <BoardColumn
              key={column.stage}
              column={column}
              currency={currency}
              onViewAll={() => {
                toast({
                  title: `${CRM_STAGE_LABELS[column.stage]} has ${column.count} leads`,
                  description: "Switch to the table view to page through all of them.",
                });
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-72 rotate-1 rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
              <LeadCardBody lead={activeCard} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <LostReasonDialog
        open={Boolean(pendingLost)}
        leadLabel={pendingLost?.title ?? pendingLost?.leadNo}
        isPending={moveStage.isPending}
        onCancel={() => setPendingLost(null)}
        onConfirm={(reason) => {
          if (!pendingLost) return;
          moveStage.mutate(
            { leadId: pendingLost.id, stage: "LOST", lostReason: reason },
            { onSettled: () => setPendingLost(null) },
          );
        }}
      />
    </>
  );
}
