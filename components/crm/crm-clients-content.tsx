"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

type Client = {
  id: string;
  clientNo: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
};

export function CrmClientsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const clients = useQuery({
    queryKey: ["crm-clients", search],
    queryFn: () =>
      fetchJson<{ data: Client[] }>(`/api/v2/crm/clients${search ? `?q=${encodeURIComponent(search)}` : ""}`).then(
        (r) => r.data,
      ),
  });

  const create = useMutation({
    mutationFn: () =>
      fetchJson<Client>("/api/v2/crm/clients", {
        method: "POST",
        body: JSON.stringify({ name, email: email || undefined, phone: phone || undefined }),
      }),
    onSuccess: () => {
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["crm-clients"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 basis-52 sm:max-w-sm"
        />
        <Button onClick={() => setOpen(true)}>New client</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New client</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="c-name">Name</Label>
                <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-phone">Phone (with country code)</Label>
                <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263…" />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Stacked list on phones; table from sm up. */}
          <ul className="divide-y divide-[var(--border)] sm:hidden">
            {(clients.data ?? []).map((c) => (
              <li key={c.id} className="space-y-0.5 p-3 text-sm">
                <p className="font-medium">
                  {c.name} <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">{c.clientNo}</span>
                </p>
                <p className="truncate text-[var(--text-muted)]">
                  {[c.email, c.phone, c.city].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </li>
            ))}
            {clients.data && clients.data.length === 0 ? (
              <li className="p-3 text-sm text-[var(--text-muted)]">No clients yet.</li>
            ) : null}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                  <th className="p-3">Client</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">City</th>
                </tr>
              </thead>
              <tbody>
                {(clients.data ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)]">
                    <td className="p-3">
                      <span className="font-medium">{c.name}</span>
                      <span className="ml-2 text-xs text-[var(--text-muted)]">{c.clientNo}</span>
                    </td>
                    <td className="p-3 text-[var(--text-muted)]">{c.email ?? "—"}</td>
                    <td className="p-3 text-[var(--text-muted)]">{c.phone ?? "—"}</td>
                    <td className="p-3 text-[var(--text-muted)]">{c.city ?? "—"}</td>
                  </tr>
                ))}
                {clients.data && clients.data.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[var(--text-muted)]" colSpan={4}>
                      No clients yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
