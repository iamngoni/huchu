"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";

type ReportResponse = {
  data: {
    range: ReportRange;
    scope: "TEAM" | "MINE";
    funnel: FunnelStage[];
    counts: { won: number; lost: number; open: number };
    winRate: number;
    medianCycleDays: number | null;
    forecast: { weighted: number; unweighted: number; count: number };
    byOwner: GroupedPerformance[];
    bySource: GroupedPerformance[];
    activity: { period: string; count: number }[];
    leads: { created: number; converted: number };
  };
};

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--card-radius)] border border-[var(--border)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-mono text-2xl">{value}</p>
      {hint ? <p className="text-xs text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

export function ReportsContent({ currency = "USD" }: { currency?: string }) {
  const [range, setRange] = useState<ReportRange>("90d");

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-reports", range],
    queryFn: () => fetchJson<ReportResponse>(`/api/v2/crm/reports?range=${range}`),
  });

  const report = data?.data;
  const leak = report ? biggestLeak(report.funnel) : null;
  const peak = Math.max(1, ...(report?.activity.map((bucket) => bucket.count) ?? [1]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {REPORT_RANGES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                range === value
                  ? "bg-[var(--surface-inverse)] text-[var(--text-inverse)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]",
              )}
            >
              {REPORT_RANGE_LABELS[value]}
            </button>
          ))}
        </div>
        {report ? (
          <p className="text-sm text-[var(--text-muted)]">
            {report.scope === "TEAM" ? "Everyone" : "Your deals only"}
          </p>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t build the report</AlertTitle>
          <AlertDescription>{getApiErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading || !report ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Win rate"
              value={formatRate(report.winRate)}
              hint={`${report.counts.won} won, ${report.counts.lost} lost`}
            />
            <Stat
              label="Weighted forecast"
              value={formatMoney(report.forecast.weighted, currency)}
              hint={`${formatMoney(report.forecast.unweighted, currency)} if everything lands`}
            />
            <Stat
              label="Typical cycle"
              value={
                report.medianCycleDays === null ? "—" : `${report.medianCycleDays}d`
              }
              hint="Median, open to closed"
            />
            <Stat
              label="Leads"
              value={String(report.leads.created)}
              hint={`${report.leads.converted} became deals`}
            />
          </div>

          <section className="space-y-3 rounded-[var(--card-radius)] border border-[var(--border)] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Pipeline funnel</h2>
              {leak && leak.droppedFromPrevious > 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  Biggest drop-off at{" "}
                  <span className="font-medium text-[var(--text-primary)]">{leak.label}</span> —{" "}
                  {leak.droppedFromPrevious} lost from the stage before
                </p>
              ) : null}
            </div>

            {report.funnel.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No deals in this period yet.
              </p>
            ) : (
              <ul className="space-y-2">
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
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--surface-inverse)]"
                        style={{ width: `${Math.max(2, stage.shareOfTotal * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <PerformanceTable title="By owner" rows={report.byOwner} currency={currency} />
            <PerformanceTable title="By source" rows={report.bySource} currency={currency} />
          </div>

          <section className="space-y-3 rounded-[var(--card-radius)] border border-[var(--border)] p-4">
            <h2 className="text-sm font-semibold">Activity</h2>
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
            <p className="text-xs text-[var(--text-muted)]">
              Calls, emails and notes logged. Peak {peak} in a single period.
            </p>
          </section>
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
    <section className="space-y-3 rounded-[var(--card-radius)] border border-[var(--border)] p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Nothing to show yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
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
    </section>
  );
}
