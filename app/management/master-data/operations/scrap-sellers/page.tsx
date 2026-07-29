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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

type SellerRecord = {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  _count: {
    purchases: number;
  };
};

type SellerForm = {
  fullName: string;
  phone: string;
  nationalId: string;
  address: string;
  notes: string;
  isActive: "true" | "false";
};

const emptyForm: SellerForm = {
  fullName: "",
  phone: "",
  nationalId: "",
  address: "",
  notes: "",
  isActive: "true",
};

async function fetchSellers(search?: string) {
  const query = new URLSearchParams();
  query.set("limit", "500");
  if (search) query.set("search", search);
  return fetchJson<{ data: SellerRecord[] }>(`/api/scrap-metal/sellers?${query.toString()}`);
}

export default function ScrapSellersMasterDataPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  // Server-side filter; deferring keeps one request per pause, not keystroke.
  const deferredSearch = useDeferredValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SellerRecord | null>(null);
  const [editing, setEditing] = useState<SellerRecord | null>(null);
  const [form, setForm] = useState<SellerForm>(emptyForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ["management", "master-data", "scrap-sellers", deferredSearch],
    queryFn: () => fetchSellers(deferredSearch),
  });

  const sellers = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async (payload: SellerForm) => {
      const body = {
        fullName: payload.fullName,
        phone: payload.phone,
        nationalId: payload.nationalId,
        address: payload.address || undefined,
        notes: payload.notes || undefined,
        isActive: payload.isActive === "true",
      };

      if (editing) {
        return fetchJson(`/api/scrap-metal/sellers/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }

      return fetchJson("/api/scrap-metal/sellers", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast({ title: editing ? "Supplier updated" : "Supplier created", variant: "success" });
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["management", "master-data", "scrap-sellers"] });
      queryClient.invalidateQueries({ queryKey: ["scrap-seller-profiles"] });
    },
    onError: (mutationError) => {
      toast({
        title: "Unable to save supplier",
        description: getApiErrorMessage(mutationError),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => fetchJson(`/api/scrap-metal/sellers/${id}`, { method: "DELETE" }),
    onSuccess: (result) => {
      toast({
        title: "Supplier updated",
        description:
          typeof result === "object" && result && "archived" in result
            ? "Supplier had purchase history, so the profile was archived instead of deleted."
            : "Supplier removed.",
        variant: "success",
      });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["management", "master-data", "scrap-sellers"] });
      queryClient.invalidateQueries({ queryKey: ["scrap-seller-profiles"] });
    },
    onError: (mutationError) => {
      toast({
        title: "Unable to remove supplier",
        description: getApiErrorMessage(mutationError),
        variant: "destructive",
      });
    },
  });

  const columns = useMemo<DataTableColumn<SellerRecord>[]>(
    () => [
      {
        key: "seller",
        header: "Supplier (Seller)",
        sortable: true,
        sortAccessor: (row) => row.fullName,
        render: (row) => (
          <div>
            <div className="font-semibold">{row.fullName}</div>
            <div className="text-sm text-[var(--text-muted)]">{row.phone}</div>
          </div>
        ),
      },
      {
        key: "nationalId",
        header: "National ID / Passport",
        width: 160,
        render: (row) => <span className="font-mono text-sm">{row.nationalId}</span>,
      },
      { key: "address", header: "Address", render: (row) => row.address ?? "" },
      {
        key: "purchases",
        header: "Purchases",
        width: 100,
        align: "right",
        render: (row) => <span className="font-mono text-sm">{row._count.purchases}</span>,
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
    <MasterDataPage<SellerRecord>
      title="Scrap Suppliers"
      description="Who the yard buys from — identity, contact and purchase history."
      createLabel="New supplier"
      onCreate={() => {
        setEditing(null);
        setForm(emptyForm);
        setFormOpen(true);
      }}
      columns={columns}
      data={sellers}
      rowKey={(row) => row.id}
      isLoading={isLoading}
      error={error}
      emptyLabel="No suppliers created yet"
      search={
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search supplier, phone, ID/passport, or address"
          aria-label="Search suppliers"
          className="h-9 w-full sm:w-64"
        />
      }
      renderDetail={(row) => (
        <div className="space-y-4">
          <div className="space-y-3">
            <DetailFact label="Supplier">{row.fullName}</DetailFact>
            <DetailFact label="Phone">{row.phone}</DetailFact>
            <DetailFact label="National ID / Passport">
              <span className="font-mono">{row.nationalId}</span>
            </DetailFact>
            {row.address ? <DetailFact label="Address">{row.address}</DetailFact> : null}
            {row.notes ? <DetailFact label="Notes">{row.notes}</DetailFact> : null}
            <DetailFact label="Purchases">{row._count.purchases}</DetailFact>
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
                  fullName: row.fullName,
                  phone: row.phone,
                  nationalId: row.nationalId,
                  address: row.address ?? "",
                  notes: row.notes ?? "",
                  isActive: row.isActive ? "true" : "false",
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
            <DialogTitle>{editing ? "Edit Supplier" : "New Supplier"}</DialogTitle>
            <DialogDescription>Capture the identity details required for supplier intake.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate(form);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} placeholder="Full name" required />
              <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input value={form.nationalId} onChange={(event) => setForm((prev) => ({ ...prev, nationalId: event.target.value }))} placeholder="National ID / Passport" required />
              <Select value={form.isActive} onValueChange={(value) => setForm((prev) => ({ ...prev, isActive: value as "true" | "false" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="Address or locality" />
            <Textarea rows={4} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove Supplier</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Remove ${deleteTarget.fullName}? Suppliers with purchase history will be archived instead.`
                : "Remove this supplier?"}
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
