"use client";

import { useMemo, useState } from "react";
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
import { RecordDialog } from "@/components/crm/records/record-dialog";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import {
  ACTION_LABELS,
  ACTION_TYPES,
  AUTOMATION_TRIGGERS,
  OPERATOR_LABELS,
  TRIGGER_LABELS,
  describeAutomation,
  type ActionType,
  type AutomationAction,
  type AutomationCondition,
} from "@/lib/crm/automation";
import {
  LEAD_STAGE_OPTIONS,
  TASK_TYPE_OPTIONS,
  fieldsForTrigger,
  findField,
  operatorNeedsValue,
  operatorsForKind,
  triggerUsesIdle,
  triggerUsesStage,
  writableFieldsForTrigger,
  type AutomationField,
} from "@/lib/crm/automation-fields";
import { Plus, Trash2 } from "@/lib/icons";

type Owner = { id: string; name: string | null };

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
  const [editing, setEditing] = useState<AutomationRecord | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-automations"],
    queryFn: () => fetchJson<{ data: AutomationRecord[] }>("/api/v2/crm/automations"),
  });

  const rules = data?.data ?? [];
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
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditing(rule)}
                    >
                      Edit
                    </Button>
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

                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
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

      <AutomationFormSheet
        open={creating || editing !== null}
        rule={editing}
        onOpenChange={(next) => {
          if (!next) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSaved={refresh}
      />
    </div>
  );
}

/** A picker over a fixed list — the shape every typed option in here wants. */
function OptionSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * The value side of a condition, or of a "set a field" action.
 *
 * Which control this is depends entirely on the field that was picked: a
 * stage gets the stage list, an owner gets the team, a number gets a number
 * box. It used to be a text input for all of them, which is how you end up
 * with a rule testing `stage equals "Quoted"` that saves cleanly and never
 * matches a single record.
 */
