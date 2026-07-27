"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatMoney } from "@/components/crm/documents/document-types";
import { CATALOG_KINDS, CATALOG_KIND_LABELS } from "@/lib/crm/catalogue";
import { Plus, Trash2 } from "@/lib/icons";

type CatalogItem = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  kind: (typeof CATALOG_KINDS)[number];
  unit: string | null;
  unitPrice: number;
  currency: string;
  taxRate: number;
  costPrice: number | null;
  maxDiscountPercent: number | null;
  isActive: boolean;
  tiers: { id: string; minQuantity: number; unitPrice: number }[];
};

export function CataloguePanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-catalog", "all"],
    queryFn: () =>
      fetchJson<{ data: { data: CatalogItem[] } }>("/api/v2/crm/catalog?includeInactive=1"),
  });

  const items = data?.data.data ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["crm-catalog"] });

  const retire = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/v2/crm/catalog/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Item retired", description: "Old quotes still show it." });
      refresh();
    },
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">What you sell</h2>
          <p className="text-sm text-[var(--text-muted)]">
            The things that go on a quote. Recording a cost price makes the
            margin visible before the quote goes out, and a per-item discount
            cap stops a big discount hiding on one expensive line.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          New item
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load the catalogue</AlertTitle>
          <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-[var(--card-radius)] border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
          Nothing in the catalogue yet. Quotes can still be typed line by line.
        </p>
      ) : (
        <div className="overflow-hidden rounded-[var(--card-radius)] border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Margin</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const margin =
                  item.costPrice === null ? null : item.unitPrice - item.costPrice;
                return (
                  <tr
                    key={item.id}
                    className={`border-t border-[var(--border-subtle)] ${item.isActive ? "" : "opacity-50"}`}
                  >
                    <td className="px-3 py-2 font-mono">{item.code}</td>
                    <td className="px-3 py-2">
                      {item.name}
                      {item.tiers.length ? (
                        <span className="ml-2 text-xs text-[var(--text-muted)]">
                          {item.tiers.length} volume price
                          {item.tiers.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {CATALOG_KIND_LABELS[item.kind]}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatMoney(item.unitPrice, item.currency)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {margin === null ? "—" : formatMoney(margin, item.currency)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {item.isActive ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Retire ${item.name}`}
                          onClick={() => retire.mutate(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">Retired</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CatalogItemSheet open={creating} onOpenChange={setCreating} onCreated={refresh} />
    </div>
  );
}

function CatalogItemSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    category: "",
    kind: "SERVICE",
    unit: "",
    unitPrice: "",
    taxRate: "0",
    costPrice: "",
    maxDiscountPercent: "",
  });
  const [tiers, setTiers] = useState<{ minQuantity: string; unitPrice: string }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm({
        code: "",
        name: "",
        description: "",
        category: "",
        kind: "SERVICE",
        unit: "",
        unitPrice: "",
        taxRate: "0",
        costPrice: "",
        maxDiscountPercent: "",
      });
      setTiers([]);
      setErrors([]);
    }
  }

  const set = (key: keyof typeof form, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const create = useMutation({
    mutationFn: () =>
      fetchJson("/api/v2/crm/catalog", {
        method: "POST",
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          kind: form.kind,
          unit: form.unit.trim() || null,
          unitPrice: Number(form.unitPrice) || 0,
          taxRate: Number(form.taxRate) || 0,
          costPrice: form.costPrice === "" ? null : Number(form.costPrice),
          maxDiscountPercent:
            form.maxDiscountPercent === "" ? null : Number(form.maxDiscountPercent),
          tiers: tiers
            .filter((tier) => tier.minQuantity && tier.unitPrice)
            .map((tier) => ({
              minQuantity: Number(tier.minQuantity),
              unitPrice: Number(tier.unitPrice),
            })),
        }),
      }),
    onSuccess: () => {
      toast({ title: "Added to the catalogue" });
      onCreated();
      onOpenChange(false);
    },
    onError: (err) => setErrors([getApiErrorMessage(err)]),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New catalogue item</SheetTitle>
          <SheetDescription>Something you can drop straight onto a quote.</SheetDescription>
        </SheetHeader>

        <FormShell
          variant="bare"
          errors={errors}
          requiredHint="A code, a name and a price are required."
          onSubmit={(event) => {
            event.preventDefault();
            const found: string[] = [];
            if (!form.code.trim()) found.push("Give it a code");
            if (!form.name.trim()) found.push("Give it a name");
            if (form.unitPrice === "" || Number.isNaN(Number(form.unitPrice))) {
              found.push("Give it a price");
            }
            setErrors(found);
            if (found.length === 0) create.mutate();
          }}
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Add item"}
              </Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-code">Code *</Label>
              <Input
                id="cat-code"
                value={form.code}
                onChange={(event) => set("code", event.target.value)}
                placeholder="SOL-PANEL-450"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select value={form.kind} onValueChange={(value) => set("kind", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATALOG_KINDS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {CATALOG_KIND_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name *</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="450W solar panel, supplied and fitted"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-price">Price *</Label>
              <Input
                id="cat-price"
                type="number"
                step="0.01"
                value={form.unitPrice}
                onChange={(event) => set("unitPrice", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-cost">Cost</Label>
              <Input
                id="cat-cost"
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(event) => set("costPrice", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-tax">Tax %</Label>
              <Input
                id="cat-tax"
                type="number"
                step="0.01"
                value={form.taxRate}
                onChange={(event) => set("taxRate", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-unit">Sold per</Label>
              <Input
                id="cat-unit"
                value={form.unit}
                onChange={(event) => set("unit", event.target.value)}
                placeholder="m², hour, each"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-category">Category</Label>
              <Input
                id="cat-category"
                value={form.category}
                onChange={(event) => set("category", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-maxdisc">Max discount %</Label>
              <Input
                id="cat-maxdisc"
                type="number"
                step="0.1"
                value={form.maxDiscountPercent}
                onChange={(event) => set("maxDiscountPercent", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Volume pricing</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setTiers((previous) => [...previous, { minQuantity: "", unitPrice: "" }])
                }
              >
                Add tier
              </Button>
            </div>
            {tiers.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                One price whatever the quantity.
              </p>
            ) : (
              tiers.map((tier, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">From quantity</Label>
                    <Input
                      type="number"
                      value={tier.minQuantity}
                      onChange={(event) =>
                        setTiers((previous) =>
                          previous.map((item, position) =>
                            position === index
                              ? { ...item, minQuantity: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Unit price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={tier.unitPrice}
                      onChange={(event) =>
                        setTiers((previous) =>
                          previous.map((item, position) =>
                            position === index
                              ? { ...item, unitPrice: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove tier"
                    onClick={() =>
                      setTiers((previous) =>
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

          <div className="space-y-1.5">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea
              id="cat-description"
              rows={3}
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </div>
        </FormShell>
      </SheetContent>
    </Sheet>
  );
}
