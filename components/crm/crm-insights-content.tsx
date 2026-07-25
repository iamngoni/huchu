"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchJson } from "@/lib/api-client";
import { CRM_CHANNEL_LABELS } from "@/lib/crm/sources";

type RepRow = {
  repId: string;
  name: string;
  leads: number;
  quotes: number;
  won: number;
  winRate: number;
  invoicedAmount: number;
  collectedAmount: number;
  avgResponseHours: number | null;
};

type SourceRow = {
  source: string;
  channel: string;
  campaign: string | null;
  leads: number;
  won: number;
  conversionRate: number;
};

type ChannelRow = {
  channel: string;
  leads: number;
  won: number;
  conversionRate: number;
};

const CHANNEL_LABELS: Record<string, string> = CRM_CHANNEL_LABELS;

export function CrmInsightsContent() {
  const reps = useQuery({
    queryKey: ["crm-insights-reps"],
    queryFn: () => fetchJson<{ data: RepRow[] }>("/api/v2/crm/insights/reps").then((r) => r.data),
  });
  const sources = useQuery({
    queryKey: ["crm-insights-sources"],
    queryFn: () =>
      fetchJson<{ sources: SourceRow[]; channels: ChannelRow[] }>("/api/v2/crm/insights/sources"),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Per-rep performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="p-3">Rep</th>
                <th className="p-3 text-right">Leads</th>
                <th className="p-3 text-right">Quotes</th>
                <th className="p-3 text-right">Win %</th>
                <th className="p-3 text-right">Invoiced</th>
                <th className="p-3 text-right">Collected</th>
                <th className="p-3 text-right">Avg response</th>
              </tr>
            </thead>
            <tbody>
              {(reps.data ?? []).map((r) => (
                <tr key={r.repId} className="border-b border-[var(--border)]">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-right">{r.leads}</td>
                  <td className="p-3 text-right">{r.quotes}</td>
                  <td className="p-3 text-right">{r.winRate}%</td>
                  <td className="p-3 text-right">${r.invoicedAmount.toLocaleString()}</td>
                  <td className="p-3 text-right">${r.collectedAmount.toLocaleString()}</td>
                  <td className="p-3 text-right">{r.avgResponseHours != null ? `${r.avgResponseHours}h` : "—"}</td>
                </tr>
              ))}
              {reps.data && reps.data.length === 0 ? (
                <tr>
                  <td className="p-3 text-[var(--text-muted)]" colSpan={7}>
                    No data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead channels</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="p-3">Channel</th>
                <th className="p-3 text-right">Leads</th>
                <th className="p-3 text-right">Won</th>
                <th className="p-3 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {(sources.data?.channels ?? []).map((c) => (
                <tr key={c.channel} className="border-b border-[var(--border)]">
                  <td className="p-3 font-medium">{CHANNEL_LABELS[c.channel] ?? c.channel}</td>
                  <td className="p-3 text-right">{c.leads}</td>
                  <td className="p-3 text-right">{c.won}</td>
                  <td className="p-3 text-right">{c.conversionRate}%</td>
                </tr>
              ))}
              {sources.data && sources.data.channels.length === 0 ? (
                <tr>
                  <td className="p-3 text-[var(--text-muted)]" colSpan={4}>
                    No leads captured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Source & campaign attribution</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-muted)]">
                <th className="p-3">Source</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Campaign</th>
                <th className="p-3 text-right">Leads</th>
                <th className="p-3 text-right">Won</th>
                <th className="p-3 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {(sources.data?.sources ?? []).map((s, index) => (
                <tr key={index} className="border-b border-[var(--border)]">
                  <td className="p-3 font-medium">{s.source}</td>
                  <td className="p-3 text-[var(--text-muted)]">{CHANNEL_LABELS[s.channel] ?? s.channel}</td>
                  <td className="p-3 text-[var(--text-muted)]">{s.campaign ?? "—"}</td>
                  <td className="p-3 text-right">{s.leads}</td>
                  <td className="p-3 text-right">{s.won}</td>
                  <td className="p-3 text-right">{s.conversionRate}%</td>
                </tr>
              ))}
              {sources.data && sources.data.sources.length === 0 ? (
                <tr>
                  <td className="p-3 text-[var(--text-muted)]" colSpan={6}>
                    No leads captured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
