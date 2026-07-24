"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJson } from "@/lib/api-client";
import { CRM_STAGE_LABELS } from "@/lib/crm/pipeline";
import type { CrmLeadStage } from "@prisma/client";

type Summary = {
  funnel: { total: number; won: number; winRate: number; stages: Array<{ stage: CrmLeadStage; label: string; count: number }> };
  pipeline: { openLeads: number; grossValue: number; weightedValue: number };
  followUps: { overdue: number; byStatus: Record<string, number> };
};

type FollowUp = {
  id: string;
  title: string;
  dueAt: string;
  lead: { id: string; leadNo: string; title: string | null } | null;
  client: { id: string; name: string } | null;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-[var(--text-muted)]">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function CrmDashboardContent() {
  const summary = useQuery({
    queryKey: ["crm-summary"],
    queryFn: () => fetchJson<Summary>("/api/v2/crm/insights/summary"),
  });
  const overdue = useQuery({
    queryKey: ["crm-followups-overdue"],
    queryFn: () =>
      fetchJson<{ data: FollowUp[] }>("/api/v2/crm/follow-ups?overdue=true").then((r) => r.data),
  });

  const s = summary.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Open leads" value={s?.pipeline.openLeads ?? "—"} />
        <Stat label="Weighted pipeline" value={s ? `$${s.pipeline.weightedValue.toLocaleString()}` : "—"} />
        <Stat label="Win rate" value={s ? `${s.funnel.winRate}%` : "—"} />
        <Stat label="Overdue follow-ups" value={s?.followUps.overdue ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline by stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(s?.funnel.stages ?? []).map((stage) => (
              <Link key={stage.stage} href={`/crm/leads?stage=${stage.stage}`}>
                <Badge variant="outline" className="text-sm">
                  {CRM_STAGE_LABELS[stage.stage] ?? stage.label}: {stage.count}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overdue follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.data && overdue.data.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {overdue.data.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {f.title}
                    {f.lead ? (
                      <Link href={`/crm/leads/${f.lead.id}`} className="ml-2 text-[var(--text-muted)] underline">
                        {f.lead.leadNo}
                      </Link>
                    ) : null}
                  </span>
                  <span className="text-[var(--text-muted)]">{new Date(f.dueAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Nothing overdue. Nice.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
