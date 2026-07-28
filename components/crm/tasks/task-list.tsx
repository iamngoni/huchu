"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge, Button, EmptyState } from "@corelithzw/react";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientDate } from "@/components/ui/client-date";
import { useToast } from "@/components/ui/use-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { deleteCrmTask, updateCrmTask, type CrmTaskRecord } from "@/lib/crm/crm-v2";
import {
  CRM_TASK_OUTCOME_LABELS,
  CRM_TASK_TYPE_LABELS,
  isTaskOverdue,
  requiresOutcome,
  taskRecordRef,
} from "@/lib/crm/tasks";
import { Clock, Repeat, Trash2 } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { CompleteTaskDialog } from "./complete-task-dialog";
import { TaskFormSheet } from "./task-form-sheet";

const PRIORITY_TONE: Record<string, string> = {
  LOW: "text-[var(--text-muted)]",
  NORMAL: "text-[var(--text-muted)]",
  HIGH: "text-[var(--status-warning-fg)]",
  URGENT: "text-[var(--status-danger-fg)]",
};

/**
 * The task list, shared by the queue page and every record page's Tasks tab.
 *
 * Ticking a typed task opens the outcome dialog rather than silently closing
 * it, because the answer is the part worth keeping.
 */
export function TaskList({
  tasks,
  isLoading,
  emptyMessage = "Nothing outstanding.",
  showRecord = true,
  currentUserId,
}: {
  tasks: CrmTaskRecord[];
  isLoading?: boolean;
  emptyMessage?: string;
  showRecord?: boolean;
  currentUserId?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [completing, setCompleting] = useState<CrmTaskRecord | null>(null);
  const [followUpFor, setFollowUpFor] = useState<CrmTaskRecord | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["crm-tasks"] });

  const update = useMutation({
    mutationFn: (input: { id: string; body: Record<string, unknown> }) =>
      updateCrmTask(input.id, input.body),
    onSuccess: (result) => {
      refresh();
      setCompleting(null);
      if (result.recurredTask) {
        toast({
          title: "Task completed",
          description: "The next one is booked in.",
        });
      } else if (result.suggestsFollowUp) {
        // The outcome says the conversation isn't over, so offer the next step
        // while the context is still in front of the person.
        const source = tasks.find((task) => task.id === result.id) ?? null;
        setFollowUpFor(source);
      } else {
        toast({ title: "Task completed" });
      }
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCrmTask(id),
    onSuccess: () => {
      toast({ title: "Task deleted" });
      refresh();
    },
    onError: (error) => toast({ title: getApiErrorMessage(error), variant: "destructive" }),
  });

  const toggle = (task: CrmTaskRecord) => {
    if (task.status === "COMPLETED") {
      update.mutate({ id: task.id, body: { status: "OPEN", outcome: null } });
      return;
    }
    if (requiresOutcome(task.type)) {
      setCompleting(task);
      return;
    }
    update.mutate({ id: task.id, body: { status: "COMPLETED" } });
  };

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading tasks…</p>;
  }

  if (!tasks.length) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <>
      <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
        {tasks.map((task) => {
          const overdue = isTaskOverdue(task);
          const record = showRecord ? taskRecordRef(task) : null;
          const recordLabel =
            task.deal?.title ??
            task.lead?.title ??
            task.client?.name ??
            task.person?.fullName ??
            null;

          return (
            <li key={task.id} className="flex items-start gap-3 p-3">
              <Checkbox
                className="mt-0.5"
                checked={task.status === "COMPLETED"}
                onCheckedChange={() => toggle(task)}
                aria-label={`Complete ${task.title}`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      task.status === "COMPLETED" ? "text-[var(--text-muted)] line-through" : "",
                    )}
                  >
                    {task.title}
                  </span>
                  <Badge tone="neutral" size="sm">
                    {CRM_TASK_TYPE_LABELS[task.type]}
                  </Badge>
                  {task.recurrence !== "NONE" ? (
                    <Repeat
                      className="size-3.5 text-[var(--text-muted)]"
                      aria-label="Repeating task"
                    />
                  ) : null}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      overdue ? "text-[var(--status-danger-fg)]" : "",
                    )}
                  >
                    <Clock className="size-3.5" />
                    <ClientDate value={task.dueAt} mode={task.hasDueTime ? "datetime" : "date"} />
                  </span>
                  {task.priority !== "NORMAL" ? (
                    <span className={PRIORITY_TONE[task.priority]}>{task.priority}</span>
                  ) : null}
                  {task.assignedTo ? <span>{task.assignedTo.name}</span> : <span>Unassigned</span>}
                  {record && recordLabel ? (
                    <Link href={record.href} className="hover:underline">
                      {recordLabel}
                    </Link>
                  ) : null}
                  {task.outcome ? (
                    <span className="font-medium text-[var(--text-primary)]">
                      {CRM_TASK_OUTCOME_LABELS[task.outcome]}
                    </span>
                  ) : null}
                </div>

                {task.outcomeNotes ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{task.outcomeNotes}</p>
                ) : null}
              </div>

              {task.assignedToId === currentUserId || !task.assignedToId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${task.title}`}
                  onClick={() => remove.mutate(task.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <CompleteTaskDialog
        task={completing}
        isPending={update.isPending}
        onOpenChange={(open) => !open && setCompleting(null)}
        onConfirm={(input) =>
          completing &&
          update.mutate({
            id: completing.id,
            body: { status: "COMPLETED", ...input },
          })
        }
      />

      <TaskFormSheet
        open={Boolean(followUpFor)}
        onOpenChange={(open) => !open && setFollowUpFor(null)}
        currentUserId={currentUserId}
        record={
          followUpFor
            ? {
                leadId: followUpFor.leadId ?? undefined,
                dealId: followUpFor.dealId ?? undefined,
                clientId: followUpFor.clientId ?? undefined,
                personId: followUpFor.personId ?? undefined,
                siteId: followUpFor.siteId ?? undefined,
              }
            : undefined
        }
        seed={followUpFor ? { title: followUpFor.title, type: followUpFor.type } : undefined}
        onCreated={() => setFollowUpFor(null)}
      />
    </>
  );
}
