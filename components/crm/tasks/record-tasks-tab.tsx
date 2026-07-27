"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { fetchCrmTasks, type CrmTaskRecordRef } from "@/lib/crm/crm-v2";
import { Plus } from "@/lib/icons";

import { TaskFormSheet } from "./task-form-sheet";
import { TaskList } from "./task-list";

/**
 * The Tasks tab on a record page. Same list as the queue page, filtered to
 * this record and with the record already filled in on the create form.
 */
export function RecordTasksTab({
  record,
  currentUserId,
}: {
  record: CrmTaskRecordRef;
  currentUserId?: string;
}) {
  const [creating, setCreating] = useState(false);
  const key = ["crm-tasks", "record", record];

  const { data, isLoading } = useQuery({
    queryKey: key,
    // A record's tab shows everything filed against it, done or not — who it
    // is assigned to is the tab's content, not its filter.
    queryFn: () => fetchCrmTasks({ ...record, queue: "ALL", limit: 100 }),
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New task
        </Button>
      </div>

      <TaskList
        tasks={data?.data ?? []}
        isLoading={isLoading}
        showRecord={false}
        emptyMessage="No tasks on this record yet."
        currentUserId={currentUserId}
      />

      <TaskFormSheet
        open={creating}
        onOpenChange={setCreating}
        record={record}
        currentUserId={currentUserId}
      />
    </div>
  );
}
