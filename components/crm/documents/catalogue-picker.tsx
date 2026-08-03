"use client";

import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { fetchJson } from "@/lib/api-client";
import { ClipboardList, Package, Search } from "@/lib/icons";
import { cn } from "@/lib/utils";

type PricedProduct = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  unit: string;
  isActive: boolean;
  line: {
    productId: string;
    code: string;
    description: string;
    unitPrice: number;
    taxRate: number;
    unit: string;
    priceSource: string;
  };
};

/** A measurement somebody took on site, offered as a line. */
export type VisitItemOption = {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number | null;
  /** Which visit it was measured on, so two surveys stay distinguishable. */
  visitLabel: string;
};

export type CataloguePick = {
  productId?: string;
  description: string;
  unitPrice: number | null;
  taxRate?: number;
  quantity?: number;
};

type Suggestion = {
  key: string;
  source: "catalogue" | "visit";
  title: string;
  detail: string;
  trailing: string | null;
  pick: CataloguePick;
};

/**
 * Picking what you sell, instead of retyping it — without taking away typing.
 *
 * Three ways to fill a line, because a real quote has all three on it: what
 * was measured on site, what we sell off the shelf, and the one-off thing
 * this customer asked for that nobody has ever sold before.
 *
 * The last one is the default. This field is a text box first and a search
 * second: anything typed stands, and the suggestions are an offer rather than
 * a gate. It was briefly the other way round — see the note on the anchor
 * below — and a builder that refuses free text sends people to Word.
 */
export function CataloguePicker({
  value,
  onChange,
  onPick,
  visitItems = [],
  placeholder = "Description, or search the catalogue",
  className,
  "aria-label": ariaLabel = "Description",
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (pick: CataloguePick) => void;
  /** Measured items from this record's site visits, when there are any. */
  visitItems?: VisitItemOption[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [debounced, setDebounced] = useState("");
  const listId = useId();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), 200);
    return () => clearTimeout(timer);
  }, [value]);

  const { data } = useQuery({
    queryKey: ["catalogue-search", debounced],
    queryFn: () =>
      fetchJson<{ data: PricedProduct[] }>(
        `/api/v2/inventory/products?q=${encodeURIComponent(debounced)}`,
      ),
    enabled: open && debounced.length >= 2,
    staleTime: 60_000,
  });

  const needle = value.trim().toLowerCase();

  // Measured items are matched locally — there are a handful per record, and
  // they should appear from the first keystroke rather than after two.
  const visitSuggestions: Suggestion[] = visitItems
    .filter((item) => !needle || item.description.toLowerCase().includes(needle))
    .slice(0, 6)
    .map((item) => ({
      key: `visit-${item.id}`,
      source: "visit",
      title: item.description,
      detail: [
        item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : null,
        item.visitLabel,
      ]
        .filter(Boolean)
        .join(" · "),
      trailing:
        item.unitPrice != null
          ? item.unitPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : null,
      pick: {
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      },
    }));

  const catalogueSuggestions: Suggestion[] = (data?.data ?? [])
    .filter((product) => product.isActive)
    .slice(0, 8)
    .map((product) => ({
      key: `product-${product.id}`,
      source: "catalogue",
      title: product.name,
      detail:
        product.line.priceSource !== "standard"
          ? `${product.code} · ${product.line.priceSource} price`
          : product.code,
      trailing: product.line.unitPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      pick: {
        productId: product.id,
        description: product.line.description || product.name,
        unitPrice: product.line.unitPrice,
        taxRate: product.line.taxRate,
      },
    }));

  // Measured first: on a job that had a survey, the thing being quoted is
  // almost always the thing somebody stood in front of and measured.
  const suggestions = [...visitSuggestions, ...catalogueSuggestions];
  const showing = open && suggestions.length > 0;

  const choose = (suggestion: Suggestion) => {
    onPick(suggestion.pick);
    setOpen(false);
    setActive(0);
  };

  return (
    <Popover open={showing} onOpenChange={setOpen}>
      {/* An anchor, not a trigger. `PopoverTrigger asChild` merges
          `type="button"` onto its child, and because `type` is not among the
          props written here it survived onto the input — so this field
          rendered as `<input type="button">`, which cannot be typed into at
          all. Every description had to arrive programmatically. An anchor
          positions the popover and imposes no button semantics. */}
      <PopoverAnchor asChild>
        <Input
          type="text"
          value={value}
          className={className}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showing}
          aria-controls={showing ? listId : undefined}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          onChange={(event) => {
            onChange(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (!showing) {
              if (event.key === "ArrowDown") setOpen(true);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => (index + 1) % suggestions.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
            } else if (event.key === "Enter") {
              // Only when a suggestion is highlighted. Otherwise Enter belongs
              // to the form, and hijacking it means somebody who typed their
              // own description gets somebody else's product.
              event.preventDefault();
              choose(suggestions[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="w-96 p-1"
        id={listId}
        role="listbox"
        // Keep the caret in the input: the list is a suggestion, not a step.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <p className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-sm text-[var(--text-subtle)]">
          <Search className="size-3.5" aria-hidden="true" />
          Suggestions — or keep typing your own
        </p>

        <ul className="max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.key}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => {
                  // Beat the input's blur so the click is not swallowed.
                  event.preventDefault();
                  choose(suggestion);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left",
                  index === active && "bg-[var(--surface-subtle)]",
                )}
              >
                {suggestion.source === "visit" ? (
                  <ClipboardList
                    className="size-4 shrink-0 text-[var(--text-subtle)]"
                    aria-hidden="true"
                  />
                ) : (
                  <Package
                    className="size-4 shrink-0 text-[var(--text-subtle)]"
                    aria-hidden="true"
                  />
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{suggestion.title}</span>
                  <span className="block truncate font-mono text-sm text-[var(--text-muted)]">
                    {suggestion.detail}
                  </span>
                </span>

                {suggestion.trailing ? (
                  <span className="shrink-0 font-mono text-sm">{suggestion.trailing}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
