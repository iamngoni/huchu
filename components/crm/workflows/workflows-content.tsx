"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, EmptyState, Switch, Stack } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeAgo } from "@/components/ui/time-ago";
import { PageChrome } from "@/components/layout/page-chrome";
import { ViewToolbar } from "@/components/crm/records/view-toolbar";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  type AutomationAction,
  type AutomationCondition,
  type AUTOMATION_TRIGGERS,
} from "@/lib/crm/automation";
import { DotsThree, Plus } from "@/lib/icons";

type WorkflowRow = {
  id: string;
  name: string;
  trigger: (typeof AUTOMATION_TRIGGERS)[number];
  triggerConfig: { stage?: string; idleDays?: number; entity?: "LEAD" | "DEAL" } | null;
  conditions: AutomationCondition[] | null;
  actions: AutomationAction[];
  isEnabled: boolean;
  runCount: number;
  createdAt: string;
  lastRunAt: string | null;
  runs: { id: string; status: string; createdAt: string }[];
};

/**
 * Every workflow, each one legible without opening it.
 *
 * These lived in a settings tab, which said they were configuration you set
 * once. They are not: a workflow is a thing you write, watch, and turn off
 * when it starts doing something you did not mean. That belongs at the root of
 * the sidebar next to the work it acts on, not three clicks into a settings
 * screen.
 */
export function WorkflowsContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "live" | "paused" | "failing">("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-workflows"],
    queryFn: () => fetchJson<{ data: WorkflowRow[] }>("/api/v2/crm/automations"),
  });

  const workflows = useMemo(() => data?.data ?? [], [data]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["crm-workflows"] });

  const toggle = useMutation({
    mutationFn: (input: { id: string; isEnabled: boolean }) =>
      fetchJson(`/api/v2/crm/automations/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled: input.isEnabled }),
      }),
    onSuccess: refresh,
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/v2/crm/automations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Workflow deleted" });
      refresh();
    },
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: "destructive" }),
  });

  function failedRuns(workflow: WorkflowRow): number {
    return workflow.runs.filter((run) => run.status !== "SUCCEEDED").length;
  }

  const visible = workflows.filter((workflow) => {
    if (filter === "live") return workflow.isEnabled;
    if (filter === "paused") return !workflow.isEnabled;
    if (filter === "failing") return failedRuns(workflow) > 0;
    return true;
  });

  const counts = {
    all: workflows.length,
    live: workflows.filter((workflow) => workflow.isEnabled).length,
    paused: workflows.filter((workflow) => !workflow.isEnabled).length,
    failing: workflows.filter((workflow) => failedRuns(workflow) > 0).length,
  };

  return (
    <div className="max-w-3xl space-y-4">
      <PageChrome title="Workflows">
        <Button type="button" asChild>
          <Link href="/crm/workflows/new">
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            New workflow
          </Link>
        </Button>
      </PageChrome>

      <ViewToolbar
        start={
          <>
            {(["all", "live", "paused", "failing"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                className="h-9 gap-2"
                variant={filter === value ? "secondary" : "ghost"}
                onClick={() => setFilter(value)}
              >
                {value === "all"
                  ? "All"
                  : value === "live"
                    ? "Live"
                    : value === "paused"
                      ? "Paused"
                      : "Needs a look"}
                <span className="text-[var(--text-muted)]">{counts[value]}</span>
              </Button>
            ))}
          </>
        }
      />

      {error ? (
        <Alert tone="danger" title="Couldn't load workflows">
          {getApiErrorMessage(error)}
        </Alert>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : workflows.length === 0 ? (
        <EmptyState
          title="No workflows yet"
          body="A good first one: when a lead comes in worth more than your average job, create a call task for today."
        />
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-muted)]">
          Nothing in this group.
        </p>
      ) : (
        // One row per workflow: name, when it was written, how often it has
        // run, and the switch. What each one *does* is the detail page's job —
        // a sequence strip per row made the list a wall of diagrams.
        <Stack as="ul" gap="xs">
          {visible.map((workflow) => {
            const failed = failedRuns(workflow);

            return (
              <li
                key={workflow.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 transition-colors hover:bg-[var(--surface-subtle)]"
              >
                <Link
                  href={`/crm/workflows/${workflow.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--text)]"
                >
                  {workflow.name}
                </Link>

                <span className="hidden flex-none text-sm text-[var(--text-muted)] sm:inline">
                  <TimeAgo value={workflow.createdAt} />
                </span>

                <span
                  className={
                    failed > 0
                      ? "flex-none text-sm font-medium text-[var(--status-error-text)]"
                      : "flex-none text-sm text-[var(--text-muted)]"
                  }
                >
                  <span className="font-mono tabular-nums">{workflow.runCount}</span>
                  {failed > 0 ? ` · ${failed} failed` : " runs"}
                </span>

                <Switch
                  checked={workflow.isEnabled}
                  onChange={() =>
                    toggle.mutate({ id: workflow.id, isEnabled: !workflow.isEnabled })
                  }
                  aria-label={`${workflow.name} is live`}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton size="sm" aria-label={`Options for ${workflow.name}`}>
                      <DotsThree />
                    </IconButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/crm/workflows/${workflow.id}`}>Open</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-[var(--status-error-text)]"
                      onClick={() => remove.mutate(workflow.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </Stack>
      )}
    </div>
  );
}
