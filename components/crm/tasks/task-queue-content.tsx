"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getApiErrorMessage } from "@/lib/api-client";
import { fetchCrmTasks } from "@/lib/crm/crm-v2";
import { TASK_QUEUE_LABELS, type TaskQueue } from "@/lib/crm/tasks";
import { Plus } from "@/lib/icons";
import { cn } from "@/lib/utils";

import { TaskFormSheet } from "./task-form-sheet";
import { TaskList } from "./task-list";

const QUEUES: TaskQueue[] = [
  "TODAY",
  "OVERDUE",
  "UPCOMING",
  "MINE",
  "UNASSIGNED",
  "TEAM",
  "COMPLETED",
];

const EMPTY_MESSAGES: Partial<Record<TaskQueue, string>> = {
  TODAY: "Nothing due today. Enjoy it.",
  OVERDUE: "Nothing overdue.",
  UPCOMING: "Nothing booked in yet.",
  MINE: "You have no open tasks.",
  UNASSIGNED: "Every task has an owner.",
  TEAM: "No open tasks across the team.",
  COMPLETED: "Nothing completed yet.",
};

export function TaskQueueContent() {
  const { data: session } = useSession();
  const [queue, setQueue] = useState<TaskQueue>("TODAY");
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-tasks", queue],
    queryFn: () => fetchCrmTasks({ queue, limit: 100 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
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
              {TASK_QUEUE_LABELS[value]}
            </button>
          ))}
        </div>

        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New task
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load tasks</AlertTitle>
          <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      <TaskList
        tasks={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage={EMPTY_MESSAGES[queue]}
        currentUserId={session?.user?.id}
      />

      <TaskFormSheet
        open={creating}
        onOpenChange={setCreating}
        currentUserId={session?.user?.id}
      />
    </div>
  );
}
