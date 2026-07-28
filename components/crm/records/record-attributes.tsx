"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, type LucideIcon } from "@/lib/icons";
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

export type RecordAttribute = {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** For a value the page renders itself — a link, a chip, an avatar. */
  display?: ReactNode;
  /** For a plain value somebody can retype in place. */
  value?: string | null;
  onCommit?: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
};

function EditableValue({ attribute }: { attribute: RecordAttribute }) {
  const [draft, setDraft] = useState<string | null>(null);

  if (!attribute.onCommit) {
    return (
      <span
        className={cn(
          "text-sm",
          attribute.mono && "font-mono",
          !attribute.value && "text-[var(--text-muted)]",
        )}
      >
        {attribute.value || attribute.placeholder || "—"}
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
        {attribute.value || attribute.placeholder || "Empty"}
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
                {attribute.display ?? <EditableValue attribute={attribute} />}
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