function FieldValueInput({
  field,
  value,
  onChange,
  owners,
  className,
}: {
  field: AutomationField | undefined;
  value: string | number | boolean | null | undefined;
  onChange: (value: string | number) => void;
  owners: Owner[];
  className?: string;
}) {
  const asText = value === null || value === undefined ? "" : String(value);

  if (field?.kind === "enum" && field.options) {
    return (
      <OptionSelect
        className={className}
        value={asText}
        onValueChange={onChange}
        options={field.options}
        placeholder="Pick one"
        ariaLabel={`${field.label} value`}
      />
    );
  }

  if (field?.kind === "user") {
    return (
      <OptionSelect
        className={className}
        value={asText}
        onValueChange={onChange}
        options={owners.map((owner) => ({
          value: owner.id,
          label: owner.name ?? "Unnamed",
        }))}
        placeholder="Pick someone"
        ariaLabel={`${field.label} value`}
      />
    );
  }

  if (field?.kind === "number") {
    return (
      <Input
        className={className}
        type="number"
        value={asText}
        placeholder="0"
        aria-label={`${field.label} value`}
        // Kept as a number so the rule compares like with like — a numeric
        // field tested against the string "5000" is a rule that never fires.
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    );
  }

  if (field?.kind === "date") {
    return (
      <Input
        className={className}
        type="date"
        value={asText.slice(0, 10)}
        aria-label={`${field.label} value`}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      className={className}
      value={asText}
      placeholder="value"
      aria-label={field ? `${field.label} value` : "Value"}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function AutomationFormSheet({
  open,
  rule,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** Pass a rule to edit it. Omit to build a new one. */
  rule: AutomationRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = Boolean(rule);
  const [name, setName] = useState("");
  const [trigger, setTrigger] =
    useState<(typeof AUTOMATION_TRIGGERS)[number]>("LEAD_CREATED");
  const [stage, setStage] = useState("");
  const [idleDays, setIdleDays] = useState(7);
  const [idleEntity, setIdleEntity] = useState<"LEAD" | "DEAL">("LEAD");
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<AutomationAction[]>([defaultAction("CREATE_TASK")]);
  const [errors, setErrors] = useState<string[]>([]);

  const teamQuery = useQuery({
    queryKey: ["crm", "team"],
    queryFn: () => fetchJson<{ data: Owner[] }>("/api/v2/crm/team"),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const owners = useMemo(() => teamQuery.data?.data ?? [], [teamQuery.data]);

  const fields = useMemo(() => fieldsForTrigger(trigger), [trigger]);
  const writableFields = useMemo(() => writableFieldsForTrigger(trigger), [trigger]);

  // Seed as the sheet opens, adjusting state during render rather than in an
  // effect so there is no flash of the previous rule. Keyed on the rule's id
  // as well as `open`, so opening Edit on a different rule re-seeds.
  const seedKey = open ? (rule?.id ?? "__new") : null;
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    if (seedKey) {
      setName(rule?.name ?? "");
      setTrigger(rule?.trigger ?? "LEAD_CREATED");
      setStage(rule?.triggerConfig?.stage ?? "");
      setIdleDays(rule?.triggerConfig?.idleDays ?? 7);
      setIdleEntity(rule?.triggerConfig?.entity ?? "LEAD");
      setConditions(rule?.conditions ?? []);
      setActions(rule?.actions?.length ? rule.actions : [defaultAction("CREATE_TASK")]);
      setErrors([]);
    }
  }

  const save = useMutation({
    mutationFn: () =>
      fetchJson(isEdit ? `/api/v2/crm/automations/${rule?.id}` : "/api/v2/crm/automations", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify({
          name,
          trigger,
          // Only send the bits of trigger config this trigger actually uses;
          // a stray `stage` on a LEAD_CREATED rule reads as a condition that
          // was set and then ignored.
          triggerConfig: triggerUsesStage(trigger)
            ? { stage: stage || undefined }
            : triggerUsesIdle(trigger)
              ? { idleDays, entity: idleEntity }
              : {},
          conditions,
          actions,
          isEnabled: rule?.isEnabled ?? true,
        }),
      }),
    onSuccess: () => {
      toast({ title: isEdit ? "Rule saved" : "Rule created" });
      onSaved();
      onOpenChange(false);
    },
    onError: (err) => setErrors([getApiErrorMessage(err)]),
  });

  const patchCondition = (index: number, next: Partial<AutomationCondition>) =>
    setConditions((previous) =>
      previous.map((item, position) => (position === index ? { ...item, ...next } : item)),
    );

  const patchAction = (index: number, next: Record<string, unknown>) =>
    setActions((previous) =>
      previous.map((item, position) =>
        position === index ? ({ ...item, ...next } as AutomationAction) : item,
      ),
    );

  return (
    <RecordDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit rule" : "New rule"}
      description="When something happens, check a few things, then do something about it."
      size="xl"
      errors={errors}
      onSubmit={(event) => {
        event.preventDefault();
        const found: string[] = [];
        if (!name.trim()) found.push("Give the rule a name.");
        if (actions.length === 0) found.push("Add at least one action.");
        if (actions.some((action) => action.type === "ADD_TAG" && !action.tag.trim())) {
          found.push("A tag action needs a tag.");
        }
        if (
          actions.some((action) => action.type === "CREATE_TASK" && !action.title.trim())
        ) {
          found.push("A task action needs a title.");
        }
        if (actions.some((action) => action.type === "NOTIFY" && !action.message.trim())) {
          found.push("A notification needs something to say.");
        }
        if (actions.some((action) => action.type === "SET_FIELD" && !action.field)) {
          found.push("Pick the field to set.");
        }
        if (conditions.some((condition) => !condition.field)) {
          found.push("Every condition needs a field.");
        }
        setErrors(found);
        if (found.length === 0) save.mutate();
      }}
      footer={<>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create rule"}
        </Button>
      </>}
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
        <OptionSelect
          value={trigger}
          onValueChange={(value) => {
            setTrigger(value as (typeof AUTOMATION_TRIGGERS)[number]);
            // The fields a condition can name depend on which record the
            // trigger hands over, so conditions written against the old
            // one would silently stop matching. Clearing is honest.
            setConditions([]);
          }}
          options={AUTOMATION_TRIGGERS.map((value) => ({
            value,
            label: TRIGGER_LABELS[value],
          }))}
          ariaLabel="Trigger"
        />
      </div>

      {triggerUsesStage(trigger) ? (
        <div className="space-y-1.5">
          <Label>Only when it lands on</Label>
          <OptionSelect
            value={stage}
            onValueChange={setStage}
            options={[{ value: "", label: "Any stage" }, ...LEAD_STAGE_OPTIONS]}
            placeholder="Any stage"
            ariaLabel="Landing stage"
          />
        </div>
      ) : null}

      {triggerUsesIdle(trigger) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rule-idle-days">Days of silence</Label>
            <Input
              id="rule-idle-days"
              type="number"
              min={1}
              value={idleDays}
              onChange={(event) => setIdleDays(Number(event.target.value) || 1)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>On</Label>
            <OptionSelect
              value={idleEntity}
              onValueChange={(value) => setIdleEntity(value as "LEAD" | "DEAL")}
              options={[
                { value: "LEAD", label: "Leads" },
                { value: "DEAL", label: "Deals" },
              ]}
              ariaLabel="Record type"
            />
          </div>
        </div>
      ) : null}

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
                { field: fields[0]?.path ?? "", operator: "equals", value: "" },
              ])
            }
          >
            Add condition
          </Button>
        </div>

        {conditions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No conditions — the rule fires every time.
          </p>
        ) : (
          conditions.map((condition, index) => {
            const field = findField(trigger, condition.field);
            const operators = operatorsForKind(field?.kind ?? "text");
            return (
              <div key={index} className="flex flex-wrap gap-2">
                <OptionSelect
                  className="min-w-40 flex-1"
                  value={condition.field}
                  onValueChange={(value) => {
                    const next = findField(trigger, value);
                    // Widened to string: each kind returns its own narrow
                    // tuple, so `includes` refuses an operator from a
                    // different kind — which is exactly the case being
                    // tested for.
                    const allowed: readonly string[] = operatorsForKind(
                      next?.kind ?? "text",
                    );
                    patchCondition(index, {
                      field: value,
                      // Changing the field can invalidate the operator —
                      // "contains" on a number is a rule that never fires.
                      operator: allowed.includes(condition.operator)
                        ? condition.operator
                        : (allowed[0] as AutomationCondition["operator"]),
                      value: "",
                    });
                  }}
                  options={fields.map((option) => ({
                    value: option.path,
                    label: option.label,
                  }))}
                  placeholder="Field"
                  ariaLabel="Condition field"
                />

                <OptionSelect
                  className="w-36"
                  value={condition.operator}
                  onValueChange={(value) =>
                    patchCondition(index, {
                      operator: value as AutomationCondition["operator"],
                    })
                  }
                  options={operators.map((value) => ({
                    value,
                    label: OPERATOR_LABELS[value],
                  }))}
                  ariaLabel="Condition operator"
                />

                {operatorNeedsValue(condition.operator) ? (
                  <FieldValueInput
                    className="min-w-32 flex-1"
                    field={field}
                    value={condition.value}
                    owners={owners}
                    onChange={(value) => patchCondition(index, { value })}
                  />
                ) : null}

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
            );
          })
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Then</Label>
          <OptionSelect
            className="w-40"
            value=""
            onValueChange={(value) =>
              setActions((previous) => [...previous, defaultAction(value as ActionType)])
            }
            options={ACTION_TYPES.map((value) => ({
              value,
              label: ACTION_LABELS[value],
            }))}
            placeholder="Add action"
            ariaLabel="Add action"
          />
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
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    value={action.title}
                    placeholder="Task title"
                    aria-label="Task title"
                    onChange={(event) => patchAction(index, { title: event.target.value })}
                  />
                  <Input
                    className="w-28"
                    type="number"
                    min={0}
                    value={action.dueInDays}
                    aria-label="Days from now"
                    onChange={(event) =>
                      patchAction(index, { dueInDays: Number(event.target.value) || 0 })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <OptionSelect
                    className="flex-1"
                    value={action.taskType ?? "GENERAL"}
                    onValueChange={(value) => patchAction(index, { taskType: value })}
                    options={TASK_TYPE_OPTIONS}
                    ariaLabel="Task type"
                  />
                  <OptionSelect
                    className="flex-1"
                    value={action.assignedToId ?? ""}
                    onValueChange={(value) =>
                      patchAction(index, { assignedToId: value || null })
                    }
                    options={[
                      { value: "", label: "Whoever owns the record" },
                      ...owners.map((owner) => ({
                        value: owner.id,
                        label: owner.name ?? "Unnamed",
                      })),
                    ]}
                    ariaLabel="Task assignee"
                  />
                </div>
              </div>
            ) : null}

            {action.type === "ADD_TAG" ? (
              <Input
                value={action.tag}
                placeholder="Tag"
                aria-label="Tag"
                onChange={(event) => patchAction(index, { tag: event.target.value })}
              />
            ) : null}

            {action.type === "NOTIFY" ? (
              <div className="space-y-2">
                <Input
                  value={action.message}
                  placeholder="What the notification says"
                  aria-label="Notification message"
                  onChange={(event) => patchAction(index, { message: event.target.value })}
                />
                <OptionSelect
                  value={action.recipientIds[0] ?? ""}
                  onValueChange={(value) =>
                    patchAction(index, { recipientIds: value ? [value] : [] })
                  }
                  options={[
                    { value: "", label: "The record's owner" },
                    ...owners.map((owner) => ({
                      value: owner.id,
                      label: owner.name ?? "Unnamed",
                    })),
                  ]}
                  ariaLabel="Notify"
                />
              </div>
            ) : null}

            {action.type === "SET_FIELD" ? (
              <div className="flex gap-2">
                <OptionSelect
                  className="flex-1"
                  value={action.field}
                  onValueChange={(value) => patchAction(index, { field: value, value: "" })}
                  options={writableFields.map((option) => ({
                    value: option.path,
                    label: option.label,
                  }))}
                  placeholder="Field"
                  ariaLabel="Field to set"
                />
                <FieldValueInput
                  className="flex-1"
                  field={findField(trigger, action.field)}
                  value={action.value}
                  owners={owners}
                  onChange={(value) => patchAction(index, { value })}
                />
              </div>
            ) : null}

            {action.type === "ASSIGN_OWNER" ? (
              <OptionSelect
                value={action.assignedToId ?? ""}
                onValueChange={(value) =>
                  patchAction(index, { assignedToId: value || null })
                }
                options={[
                  { value: "", label: "Whoever the assignment rule picks" },
                  ...owners.map((owner) => ({
                    value: owner.id,
                    label: owner.name ?? "Unnamed",
                  })),
                ]}
                ariaLabel="Owner"
              />
            ) : null}
          </div>
        ))}
      </div>
    </RecordDialog>
  );
}
