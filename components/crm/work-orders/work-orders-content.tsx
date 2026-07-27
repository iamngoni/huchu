"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClientDate } from "@/components/ui/client-date";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status-chip";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  WORK_ORDER_QUEUE_LABELS,
  WORK_ORDER_STATUS_LABELS,
  completionPercent,
  isOverdueToStart,
  type WorkOrderQueue,
} from "@/lib/crm/work-orders";
import { Clock, MapPin, Users } from "@/lib/icons";
import type { CanonicalUiStatus } from "@/lib/ui/status-map";
import { cn } from "@/lib/utils";

import { WorkOrderSheet, type WorkOrderRecord } from "./work-order-sheet";

const QUEUES: WorkOrderQueue[] = ["TODAY", "SCHEDULED", "IN_PROGRESS", "BLOCKED", "MINE", "DONE"];

const STATUS_TONE: Record<string, CanonicalUiStatus> = {
  DRAFT: "inactive",
  SCHEDULED: "pending",
  IN_PROGRESS: "in_progress",
  BLOCKED: "failing",
  COMPLETED: "passing",
  CANCELLED: "inactive",
};

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
      <div className="scroll-rail flex flex-wrap gap-1.5">
        {QUEUES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setQueue(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              queue === value
                ? "bg-[var(--surface-inverse)] text-[var(--text-inverse)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]",
            )}
          >
            {WORK_ORDER_QUEUE_LABELS[value]}
          </button>
        ))}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load jobs</AlertTitle>
          <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="rounded-[var(--card-radius)] border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
          {EMPTY_MESSAGES[queue]}
        </p>
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
                      status={STATUS_TONE[order.status] ?? "inactive"}
                      label={WORK_ORDER_STATUS_LABELS[order.status]}
                    />
                    {late ? (
                      <span className="text-xs font-medium text-[var(--status-error-text)]">
                        Should have started
                      </span>
                    ) : null}
                  </div>

                  <p className="font-medium">{order.title}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
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
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                        <div
                          className="h-full rounded-full bg-[var(--surface-inverse)]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {percent}% done · {order.items.length} item
                        {order.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  ) : null}

                  {order.status === "BLOCKED" && order.blockedReason ? (
                    <p className="text-xs text-[var(--status-error-text)]">
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
