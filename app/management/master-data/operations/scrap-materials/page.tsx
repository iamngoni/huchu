"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DataTableColumn } from "@corelithzw/react";
import {
  DetailFact,
  MasterDataPage,
} from "@/components/management/master-data/master-data-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumericCell } from "@/components/ui/numeric-cell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useReservedId } from "@/hooks/use-reserved-id";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

type MaterialRecord = {
  id: string;
  code: string;
  name: string;
  category: string;
  defaultPricePerKg: number;
  currency: string;
  isActive: boolean;
  notes?: string | null;
  _count: {
    prices: number;
    purchases: number;
    batches: number;
    sales: number;
  };
};

type MaterialForm = {
  code: string;
  name: string;
  category: string;
  defaultPricePerKg: string;
  currency: string;
  isActive: "true" | "false";
  notes: string;
};

const emptyForm: MaterialForm = {
  code: "",
  name: "",
  category: "MIXED",
  defaultPricePerKg: "",
  currency: "USD",
  isActive: "true",
  notes: "",
};

async function fetchMaterials(search?: string) {
  const query = new URLSearchParams();
  query.set("limit", "500");
  if (search) query.set("search", search);
  return fetchJson<{ data: MaterialRecord[] }>(`/api/scrap-metal/materials?${query.toString()}`);
}

export default function ScrapMaterialsMasterDataPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  // The material list is filtered on the server; deferring the needle keeps
  // one request per pause rather than one per keystroke.
  const deferredSearch = useDeferredValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaterialRecord | null>(null);
  const [editing, setEditing] = useState<MaterialRecord | null>(null);
  const [form, setForm] = useState<MaterialForm>(emptyForm);
  const {
    reservedId,
    isReserving,
    error: reserveError,
  } = useReservedId({
    entity: "SCRAP_MATERIAL",
    enabled: formOpen && !editing,
  });
  const resolvedCode = editing ? form.code : reservedId;

  const { data, isLoading, error } = useQuery({
    queryKey: ["management", "master-data", "scrap-materials", deferredSearch],
    queryFn: () => fetchMaterials(deferredSearch),
  });

  const materials = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (payload: MaterialForm) => {
      const body = {
        code: editing ? payload.code : resolvedCode,
        name: payload.name,
        category: payload.category,
        defaultPricePerKg: Number(payload.defaultPricePerKg),
        currency: payload.currency,
        isActive: payload.isActive === "true",
        notes: payload.notes || undefined,
      };

      if (editing) {
        return fetchJson(`/api/scrap-metal/materials/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }

      return fetchJson("/api/scrap-metal/materials", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast({ title: editing ? "Material updated" : "Material created", variant: "success" });
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["management", "master-data", "scrap-materials"] });
      queryClient.invalidateQueries({ queryKey: ["scrap-materials"] });
    },
    onError: (mutationError) => {
      toast({
        title: "Unable to save material",
        description: getApiErrorMessage(mutationError),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => fetchJson(`/api/scrap-metal/materials/${id}`, { method: "DELETE" }),
    onSuccess: (result) => {
      toast({
        title: "Material updated",
        description:
          typeof result === "object" && result && "archived" in result
            ? "Material had activity, so it was archived instead of deleted."
            : "Material removed.",
        variant: "success",
      });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["management", "master-data", "scrap-materials"] });
      queryClient.invalidateQueries({ queryKey: ["scrap-materials"] });
    },
    onError: (mutationError) => {
      toast({
        title: "Unable to remove material",
        description: getApiErrorMessage(mutationError),
        variant: "destructive",
      });
    },
  });

  const columns = useMemo<DataTableColumn<MaterialRecord>[]>(
    () => [
      {
        key: "material",
        header: "Material",
        sortable: true,
        sortAccessor: (row) => row.name,
        render: (row) => (
          <div>
            <div className="font-semibold">{row.name}</div>
            <div className="font-mono text-sm text-[var(--text-muted)]">{row.code}</div>
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        width: 120,
        render: (row) => <Badge variant="secondary">{row.category}</Badge>,
      },
      {
        key: "price",
        header: "Default Buy Price / kg",
        align: "right",
        width: 150,
        render: (row) => (
          <NumericCell>
            {row.currency} {row.defaultPricePerKg.toFixed(2)}
          </NumericCell>
        ),
      },
      {
        key: "status",
        header: "Status",
        width: 100,
        render: (row) => (
          <Badge variant={row.isActive ? "secondary" : "outline"}>
            {row.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <MasterDataPage<MaterialRecord>
      title="Scrap Materials"
      description="The material catalogue: what the yard buys and sells, and its default price."
      createLabel="New material"
      onCreate={() => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
      }}
      columns={columns}
      data={materials}
      rowKey={(row) => row.id}
      isLoading={isLoading}
      error={error}
      emptyLabel="No materials configured yet"
      search={
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search code, material, or notes"
          aria-label="Search materials"
          className="h-9 w-full sm:w-64"
        />
      }
      renderDetail={(row) => (
        <div className="space-y-4">
          <div className="space-y-3">
            <DetailFact label="Material">{row.name}</DetailFact>
            <DetailFact label="Code">
              <span className="font-mono">{row.code}</span>
            </DetailFact>
            <DetailFact label="Category">{row.category}</DetailFact>
            <DetailFact label="Default buy price / kg">
              <NumericCell>
                {row.currency} {row.defaultPricePerKg.toFixed(2)}
              </NumericCell>
            </DetailFact>
            <DetailFact label="Activity">
              Prices {row._count.prices} · Purchases {row._count.purchases} · Sales{" "}
              {row._count.sales}
            </DetailFact>
            {row.notes ? <DetailFact label="Notes">{row.notes}</DetailFact> : null}
            <DetailFact label="Status">{row.isActive ? "Active" : "Inactive"}</DetailFact>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditing(row);
                setForm({
                  code: row.code,
                  name: row.name,
                  category: row.category,
                  defaultPricePerKg: String(row.defaultPricePerKg),
                  currency: row.currency,
                  isActive: row.isActive ? "true" : "false",
                  notes: row.notes ?? "",
                });
                setFormOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setDeleteTarget(row)}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    >
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Material" : "New Material"}</DialogTitle>
            <DialogDescription>Keep the material catalog clean and operational.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!editing && !resolvedCode.trim()) {
                toast({
                  title: "Material code unavailable",
                  description: reserveError ?? "Code reservation is still in progress.",
                  variant: "destructive",
                });
                return;
              }
              saveMutation.mutate(form);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                value={resolvedCode}
                readOnly
                placeholder={
                  editing
                    ? "Material code"
                    : isReserving
                      ? "Reserving material code..."
                      : "Auto-generated"
                }
                required
              />
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Material name" required />
            </div>
            {!editing ? (
              <p className="text-sm text-muted-foreground">
                {reserveError ?? "Material code is generated automatically."}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-3">
              <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["BATTERIES", "COPPER", "ALUMINUM", "STEEL", "BRASS", "MIXED", "OTHER"].map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.defaultPricePerKg}
                onChange={(event) => setForm((prev) => ({ ...prev, defaultPricePerKg: event.target.value }))}
                placeholder="Default buy price / kg"
                required
              />
              <Input
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                placeholder="Currency"
                required
              />
            </div>
            <Select value={form.isActive} onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value as "true" | "false" }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Textarea rows={4} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Material"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove Material</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Remove ${deleteTarget.name}? Active materials with history will be archived instead.`
                : "Remove this material?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deleteMutation.isPending || !deleteTarget} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MasterDataPage>
  );
}
