"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "@/lib/icons";

import { EntityLink } from "./entity-link";
import { RecordPicker, type PickableType, type PickedRecord } from "./record-picker";

/**
 * A property that points at another record, and can be repointed.
 *
 * The list-shaped relationships — people on a deal, people at a company —
 * have their own tabs. This is the other kind: the single link a record
 * carries as a property, like the company a site belongs to or the person to
 * ring before turning up. Those were drawn as links and nothing else, so the
 * only way to correct one was to have got it right at creation.
 *
 * Reads as the link it is until you press it, because the common case is
 * following the reference, not changing it.
 */
export function RelationAttribute({
  value,
  href,
  types,
  placeholder = "Not set",
  searchPlaceholder,
  onPick,
  onClear,
}: {
  /** The current record's label, or null when nothing is linked. */
  value: string | null;
  href: string | null;
  types: readonly PickableType[];
  placeholder?: string;
  searchPlaceholder?: string;
  onPick: (record: PickedRecord) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PickedRecord | null>(null);

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {value ? (
        <EntityLink href={href} className="min-w-0 truncate text-sm">
          {value}
        </EntityLink>
      ) : (
        <span className="text-sm text-[var(--text-muted)]">{placeholder}</span>
      )}

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setDraft(null);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-sm text-[var(--text-muted)]"
          >
            {value ? "Change" : "Set"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-2 p-2">
          <RecordPicker
            value={draft}
            onChange={(next) => {
              setDraft(next);
              if (next) {
                onPick(next);
                setOpen(false);
                setDraft(null);
              }
            }}
            types={types}
            placeholder={searchPlaceholder ?? "Search records"}
          />
          {value && onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-1.5 text-[var(--text-muted)]"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              <X className="size-3.5" />
              Clear it
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    </span>
  );
}
