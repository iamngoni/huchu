"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchJson } from "@/lib/api-client";
import { Package, Search } from "@/lib/icons";
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

export type CataloguePick = {
  productId: string;
  description: string;
  unitPrice: number;
  taxRate: number;
};

/**
 * Picking what you sell, instead of retyping it.
 *
 * Quote lines were free text, which is how the same panel ends up on three
 * quotes at three prices under two spellings — and how a discount nobody
 * authorised gets typed in without anything noticing. The catalogue already
 * holds the price, the tax rate and the price-list resolution; this is the
 * shortest path from "the thing we sell" to a line that carries all of it.
 *
 * Free text still works. A quote for something not in the catalogue is a real
 * thing that happens, and a builder that refuses it sends people to Word.
 */
export function CataloguePicker({
  value,
  onChange,
  onPick,
  placeholder = "Description, or search the catalogue",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (pick: CataloguePick) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");

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

  const products = (data?.data ?? []).filter((product) => product.isActive).slice(0, 8);

  return (
    <Popover open={open && products.length > 0} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          value={value}
          className={className}
          placeholder={placeholder}
          aria-label="Description"
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-96 p-1"
        // Keep the caret in the input: the list is a suggestion, not a step.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <p className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-sm text-[var(--text-subtle)]">
          <Search className="size-3.5" aria-hidden="true" />
          From the catalogue
        </p>

        <ul className="max-h-64 overflow-y-auto">
          {products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onMouseDown={(event) => {
                  // Beat the input's blur so the click is not swallowed.
                  event.preventDefault();
                  onPick({
                    productId: product.id,
                    description: product.line.description || product.name,
                    unitPrice: product.line.unitPrice,
                    taxRate: product.line.taxRate,
                  });
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left hover:bg-[var(--surface-subtle)]"
              >
                <Package
                  className="size-4 shrink-0 text-[var(--text-subtle)]"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{product.name}</span>
                  <span className="block truncate font-mono text-sm text-[var(--text-muted)]">
                    {product.code}
                    {product.line.priceSource !== "standard" ? (
                      <span className={cn("ml-1.5 font-sans not-italic")}>
                        · {product.line.priceSource} price
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm">
                  {product.line.unitPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
