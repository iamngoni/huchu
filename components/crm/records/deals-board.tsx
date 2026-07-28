"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  defaultDropAnimationSideEffects,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { ClientDate } from "@/components/ui/client-date";
import { getApiErrorMessage } from "@/lib/api-client";
import { Clock } from "@/lib/icons";
import {
  fetchCrmDealsBoard,
  updateCrmDealStage,
  type CrmDealBoard,
  type CrmDealBoardCard,
  type CrmDealBoardColumn,
} from "@/lib/crm/crm-v2";
import { cn } from "@/lib/utils";

import { isOverdue } from "@/components/crm/leads/stage-config";

import { RecordMark } from "./record-mark";

/**
 * The card animates back into its column rather than vanishing. Without this
 * the overlay is destroyed the instant the pointer lifts and the card appears
 * to teleport.
 */
const DROP_ANIMATION: DropAnimation = {
  duration: 220,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

function money(value: number | null, currency: string): string {
  if (typeof value !== "number") return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-[var(--brand)]",
  WON: "bg-[var(--tone-success)]",
  LOST: "bg-[var(--tone-danger)]",
};

function DealCardBody({ deal }: { deal: CrmDealBoardCard }) {
  const overdue = isOverdue(deal.nextFollowUp?.dueAt);

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <RecordMark
          kind="deal"
          name={deal.title}
          emoji={deal.emoji}
          avatarUrl={deal.avatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{deal.title}</p>
          <p className="truncate text-sm text-[var(--text-muted)]">
            <span className="font-mono">{deal.dealNo}</span>
            {" · "}
            {deal.client?.name ?? "No company"}
          </p>
        </div>
        {overdue ? (
          <span
            className="mt-1 size-2 shrink-0 rounded-full bg-[var(--status-error-border)]"
            title={`Overdue: ${deal.nextFollowUp?.title ?? "task"}`}
            aria-label="Has an overdue task"
          />
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm">{money(deal.value, deal.currency)}</span>
        <RecordMark
          kind="rep"
          name={deal.assignedTo?.name ?? "Unassigned"}
          size="sm"
          className="shrink-0"
        />
      </div>

      {deal.expectedCloseDate ? (
        <p className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
          <Clock className="size-3" />
          <span>
            Expected <ClientDate value={deal.expectedCloseDate} mode="date" />
          </span>
        </p>
      ) : null}
    </div>
  );
}

function DealCard({ deal }: { deal: CrmDealBoardCard }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stageId: deal.stageId },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition:
          transition ??
          "transform var(--motion-duration-base, 180ms) var(--motion-ease-standard, ease)",
      }}
      className={cn(
        "rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--surface)] p-3",
        "cursor-grab shadow-[var(--shadow-xs)] transition-shadow active:cursor-grabbing",
        "hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)]",
        isDragging &&
          "border-dashed bg-[var(--surface-muted)] opacity-50 shadow-none [&_*]:invisible",
      )}
      {...attributes}
      {...listeners}
    >
      <Link
        href={`/crm/deals/${deal.id}`}
        className="block focus:outline-none focus-visible:underline"
        onClick={(event) => event.stopPropagation()}
      >
        <DealCardBody deal={deal} />
      </Link>
    </div>
  );
}

