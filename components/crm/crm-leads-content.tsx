"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CRM_LEAD_STAGES, CRM_STAGE_LABELS } from "@/lib/crm/pipeline";
import { CRM_CHANNEL_LABELS, CRM_LEAD_CHANNELS } from "@/lib/crm/sources";
import type { CrmLeadChannel, CrmLeadStage } from "@prisma/client";

type Lead = {
  id: string;
  leadNo: string;
  title: string | null;
  stage: CrmLeadStage;
  estimatedValue: number | null;
  currency: string;
  source: string | null;
  sourceChannel: CrmLeadChannel;
  client: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  updatedAt: string;
};

type LeadSource = { id: string; name: string; channel: CrmLeadChannel; isActive: boolean };

export function CrmLeadsContent() {
  const queryClient = useQueryClient();
  const [stageFilter, setStageFilter] = useState<CrmLeadStage | "ALL">("ALL");
  const [channelFilter, setChannelFilter] = useState<CrmLeadChannel | "ALL">("ALL");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const leads = useQuery({
    queryKey: ["crm-leads", stageFilter, channelFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (stageFilter !== "ALL") params.set("stage", stageFilter);
      if (channelFilter !== "ALL") params.set("channel", channelFilter);
      const qs = params.toString();
      return fetchJson<{ data: Lead[] }>(`/api/v2/crm/leads${qs ? `?${qs}` : ""}`).then((r) => r.data);
    },
  });

  const leadSources = useQuery({
    queryKey: ["crm-lead-sources"],
    queryFn: () => fetchJson<{ data: LeadSource[] }>("/api/v2/crm/lead-sources").then((r) => r.data),
  });

  const createLead = useMutation({
    mutationFn: (body: { title: string; estimatedValue?: number; source?: string; sourceChannel?: string }) =>
      fetchJson<Lead>("/api/v2/crm/leads", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setEstimatedValue("");
      setSourceName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

  function submitLead() {
    const catalogSource = (leadSources.data ?? []).find((s) => s.name === sourceName);
    createLead.mutate({
      title,
      estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
      source: sourceName || undefined,
      sourceChannel: catalogSource?.channel,
    });
  }

  const byStage = new Map<CrmLeadStage, Lead[]>();
  for (const lead of leads.data ?? []) {
    const list = byStage.get(lead.stage) ?? [];
    list.push(lead);
    byStage.set(lead.stage, list);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={stageFilter === "ALL" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setStageFilter("ALL")}
          >
            All
          </Badge>
          {CRM_LEAD_STAGES.map((stage) => (
            <Badge
              key={stage}
              variant={stageFilter === stage ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStageFilter(stage)}
            >
              {CRM_STAGE_LABELS[stage]}
            </Badge>
          ))}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Channel:</span>
          <Badge
            variant={channelFilter === "ALL" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setChannelFilter("ALL")}
          >
            All
          </Badge>
          {CRM_LEAD_CHANNELS.map((channel) => (
            <Badge
              key={channel}
              variant={channelFilter === channel ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setChannelFilter(channel)}
            >
              {CRM_CHANNEL_LABELS[channel]}
            </Badge>
          ))}
        </div>

        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
          New lead
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="lead-title">Title</Label>
                <Input id="lead-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="lead-value">Estimated value</Label>
                <Input
                  id="lead-value"
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lead-source">Source</Label>
                <Input
                  id="lead-source"
                  list="crm-lead-source-options"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. Walk-in, Facebook, Referral"
                />
                <datalist id="crm-lead-source-options">
                  {(leadSources.data ?? [])
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                </datalist>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button onClick={submitLead} disabled={createLead.isPending || !title}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {leads.isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(stageFilter === "ALL" ? CRM_LEAD_STAGES : [stageFilter]).map((stage) => (
            <Card key={stage}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{CRM_STAGE_LABELS[stage]}</span>
                  <Badge variant="outline">{byStage.get(stage)?.length ?? 0}</Badge>
                </div>
                {(byStage.get(stage) ?? []).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/crm/leads/${lead.id}`}
                    className="block rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--surface-hover)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{lead.title ?? lead.leadNo}</span>
                      {lead.estimatedValue ? (
                        <span className="text-sm text-[var(--text-muted)]">
                          {lead.currency} {lead.estimatedValue.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {lead.client?.name ?? "No client"} · {lead.assignedTo?.name ?? "Unassigned"}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                      {CRM_CHANNEL_LABELS[lead.sourceChannel] ?? lead.sourceChannel}
                      {lead.source ? ` · ${lead.source}` : ""}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
