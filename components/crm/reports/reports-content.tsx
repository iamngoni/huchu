"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Alert,
  Card,
  EmptyState,
  Progress,
  SegmentedControl,
  Skeleton,
  StatCard,
  Stack,
} from "@corelithzw/react";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { formatMoney } from "@/components/crm/documents/document-types";
import {
  REPORT_RANGES,
  REPORT_RANGE_LABELS,
  biggestLeak,
  formatRate,
  type FunnelStage,
  type GroupedPerformance,
  type ReportRange,
} from "@/lib/crm/reports";

/** Bare, like every other report route — see the collections note. */
type ReportResponse = {
    range: ReportRange;
    scope: "TEAM" | "MINE";
    funnel: FunnelStage[];
    counts: { won: number; lost: number; open: number };
    winRate: number;
    medianCycleDays: number | null;
    forecast: { weighted: number; unweighted: number; count: number; estimated: number };
    byOwner: GroupedPerformance[];
    bySource: GroupedPerformance[];
    activity: { period: string; count: number }[];
    leads: { created: number; converted: number };
};

export function ReportsContent({ currency = "USD" }: { currency?: string }) {
  const [range, setRange] = useState<ReportRange>("90d");

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-reports", range],
    queryFn: () => fetchJson<ReportResponse>(`/api/v2/crm/reports?range=${range}`),
  });

  const report = data;
  const leak = report ? biggestLeak(report.funnel) : null;
  const peak = Math.max(1, ...(report?.activity.map((bucket) => bucket.count) ?? [1]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          options={REPORT_RANGES.map((value) => ({ value, label: REPORT_RANGE_LABELS[value] }))}
          value={range}
          onValueChange={(value) => setRange(value as ReportRange)}
          aria-label="Reporting period"
        />

        {report ? (
          <p className="text-sm text-[var(--text-muted)]">
            {report.scope === "TEAM" ? "Everyone" : "Your deals only"}
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert tone="danger" title="Couldn't build the report">
          {getApiErrorMessage(error)}
        </Alert>
      ) : null}

      {isLoading || !report ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} height={96} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Win rate"
              value={formatRate(report.winRate)}
              footer={`${report.counts.won} won, ${report.counts.lost} lost`}
            />
            <StatCard
              label="Weighted forecast"
              value={formatMoney(report.forecast.weighted, currency)}
              footer={
                report.forecast.estimated === 0
                  ? `${formatMoney(report.forecast.unweighted, currency)} if everything lands`
                  : `${formatMoney(report.forecast.unweighted, currency)} if everything lands · ${report.forecast.estimated} of ${report.forecast.count} at a default likelihood`
              }
            />
            <StatCard
              label="Typical cycle"
              value={report.medianCycleDays === null ? "—" : `${report.medianCycleDays}d`}
              footer="Median, open to closed"
            />
            <StatCard
              label="Leads"
              value={String(report.leads.created)}
              footer={`${report.leads.converted} became deals`}
            />
          </div>

          <Card
            title="Pipeline funnel"
            subtitle={
              leak && leak.droppedFromPrevious > 0
                ? `Biggest drop-off at ${leak.label} — ${leak.droppedFromPrevious} lost from the stage before`
                : undefined
            }
          >
            {report.funnel.length === 0 ? (
              <EmptyState title="No deals in this period yet" />
            ) : (
              <Stack as="ul" gap="sm">
                {report.funnel.map((stage, index) => (
                  <li key={stage.key} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{stage.label}</span>
                      <span className="text-[var(--text-muted)]">
                        <span className="font-mono text-[var(--text-primary)]">
                          {stage.reached}
                        </span>
                        {index > 0
                          ? ` · ${formatRate(stage.conversionFromPrevious)} of previous`
                          : ""}
                      </span>
                    </div>
                    <Progress
                      value={Math.max(2, stage.shareOfTotal * 100)}
                      label={`${stage.label}: ${stage.reached} of ${report.funnel[0]?.reached ?? 0}`}
                    />
                  </li>
                ))}
              </Stack>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <PerformanceTable title="By owner" rows={report.byOwner} currency={currency} />
            <PerformanceTable title="By source" rows={report.bySource} currency={currency} />
          </div>

          <Card title="Activity">
            <div className="flex h-24 items-end gap-0.5">
              {report.activity.map((bucket) => (
                <div
                  key={bucket.period}
                  title={`${bucket.period}: ${bucket.count}`}
                  className="flex-1 rounded-t bg-[var(--surface-inverse)]"
                  // A quiet day is a visible gap rather than a straight line
                  // drawn through it.
                  style={{ height: `${(bucket.count / peak) * 100}%`, minHeight: "1px" }}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Calls, emails and notes logged. Peak {peak} in a single period.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function PerformanceTable({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: GroupedPerformance[];
  currency: string;
}) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <EmptyState title="Nothing to show yet" />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-sm uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="pb-1 font-medium">Name</th>
              <th className="pb-1 text-right font-medium">Won</th>
              <th className="pb-1 text-right font-medium">Rate</th>
              <th className="pb-1 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-[var(--border-subtle)]">
                <td className="py-1.5">{row.label}</td>
                <td className="py-1.5 text-right font-mono">{row.won}</td>
                <td className="py-1.5 text-right font-mono">{formatRate(row.winRate)}</td>
                <td className="py-1.5 text-right font-mono">
                  {formatMoney(row.wonValue, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
