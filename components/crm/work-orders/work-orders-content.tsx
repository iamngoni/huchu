"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Alert, EmptyState, SegmentedControl, Skeleton, Stack } from "@corelithzw/react";
import { ClientDate } from "@/components/ui/client-date";
import { StatusChip } from "@/components/ui/status-chip";
import { WORK_ORDER_STATUS } from "@/lib/crm/tones";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  WORK_ORDER_QUEUE_LABELS,
  WORK_ORDER_STATUS_LABELS,
  completionPercent,
  isOverdueToStart,
  type WorkOrderQueue,
} from "@/lib/crm/work-orders";
import { Clock, Users } from "@/lib/icons";

import { WorkOrderSheet, type WorkOrderRecord } from "./work-order-sheet";

const QUEUES: WorkOrderQueue[] = ["TODAY", "SCHEDULED", "IN_PROGRESS", "BLOCKED", "MINE", "DONE"];

const EMPTY_MESSAGES: Partial<Record<WorkOrderQueue, string>> = {
  TODAY: "No jobs booked for today.",
  SCHEDULED: "Nothing scheduled yet.",
  IN_PROGRESS: "Nobody is on site right now.",
  BLOCKED: "Nothing is blocked.",
  MINE: "You have no jobs on.",
  DONE: "No jobs completed yet.",
};

export function WorkOrdersContent() {
  const { data: session } = useSession();
  const [queue, setQueue] = useState<WorkOrderQueue>("TODAY");
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-work-orders", queue],
    queryFn: () =>
      fetchJson<{ data: WorkOrderRecord[] }>(`/api/v2/crm/work-orders?queue=${queue}&limit=100`),
  });

  const orders = data?.data ?? [];

  return (
    <div className="max-w-3xl space-y-4">
      <SegmentedControl
        options={QUEUES.map((value) => ({ value, label: WORK_ORDER_QUEUE_LABELS[value] }))}
        value={queue}
        onValueChange={(value) => setQueue(value as WorkOrderQueue)}
        aria-label="Job queue"
      />

      {error ? (
        <Alert tone="danger" title="Couldn't load jobs">
          {getApiErrorMessage(error)}
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={96} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState title={EMPTY_MESSAGES[queue] ?? "Nothing here."} />
      ) : (
        // One line per job. A card with a title, a meta row and a progress
        // bar is four lines to read before you know whether this is the job
        // you are looking for; the number and the status answer that, and the
        // sheet carries the rest.
        <Stack as="ul" gap="xs">
          {orders.map((order) => {
            const percent = completionPercent(order.items);
            const late = isOverdueToStart(order);

            return (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => setOpen(order.id)}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-subtle)]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {order.title}
                    <span className="ml-2 font-mono text-sm font-normal text-[var(--text-muted)]">
                      {order.workOrderNo}
                    </span>
                  </span>

                  {late ? (
                    <span className="hidden flex-none text-sm font-medium text-[var(--status-error-text)] sm:inline">
                      Should have started
                    </span>
                  ) : null}

                  {order.items.length > 0 ? (
                    <span className="hidden flex-none font-mono text-sm tabular-nums text-[var(--text-muted)] sm:inline">
                      {percent}%
                    </span>
                  ) : null}

                  {order.scheduledStart ? (
                    <span className="hidden flex-none items-center gap-1 text-sm text-[var(--text-muted)] sm:inline-flex">
                      <Clock className="size-3.5" />
                      <ClientDate value={order.scheduledStart} mode="date" />
                    </span>
                  ) : null}

                  {order.assignedTo ? (
                    <span className="hidden flex-none items-center gap-1 text-sm text-[var(--text-muted)] md:inline-flex">
                      <Users className="size-3.5" />
                      {order.assignedTo.name}
                    </span>
                  ) : null}

                  <StatusChip
                    status={WORK_ORDER_STATUS[order.status] ?? "inactive"}
                    label={WORK_ORDER_STATUS_LABELS[order.status]}
                  />
                </button>
              </li>
            );
          })}
        </Stack>
      )}

      <WorkOrderSheet
        workOrderId={open}
        onOpenChange={(next) => !next && setOpen(null)}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
