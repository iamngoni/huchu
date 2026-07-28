"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Alert, EmptyState, Progress, SegmentedControl, Skeleton } from "@corelithzw/react";
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
import { Clock, MapPin, Users } from "@/lib/icons";

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
    <div className="space-y-4">
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
        <ul className="space-y-2">
          {orders.map((order) => {
            const percent = completionPercent(order.items);
            const late = isOverdueToStart(order);

            return (
              <li key={order.id}>
                {/* One big tap target: this list is read on a phone at a gate. */}
                <button
                  type="button"
                  onClick={() => setOpen(order.id)}
                  className="w-full space-y-2 rounded-[var(--card-radius)] border border-[var(--border)] p-3 text-left transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">{order.workOrderNo}</span>
                    <StatusChip
                      status={WORK_ORDER_STATUS[order.status] ?? "inactive"}
                      label={WORK_ORDER_STATUS_LABELS[order.status]}
                    />
                    {late ? (
                      <span className="text-sm font-medium text-[var(--status-error-text)]">
                        Should have started
                      </span>
                    ) : null}
                  </div>

                  <p className="font-medium">{order.title}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
                    {order.scheduledStart ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        <ClientDate value={order.scheduledStart} mode="datetime" />
                      </span>
                    ) : null}
                    {order.site?.name || order.addressLine ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {order.site?.name ?? order.addressLine}
                      </span>
                    ) : null}
                    {order.assignedTo ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {order.assignedTo.name}
                        {order.crewIds.length ? ` +${order.crewIds.length}` : ""}
                      </span>
                    ) : null}
                  </div>

                  {order.items.length > 0 ? (
                    <div className="space-y-1">
                      <Progress
                        value={percent}
                        tone={percent === 100 ? "success" : "brand"}
                        label={`${percent}% of the job done`}
                      />
                      <p className="text-sm text-[var(--text-muted)]">
                        {percent}% done · {order.items.length} item
                        {order.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  ) : null}

                  {order.status === "BLOCKED" && order.blockedReason ? (
                    <p className="text-sm text-[var(--status-error-text)]">
                      {order.blockedReason}
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <WorkOrderSheet
        workOrderId={open}
        onOpenChange={(next) => !next && setOpen(null)}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