function DealColumn({ column, currency }: { column: CrmDealBoardColumn; currency: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${column.stage.id}` });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-[var(--card-radius)] transition-colors",
        isOver
          ? "bg-[var(--action-primary-bg)]/[0.06] ring-1 ring-[var(--action-primary-bg)]"
          : "bg-transparent",
      )}
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-[var(--surface-base)] px-1 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "size-2 flex-none rounded-full",
              STATUS_DOT[column.stage.status] ?? "bg-[var(--text-subtle)]",
            )}
          />
          <h3 className="truncate text-sm font-medium">{column.stage.name}</h3>
          <span className="font-mono text-sm text-[var(--text-subtle)]">{column.count}</span>
        </div>
        {column.totalValue > 0 ? (
          <span className="font-mono text-sm text-[var(--text-muted)]">
            {money(column.totalValue, currency)}
          </span>
        ) : null}
      </header>

      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-2">
        <SortableContext
          items={column.deals.map((deal) => deal.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>

        {column.deals.length === 0 ? (
          <p
            className={cn(
              "rounded-[var(--radius-md)] border border-dashed px-1 py-6 text-center text-sm transition-colors",
              isOver
                ? "border-[var(--action-primary-bg)] text-[var(--action-primary-bg)]"
                : "border-[var(--border)] text-[var(--text-muted)]",
            )}
          >
            Drop a deal here
          </p>
        ) : null}

        {column.hasMore ? (
          <p className="px-2 py-1.5 text-sm text-[var(--text-muted)]">
            Showing the {column.deals.length} most recently touched of {column.count}.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Move a card between columns in the cache, keeping counts and totals in step. */
function moveCardInCache(board: CrmDealBoard, dealId: string, toStageId: string): CrmDealBoard {
  let moved: CrmDealBoardCard | undefined;
  const stripped = board.columns.map((column) => {
    const found = column.deals.find((deal) => deal.id === dealId);
    if (!found) return column;
    moved = found;
    return {
      ...column,
      count: Math.max(0, column.count - 1),
      totalValue: Math.max(0, column.totalValue - (found.value ?? 0)),
      deals: column.deals.filter((deal) => deal.id !== dealId),
    };
  });

  if (!moved) return board;
  const card = { ...moved, stageId: toStageId };

  return {
    ...board,
    columns: stripped.map((column) =>
      column.stage.id === toStageId
        ? {
            ...column,
            count: column.count + 1,
            totalValue: column.totalValue + (card.value ?? 0),
            deals: [card, ...column.deals],
          }
        : column,
    ),
  };
}

/**
 * One pipeline's deals as a board.
 *
 * Which pipeline is the caller's choice, because a board mixing pipelines
 * would have columns meaning different things depending on which card sits in
 * them — and dragging between those columns would be nonsense.
 */
export function DealsBoard({
  pipelineId,
  search,
  className,
}: {
  pipelineId: string | null;
  search?: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dragging, setDragging] = useState<CrmDealBoardCard | null>(null);

  const queryKey = useMemo(
    () => ["crm", "deals-board", pipelineId, search ?? ""],
    [pipelineId, search],
  );

  const boardQuery = useQuery({
    queryKey,
    queryFn: () => fetchCrmDealsBoard({ pipelineId, q: search }),
    placeholderData: (previous) => previous,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      updateCrmDealStage(dealId, stageId),
    onMutate: async ({ dealId, stageId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CrmDealBoard>(queryKey);
      if (previous) {
        queryClient.setQueryData(queryKey, moveCardInCache(previous, dealId, stageId));
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      // Put it back where it was: a card that stayed in the new column after a
      // failed save is a lie the next reader has no way to spot.
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast({
        title: "Could not move the deal",
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "deals-board"] });
      queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
    },
  });

  const board = boardQuery.data;
  const currency = board?.columns.flatMap((column) => column.deals)[0]?.currency ?? "USD";

  if (boardQuery.isLoading && !board) {
    return (
      <div className="flex gap-3" aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-96 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  if (boardQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load the board</AlertTitle>
        <AlertDescription>{getApiErrorMessage(boardQuery.error)}</AlertDescription>
      </Alert>
    );
  }

  if (!board) return null;

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setDragging(
      board.columns.flatMap((column) => column.deals).find((deal) => deal.id === id) ?? null,
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const over = event.over;
    if (!over) return;

    const dealId = String(event.active.id);
    const overId = String(over.id);
    // A drop lands either on a column or on another card in one.
    const stageId = overId.startsWith("stage:")
      ? overId.slice("stage:".length)
      : board.columns.find((column) => column.deals.some((deal) => deal.id === overId))?.stage.id;

    if (!stageId) return;
    const from = board.columns.find((column) =>
      column.deals.some((deal) => deal.id === dealId),
    );
    if (!from || from.stage.id === stageId) return;

    move.mutate({ dealId, stageId });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className={cn("scroll-rail flex gap-3 overflow-x-auto pb-2", className)}>
        {board.columns.map((column) => (
          <DealColumn key={column.stage.id} column={column} currency={currency} />
        ))}
      </div>

      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {dragging ? (
          <div className="w-72 rotate-1 rounded-[var(--card-radius)] border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-[var(--elevation-3)]">
            <DealCardBody deal={dragging} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
