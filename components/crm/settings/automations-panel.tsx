"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, Button, EmptyState } from "@corelithzw/react";
import { ClientDate } from "@/components/ui/client-date";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FormShell } from "@/components/shared/form-shell";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  ACTION_LABELS,
  ACTION_TYPES,
  AUTOMATION_TRIGGERS,
  CONDITION_OPERATORS,
  OPERATOR_LABELS,
  TRIGGER_LABELS,
  describeAutomation,
  type ActionType,
  type AutomationAction,
  type AutomationCondition,
} from "@/lib/crm/automation";
import { Plus, Trash2 } from "@/lib/icons";

type AutomationRecord = {
  id: string;
  name: string;
  description: string | null;
  trigger: (typeof AUTOMATION_TRIGGERS)[number];
  triggerConfig: { stage?: string; idleDays?: number; entity?: "LEAD" | "DEAL" } | null;
  conditions: AutomationCondition[] | null;
  actions: AutomationAction[];
  isEnabled: boolean;
  runCount: number;
  lastRunAt: string | null;
  runs: { id: string; status: string; createdAt: string }[];
};

function defaultAction(type: ActionType): AutomationAction {
  switch (type) {
    case "CREATE_TASK":
      return { type: "CREATE_TASK", title: "Follow up", dueInDays: 1 };
    case "ASSIGN_OWNER":
      return { type: "ASSIGN_OWNER", assignedToId: null };
    case "NOTIFY":
      return { type: "NOTIFY", recipientIds: [], message: "Take a look at this" };
    case "ADD_TAG":
      return { type: "ADD_TAG", tag: "" };
    case "SET_FIELD":
      return { type: "SET_FIELD", field: "probability", value: 50 };
  }
}

