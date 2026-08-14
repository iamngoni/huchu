"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, ChevronRight, type LucideIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * A record's properties, above its tabs, the way Notion does them.
 *
 * The facts that identify a record — who owns it, what it is worth, when it
 * closes — were living in the right rail, which is where a reader looks last
 * and a phone does not look at all. Notion's answer is right: properties
 * belong at the top of the page, in a list you read on the way in, because
 * that is the only place they get maintained.
 *
 * Editable rows write through immediately rather than into a form with a save
 * button. A property somebody changed and forgot to save is worse than one
 * they never changed, and the record page has no save button for anything
 * else either.
 */

export type RecordAttributeOption = {
  value: string;
  label: string;
  /** A dot or avatar shown beside the label in the list. */
  leading?: ReactNode;
};

export type RecordAttribute = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /**
   * For a value the page renders itself — a link, a chip, an avatar. A row
   * that *only* has this is read-only; pair it with `options` or `onCommit`
   * and it becomes the closed state of an editor instead.
   */
  display?: ReactNode;
  /** For a plain value somebody can retype in place. */
  value?: string | null;
  /**
   * What the closed row reads as, when the stored value is not what a reader
   * wants to see: "USD 9,800" over a bare `9800`. Editing still opens on
   * `value`, so what you type is what gets stored.
   */
  formatted?: string | null;
  onCommit?: (value: string) => void;
  /**
   * The row is a choice rather than free text: an owner, a status, a stage,
   * anything whose value has to be one of a known set. `onCommit` receives the
   * chosen option's `value`, or an empty string when it is cleared.
   */
  options?: RecordAttributeOption[];
  /** What clearing means, when the row is allowed to be empty. */
  clearLabel?: string;
  placeholder?: string;
  mono?: boolean;
};

/**
 * A property whose value is one of a known set — an owner, a status, a stage.
 *
 * The whole value is the trigger, which is the Notion behaviour: you press
 * what you are looking at, not a "Change" button parked beside it. A row that
 * needs a separate verb to edit it is a row people stop editing.
 */
function ChoiceValue({ attribute }: { attribute: RecordAttribute }) {
  const [open, setOpen] = useState(false);
  const options = attribute.options ?? [];
  const current = options.find((option) => option.value === (attribute.value ?? ""));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "-mx-1.5 flex w-full min-w-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-left text-sm hover:bg-[var(--surface-subtle)]",
            !current && "text-[var(--text-muted)]",
          )}
        >
          {attribute.display ?? (
            <span className="min-w-0 truncate">
              {current?.label ?? attribute.placeholder ?? "Empty"}
            </span>
          )}
        </button>
      </PopoverTrigger>
      {/* The trigger sits in the right-hand column of the property list, so a
          fixed 240px panel aligned to its start runs off a 390px screen.
          Bounded by the viewport, and told to keep clear of the edges. */}
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[min(15rem,calc(100vw-2rem))] p-1"
      >
        <div className="max-h-72 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                attribute.onCommit?.(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex min-h-9 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-sm hover:bg-[var(--surface-hover)]",
                option.value === attribute.value && "font-medium",
              )}
            >
              {option.leading}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === attribute.value ? (
                <Check className="size-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
              ) : null}
            </button>
          ))}
          {attribute.clearLabel && attribute.value ? (
            <button
              type="button"
              onClick={() => {
                attribute.onCommit?.("");
                setOpen(false);
              }}
              className="flex min-h-9 w-full items-center rounded-[var(--radius-sm)] px-2 text-left text-sm text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            >
              {attribute.clearLabel}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EditableValue({ attribute }: { attribute: RecordAttribute }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = attribute.formatted ?? attribute.value;

  if (!attribute.onCommit) {
    return (
      <span
        className={cn(
          "text-sm",
          attribute.mono && "font-mono",
          !attribute.value && "text-[var(--text-muted)]",
        )}
      >
        {shown || attribute.placeholder || "—"}
      </span>
    );
  }

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(attribute.value ?? "")}
        className={cn(
          "-mx-1.5 w-full rounded-[var(--radius-sm)] px-1.5 py-0.5 text-left text-sm hover:bg-[var(--surface-subtle)]",
          attribute.mono && "font-mono",
          !attribute.value && "text-[var(--text-muted)]",
        )}
      >
        {shown || attribute.placeholder || "Empty"}
      </button>
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      aria-label={attribute.label}
      className="h-7"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== (attribute.value ?? "")) attribute.onCommit?.(draft);
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          if (draft !== (attribute.value ?? "")) attribute.onCommit?.(draft);
          setDraft(null);
        }
        if (event.key === "Escape") setDraft(null);
      }}
    />
  );
}

export function RecordAttributes({
  attributes,
  /** How many to show before the list collapses. */
  visibleCount = 5,
  className,
}: {
  attributes: RecordAttribute[];
  visibleCount?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (attributes.length === 0) return null;

  const shown = expanded ? attributes : attributes.slice(0, visibleCount);
  const hidden = attributes.length - shown.length;

  return (
    <div className={cn("space-y-0.5", className)}>
      <dl className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
        {shown.map((attribute) => {
          const Icon = attribute.icon;
          return (
            <div key={attribute.id} className="flex items-center gap-3 py-0.5">
              <dt className="flex w-36 shrink-0 items-center gap-1.5 text-sm text-[var(--text-muted)]">
                {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
                <span className="truncate">{attribute.label}</span>
              </dt>
              <dd className="min-w-0 flex-1">
                {/* Which editor a row gets is decided here, from the shape of
                    the attribute: a known set of values is a choice, a commit
                    handler is free text, and anything else is a value the page
                    drew itself and nobody can edit in place. */}
                {attribute.options && attribute.onCommit ? (
                  <ChoiceValue attribute={attribute} />
                ) : (
                  (attribute.display ?? <EditableValue attribute={attribute} />)
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {hidden > 0 || expanded ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-[var(--text-muted)]"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? (
            <>
              <ChevronDown className="mr-1.5 size-4" aria-hidden="true" />
              Show less
            </>
          ) : (
            <>
              <ChevronRight className="mr-1.5 size-4" aria-hidden="true" />
              {hidden} more propert{hidden === 1 ? "y" : "ies"}
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}
