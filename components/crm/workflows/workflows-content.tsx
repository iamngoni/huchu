"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, EmptyState, Switch } from "@corelithzw/react";
import { Button } from "@/components/ui/button";
import { ClientDate } from "@/components/ui/client-date";
import { Skeleton } from "@/components/ui/skeleton";
import { PageChrome } from "@/components/layout/page-chrome";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  ACTION_LABELS,
  TRIGGER_LABELS,
  type AutomationAction,
  type AutomationCondition,
  type AUTOMATION_TRIGGERS,
} from "@/lib/crm/automation";
import { Funnel, Plus, Rule, Trash2 } from "@/lib/icons";

import { SequenceStrip } from "./sequence-canvas";
import { ACTION_ICON, TRIGGER_ICON } from "./workflow-marks";

type WorkflowRow = {
  id: string;
  name: string;
  trigger: (typeof AUTOMATION_TRIGGERS)[number];
  triggerConfig: { stage?: string; idleDays?: number; entity?: "LEAD" | "DEAL" } | null;
  conditions: AutomationCondition[] | null;
  actions: AutomationAction[];
  isEnabled: boolean;
  runCount: number;
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
    <div className="space-y-5">
      <PageChrome title="Workflows">
        <Button type="button" asChild>
          <Link href="/crm/workflows/new">
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            New workflow
          </Link>
        </Button>
      </PageChrome>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "live", "paused", "failing"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
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
            <span className="ml-1.5 text-[var(--text-muted)]">{counts[value]}</span>
          </Button>
        ))}
      </div>

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
        <ul className="space-y-1">
          {visible.map((workflow) => {
            const failed = failedRuns(workflow);
            const steps = [
              {
                label: TRIGGER_LABELS[workflow.trigger],
                tone: "trigger" as const,
                icon: TRIGGER_ICON[workflow.trigger] ?? Rule,
              },
              ...(workflow.conditions ?? []).map((condition) => ({
                label: condition.field,
                tone: "filter" as const,
                icon: Funnel,
              })),
              ...workflow.actions.map((action) => ({
                label: ACTION_LABELS[action.type],
                tone: "action" as const,
                icon: ACTION_ICON[action.type],
              })),
            ];

            return (
              <li
                key={workflow.id}
                className="flex flex-col gap-3 rounded-[var(--radius-md)] px-3 py-3 transition-colors hover:bg-[var(--surface-subtle)] lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Link
                    href={`/crm/workflows/${workflow.id}`}
                    className="text-sm font-medium underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--text)]"
                  >
                    {workflow.name}
                  </Link>

                  <SequenceStrip steps={steps} />

                  <p className="text-sm text-[var(--text-muted)]">
                    Run {workflow.runCount} time{workflow.runCount === 1 ? "" : "s"}
                    {workflow.lastRunAt ? (
                      <>
                        {" · last "}
                        <ClientDate value={workflow.lastRunAt} mode="datetime" />
                      </>
                    ) : null}
                    {failed > 0 ? (
                      <span className="font-medium text-[var(--status-error-text)]">
                        {" · "}
                        {failed} of the last {workflow.runs.length} runs had a problem
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={workflow.isEnabled}
                      onChange={() =>
                        toggle.mutate({ id: workflow.id, isEnabled: !workflow.isEnabled })
                      }
                      aria-label={`${workflow.name} is live`}
                    />
                    <span className="text-[var(--text-muted)]">
                      {workflow.isEnabled ? "Live" : "Paused"}
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${workflow.name}`}
                    onClick={() => remove.mutate(workflow.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
