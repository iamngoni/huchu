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
import type { CrmLeadStage } from "@prisma/client";

type Lead = {
  id: string;
  leadNo: string;
  title: string | null;
  stage: CrmLeadStage;
  estimatedValue: number | null;
  currency: string;
  client: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  updatedAt: string;
};

export function CrmLeadsContent() {
  const queryClient = useQueryClient();
  const [stageFilter, setStageFilter] = useState<CrmLeadStage | "ALL">("ALL");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const leads = useQuery({
    queryKey: ["crm-leads", stageFilter],
    queryFn: () =>
      fetchJson<{ data: Lead[] }>(
        `/api/v2/crm/leads${stageFilter === "ALL" ? "" : `?stage=${stageFilter}`}`,
      ).then((r) => r.data),
  });

  const createLead = useMutation({
    mutationFn: (body: { title: string; estimatedValue?: number }) =>
      fetchJson<Lead>("/api/v2/crm/leads", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      setEstimatedValue("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    },
    onError: (e) => setError(getApiErrorMessage(e)),
  });

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

        <Button onClick={() => setOpen(true)}>New lead</Button>
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
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
            <DialogFooter>
              <Button
                onClick={() =>
                  createLead.mutate({
                    title,
                    estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
                  })
                }
                disabled={createLead.isPending || !title}
              >
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