export function AutomationsPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-automations"],
    queryFn: () => fetchJson<{ data: { data: AutomationRecord[] } }>("/api/v2/crm/automations"),
  });

  const rules = data?.data.data ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["crm-automations"] });

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
    mutationFn: (id: string) =>
      fetchJson(`/api/v2/crm/automations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Rule deleted" });
      refresh();
    },
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Rules</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Small rules that do the obvious thing. Each one is written out as a
            sentence, because a rule nobody can read is a rule nobody dares
            change.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          startIcon={<Plus className="size-4" />}
          onClick={() => setCreating(true)}
        >
          New rule
        </Button>
      </div>

      {error ? (
        <Alert tone="danger" title="Couldn't load rules">
          {getApiErrorMessage(error)}
        </Alert>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : rules.length === 0 ? (
        <EmptyState
          title="No rules yet"
          body="A good first one: when a lead comes in worth more than your average job, create a call task for today."
        />
      ) : (
        <ul className="space-y-2">
          {rules.map((rule) => {
            const failed = rule.runs.filter((run) => run.status !== "SUCCEEDED").length;
            return (
              <li
                key={rule.id}
                className="space-y-2 rounded-[var(--card-radius)] border border-[var(--border)] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {describeAutomation({
                        trigger: rule.trigger,
                        triggerConfig: rule.triggerConfig,
                        conditions: rule.conditions,
                        actions: rule.actions,
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={rule.isEnabled}
                        onCheckedChange={() =>
                          toggle.mutate({ id: rule.id, isEnabled: !rule.isEnabled })
                        }
                        aria-label={`Enable ${rule.name}`}
                      />
                      <span className="text-[var(--text-muted)]">
                        {rule.isEnabled ? "On" : "Off"}
                      </span>
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${rule.name}`}
                      onClick={() => remove.mutate(rule.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                  <span>
                    Fired {rule.runCount} time{rule.runCount === 1 ? "" : "s"}
                  </span>
                  {rule.lastRunAt ? (
                    <span>
                      Last <ClientDate value={rule.lastRunAt} mode="datetime" />
                    </span>
                  ) : null}
                  {failed > 0 ? (
                    // A rule that is quietly failing shows up next to the rule
                    // rather than in a log nobody opens.
                    <span className="font-medium text-[var(--status-error-text)]">
                      {failed} of the last {rule.runs.length} runs had a problem
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AutomationFormSheet open={creating} onOpenChange={setCreating} onCreated={refresh} />
    </div>
  );
}

function AutomationFormSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [trigger, setTrigger] =
    useState<(typeof AUTOMATION_TRIGGERS)[number]>("LEAD_CREATED");
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([defaultAction("CREATE_TASK")]);
  const [errors, setErrors] = useState<string[]>([]);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setTrigger("LEAD_CREATED");
      setConditions([]);
      setActions([defaultAction("CREATE_TASK")]);
      setErrors([]);
    }
  }

  const create = useMutation({
    mutationFn: () =>
      fetchJson("/api/v2/crm/automations", {
        method: "POST",
        body: JSON.stringify({ name, trigger, conditions, actions, isEnabled: true }),
      }),
    onSuccess: () => {
      toast({ title: "Rule created" });
      onCreated();
      onOpenChange(false);
    },
    onError: (err) => setErrors([getApiErrorMessage(err)]),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New rule</SheetTitle>
          <SheetDescription>
            When something happens, check a few things, then do something about
            it.
          </SheetDescription>
        </SheetHeader>

        <FormShell
          variant="bare"
          errors={errors}
          requiredHint="A name, a trigger and at least one action are required."
          onSubmit={(event) => {
            event.preventDefault();
            const found: string[] = [];
            if (!name.trim()) found.push("Give the rule a name");
            if (actions.length === 0) found.push("Add at least one action");
            if (actions.some((action) => action.type === "ADD_TAG" && !action.tag.trim())) {
              found.push("A tag action needs a tag");
            }
            setErrors(found);
            if (found.length === 0) create.mutate();
          }}
          actions={
            <>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create rule"}
              </Button>
            </>
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="rule-name">Name *</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Chase big new leads the same day"
            />
          </div>

          <div className="space-y-1.5">
            <Label>When</Label>
            <Select
              value={trigger}
              onValueChange={(value) =>
                setTrigger(value as (typeof AUTOMATION_TRIGGERS)[number])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTOMATION_TRIGGERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TRIGGER_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>And these are true</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConditions((previous) => [
                    ...previous,
                    { field: "estimatedValue", operator: "greater_than", value: "" },
                  ])
                }
              >
                Add condition
              </Button>
            </div>

            {conditions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                No conditions — the rule fires every time.
              </p>
            ) : (
              conditions.map((condition, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    className="flex-1"
                    value={condition.field}
                    placeholder="field"
                    onChange={(event) =>
                      setConditions((previous) =>
                        previous.map((item, position) =>
                          position === index ? { ...item, field: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Select
                    value={condition.operator}
                    onValueChange={(value) =>
                      setConditions((previous) =>
                        previous.map((item, position) =>
                          position === index
                            ? { ...item, operator: value as AutomationCondition["operator"] }
                            : item,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPERATORS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {OPERATOR_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    value={String(condition.value ?? "")}
                    placeholder="value"
                    onChange={(event) =>
                      setConditions((previous) =>
                        previous.map((item, position) =>
                          position === index ? { ...item, value: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove condition"
                    onClick={() =>
                      setConditions((previous) =>
                        previous.filter((_item, position) => position !== index),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Then</Label>
              <Select
                value=""
                onValueChange={(value) =>
                  setActions((previous) => [...previous, defaultAction(value as ActionType)])
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Add action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ACTION_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {actions.map((action, index) => (
              <div
                key={index}
                className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{ACTION_LABELS[action.type]}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove action"
                    onClick={() =>
                      setActions((previous) =>
                        previous.filter((_item, position) => position !== index),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {action.type === "CREATE_TASK" ? (
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      value={action.title}
                      placeholder="Task title"
                      onChange={(event) =>
                        setActions((previous) =>
                          previous.map((item, position) =>
                            position === index && item.type === "CREATE_TASK"
                              ? { ...item, title: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <Input
                      className="w-28"
                      type="number"
                      min={0}
                      value={action.dueInDays}
                      onChange={(event) =>
                        setActions((previous) =>
                          previous.map((item, position) =>
                            position === index && item.type === "CREATE_TASK"
                              ? { ...item, dueInDays: Number(event.target.value) || 0 }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                ) : null}

                {action.type === "ADD_TAG" ? (
                  <Input
                    value={action.tag}
                    placeholder="Tag"
                    onChange={(event) =>
                      setActions((previous) =>
                        previous.map((item, position) =>
                          position === index && item.type === "ADD_TAG"
                            ? { ...item, tag: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                ) : null}

                {action.type === "NOTIFY" ? (
                  <Input
                    value={action.message}
                    placeholder="What the notification says"
                    onChange={(event) =>
                      setActions((previous) =>
                        previous.map((item, position) =>
                          position === index && item.type === "NOTIFY"
                            ? { ...item, message: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                ) : null}

                {action.type === "SET_FIELD" ? (
                  <div className="flex gap-2">
                    <Input
                      className="flex-1"
                      value={action.field}
                      placeholder="Field"
                      onChange={(event) =>
                        setActions((previous) =>
                          previous.map((item, position) =>
                            position === index && item.type === "SET_FIELD"
                              ? { ...item, field: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <Input
                      className="flex-1"
                      value={String(action.value ?? "")}
                      placeholder="Value"
                      onChange={(event) =>
                        setActions((previous) =>
                          previous.map((item, position) =>
                            position === index && item.type === "SET_FIELD"
                              ? { ...item, value: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                ) : null}

                {action.type === "ASSIGN_OWNER" ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Assigns by the usual rule — whoever has the fewest open
                    leads.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </FormShell>
      </SheetContent>
    </Sheet>
  );
}
