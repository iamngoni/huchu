"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";

type ApiKey = { id: string; name: string; keyPrefix: string; lastUsedAt: string | null; revokedAt: string | null };
type CommissionRule = {
  id: string;
  name: string;
  basis: "INVOICED" | "PAID";
  isActive: boolean;
  tiers: Array<{ thresholdFrom: number; ratePercent: number }>;
};

function ApiKeysPanel() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);

  const keys = useQuery({
    queryKey: ["crm-api-keys"],
    queryFn: () => fetchJson<{ data: ApiKey[] }>("/api/v2/crm/api-keys").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () =>
      fetchJson<{ key: string }>("/api/v2/crm/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: (data) => {
      setRevealed(data.key);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["crm-api-keys"] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/v2/crm/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-api-keys"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Webhook API keys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          POST leads to <code>/api/public/crm/webhook/leads</code> with header <code>x-api-key</code>.
        </p>
        <div className="flex gap-2">
          <Input placeholder="Key name (e.g. Website form)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
            Create key
          </Button>
        </div>
        {revealed ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] p-3">
            <p className="text-sm font-medium">Copy this key now — it won&apos;t be shown again:</p>
            <code className="mt-1 block break-all text-sm">{revealed}</code>
          </div>
        ) : null}
        <ul className="divide-y divide-[var(--border)]">
          {(keys.data ?? []).map((k) => (
            <li key={k.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {k.name} <code className="text-[var(--text-muted)]">{k.keyPrefix}…</code>
                {k.revokedAt ? <Badge variant="outline" className="ml-2">Revoked</Badge> : null}
              </span>
              {!k.revokedAt ? (
                <Button size="sm" variant="outline" onClick={() => revoke.mutate(k.id)}>
                  Revoke
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CommissionsPanel() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [basis, setBasis] = useState<"INVOICED" | "PAID">("PAID");
  const [tiers, setTiers] = useState([{ thresholdFrom: "0", ratePercent: "5" }]);
  const [error, setError] = useState<string | null>(null);

  const rules = useQuery({
    queryKey: ["crm-commission-rules"],
    queryFn: () => fetchJson<{ data: CommissionRule[] }>("/api/v2/crm/commissions/rules").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () =>
      fetchJson("/api/v2/crm/commissions/rules", {
        method: "POST",
        body: JSON.stringify({
          name,
          basis,
          tiers: tiers.map((t) => ({ thresholdFrom: Number(t.thresholdFrom), ratePercent: Number(t.ratePercent) })),
        }),
      }),
    onSuccess: () => {
      setName("");
      setTiers([{ thresholdFrom: "0", ratePercent: "5" }]);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["crm-commission-rules"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Commission rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="rule-name">Rule name</Label>
            <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rule-basis">Basis</Label>
            <select
              id="rule-basis"
              className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
              value={basis}
              onChange={(e) => setBasis(e.target.value as "INVOICED" | "PAID")}
            >
              <option value="PAID">On payment received</option>
              <option value="INVOICED">On invoiced amount</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Tiers (marginal rate from a cumulative revenue threshold)</Label>
          {tiers.map((tier, index) => (
            <div key={index} className="grid grid-cols-12 gap-2">
              <Input
                className="col-span-6"
                type="number"
                placeholder="From revenue"
                value={tier.thresholdFrom}
                onChange={(e) => {
                  const next = [...tiers];
                  next[index] = { ...tier, thresholdFrom: e.target.value };
                  setTiers(next);
                }}
              />
              <Input
                className="col-span-5"
                type="number"
                placeholder="Rate %"
                value={tier.ratePercent}
                onChange={(e) => {
                  const next = [...tiers];
                  next[index] = { ...tier, ratePercent: e.target.value };
                  setTiers(next);
                }}
              />
              <Button
                className="col-span-1"
                variant="ghost"
                size="sm"
                onClick={() => setTiers(tiers.filter((_, i) => i !== index))}
              >
                ✕
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTiers([...tiers, { thresholdFrom: "0", ratePercent: "0" }])}
          >
            Add tier
          </Button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
          Create rule
        </Button>

        <ul className="divide-y divide-[var(--border)]">
          {(rules.data ?? []).map((rule) => (
            <li key={rule.id} className="py-2 text-sm">
              <span className="font-medium">{rule.name}</span>{" "}
              <Badge variant="outline">{rule.basis === "PAID" ? "On payment" : "On invoice"}</Badge>
              <span className="ml-2 text-[var(--text-muted)]">
                {rule.tiers.map((t) => `${t.ratePercent}% from ${t.thresholdFrom}`).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CrmSettingsContent() {
  return (
    <Tabs defaultValue="keys">
      <TabsList>
        <TabsTrigger value="keys">API Keys</TabsTrigger>
        <TabsTrigger value="commissions">Commissions</TabsTrigger>
      </TabsList>
      <TabsContent value="keys">
        <ApiKeysPanel />
      </TabsContent>
      <TabsContent value="commissions">
        <CommissionsPanel />
      </TabsContent>
    </Tabs>
  );
}
