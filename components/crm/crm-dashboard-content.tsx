"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Alert, Card, EmptyState, KpiGrid, RowCard, Skeleton, StatHero } from "@corelithzw/react";
import { fetchJson, getApiErrorMessage } from "@/lib/api-client";
import { AGEING_LABELS, type AgeingBucket } from "@/lib/crm/collections";
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Receipt,
  Wrench,
} from "@/lib/icons";

type DashboardData = {
  scope: "TEAM" | "MINE";
  periodDays: number;
  pipeline: {
    openDeals: number;
    grossValue: number;
    weightedValue: number;
    byStage: Array<{ id: string; name: string; status: string; count: number; value: number }>;
    stale: number;
    closingThisWeek: number;
  };
  won: {
    count: number;
    value: number;
    lost: number;
    valueDeltaPercent: number | null;
    previousValue: number;
  };
  tasks: { overdue: number; today: number; open: number; legacyOverdue: number };
  documents: {
    quotationsRaised: number;
    quotedValue: number;
    awaitingApproval: number;
    pendingDiscountApprovals: number;
  };
  collections: {
    outstanding: number;
    overdue: number;
    invoiceCount: number;
    ageing: Partial<Record<AgeingBucket, { count: number; value: number }>>;
  };
  delivery: { workOrders: Record<string, number>; upcomingVisits: number };
};

function money(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * The CRM home, built to the KPI hero + drilldown recipe: one hero number, a
 * row of secondary KPIs, then rows that lead somewhere.
 *
 * The previous version answered three questions and ignored deals, quotes,
 * invoices, work orders and site visits, so it could not tell you whether
 * anything needed you today. Every number here is a link to the list it came
 * from — a dashboard that cannot be drilled into is a poster.
 */
export function CrmDashboardContent() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-dashboard"],
    queryFn: () => fetchJson<DashboardData>("/api/v2/crm/dashboard"),
  });

  if (error) {
    return (
      <Alert tone="danger" title="Couldn't load the dashboard">
        {getApiErrorMessage(error)}
      </Alert>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <Skeleton height={132} />
        <Skeleton height={96} />
        <Skeleton height={220} />
      </div>
    );
  }

  const { pipeline, won, tasks, documents, collections, delivery } = data;
  const needsAttention = tasks.overdue + tasks.legacyOverdue;
  const nothingYet = pipeline.openDeals === 0 && won.count === 0 && documents.quotationsRaised === 0;

  if (nothingYet) {
    return (
      <EmptyState
        title="Nothing in the pipeline yet"
        body="Once a deal is open, this page shows what is in flight, what is owed to a customer, and what is owed to you."
        action={
          <Link href="/crm/deals?new=1" className="btn btn-primary">
            Start a deal
          </Link>
        }
      />
    );
  }

  const openWorkOrders =
    (delivery.workOrders.SCHEDULED ?? 0) + (delivery.workOrders.IN_PROGRESS ?? 0);

  return (
    <div className="space-y-5">
      {/* Hero: weighted pipeline is the one number that answers "how are we
          doing". Gross sits underneath it because the two are always read
          together and a weighted figure alone invites the wrong question. */}
      <StatHero
        label="Weighted pipeline"
        value={money(pipeline.weightedValue)}
        subtitle={`${pipeline.openDeals} open deal${pipeline.openDeals === 1 ? "" : "s"} · ${money(pipeline.grossValue)} gross`}
        change={
          won.valueDeltaPercent === null
            ? `${money(won.value)} won in the last ${data.periodDays} days`
            : `${won.valueDeltaPercent >= 0 ? "+" : ""}${won.valueDeltaPercent}% won vs the previous ${data.periodDays} days`
        }
        trend={
          won.valueDeltaPercent === null
            ? "neutral"
            : won.valueDeltaPercent >= 0
              ? "up"
              : "down"
        }
        action={
          <Link href="/crm/leads" className="btn btn-secondary btn-sm">
            Open the board
          </Link>
        }
      />

      <KpiGrid cols={4}>
        <KpiGrid.Item
          label="Needs chasing"
          value={needsAttention}
          delta={tasks.today > 0 ? `${tasks.today} due today` : "nothing due today"}
          tone={needsAttention > 0 ? "danger" : "neutral"}
          onClick={() => router.push("/crm/follow-ups")}
        />
        <KpiGrid.Item
          label="Quoted"
          value={money(documents.quotedValue)}
          delta={`${documents.quotationsRaised} in ${data.periodDays} days`}
          onClick={() => router.push("/crm/deals")}
        />
        <KpiGrid.Item
          label="Owed to us"
          value={money(collections.outstanding)}
          delta={
            collections.overdue > 0 ? `${money(collections.overdue)} overdue` : "all within terms"
          }
          tone={collections.overdue > 0 ? "warn" : "neutral"}
          onClick={() => router.push("/crm/collections")}
        />
        <KpiGrid.Item
          label="Won"
          value={won.count}
          delta={won.lost > 0 ? `${won.lost} lost` : "none lost"}
          tone={won.count > 0 ? "success" : "neutral"}
          onClick={() => router.push("/crm/insights")}
        />
      </KpiGrid>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">What needs you</h2>
        <div className="grid gap-2">
          <RowCard
            icon={<Clock className="size-4" />}
            title="Overdue follow-ups"
            subtitle={
              needsAttention === 0
                ? "Nothing overdue."
                : `${needsAttention} past due · ${tasks.open} open in total`
            }
            status={<ChevronRight className="size-4 text-[var(--text-subtle)]" />}
            onClick={() => router.push("/crm/follow-ups")}
          />
          <RowCard
            icon={<CheckCircle className="size-4" />}
            title="Deals going stale"
            subtitle={
              pipeline.stale === 0
                ? "Every deal has moved inside its stage's window."
                : `${pipeline.stale} sitting longer than their stage allows`
            }
            status={<ChevronRight className="size-4 text-[var(--text-subtle)]" />}
            onClick={() => router.push("/crm/leads")}
          />
          <RowCard
            icon={<FileText className="size-4" />}
            title="Quotes awaiting a decision"
            subtitle={
              documents.awaitingApproval === 0 && documents.pendingDiscountApprovals === 0
                ? "Nothing waiting on a customer or a manager."
                : [
                    documents.awaitingApproval > 0
                      ? `${documents.awaitingApproval} with the customer`
                      : null,
                    documents.pendingDiscountApprovals > 0
                      ? `${documents.pendingDiscountApprovals} discount${documents.pendingDiscountApprovals === 1 ? "" : "s"} to approve`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
            }
            status={<ChevronRight className="size-4 text-[var(--text-subtle)]" />}
            onClick={() => router.push("/crm/deals")}
          />
          <RowCard
            icon={<Receipt className="size-4" />}
            title="Invoices to collect"
            subtitle={
              collections.invoiceCount === 0
                ? "Nothing outstanding from a CRM quote."
                : `${collections.invoiceCount} open · ${money(collections.outstanding)} outstanding`
            }
            status={<ChevronRight className="size-4 text-[var(--text-subtle)]" />}
            onClick={() => router.push("/crm/collections")}
          />
          <RowCard
            icon={<Wrench className="size-4" />}
            title="Work in the field"
            subtitle={
              openWorkOrders === 0 && delivery.upcomingVisits === 0
                ? "Nothing scheduled."
                : [
                    openWorkOrders > 0 ? `${openWorkOrders} work order${openWorkOrders === 1 ? "" : "s"} live` : null,
                    delivery.upcomingVisits > 0
                      ? `${delivery.upcomingVisits} visit${delivery.upcomingVisits === 1 ? "" : "s"} this week`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
            }
            status={<ChevronRight className="size-4 text-[var(--text-subtle)]" />}
            onClick={() => router.push("/crm/work-orders")}
          />
          <RowCard
            icon={<Calendar className="size-4" />}
            title="Closing this week"
            subtitle={
              pipeline.closingThisWeek === 0
                ? "Nothing forecast to close in the next seven days."
                : `${pipeline.closingThisWeek} deal${pipeline.closingThisWeek === 1 ? "" : "s"} expected to close`
            }
            status={<ChevronRight className="size-4 text-[var(--text-subtle)]" />}
            onClick={() => router.push("/crm/deals")}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Pipeline by stage">
          {pipeline.byStage.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No stages configured yet.</p>
          ) : (
            <ul className="space-y-2">
              {pipeline.byStage.map((stage) => {
                const share =
                  pipeline.grossValue > 0 ? (stage.value / pipeline.grossValue) * 100 : 0;
                return (
                  <li key={stage.id}>
                    <Link
                      href={`/crm/deals?stageId=${stage.id}`}
                      className="flex items-center gap-3 text-sm hover:underline"
                    >
                      <span className="w-32 shrink-0 truncate">{stage.name}</span>
                      <span
                        className="h-2 rounded-full bg-[var(--brand)]"
                        style={{ width: `${Math.max(share, stage.count > 0 ? 3 : 0)}%` }}
                        aria-hidden="true"
                      />
                      <span className="ml-auto shrink-0 font-mono text-sm text-[var(--text-muted)]">
                        {stage.count} · {money(stage.value)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Ageing on what we are owed">
          {collections.invoiceCount === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Nothing outstanding on a CRM invoice.
            </p>
          ) : (
            <ul className="space-y-2">
              {(Object.keys(AGEING_LABELS) as AgeingBucket[]).map((bucket) => {
                const row = collections.ageing[bucket];
                return (
                  <li
                    key={bucket}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>{AGEING_LABELS[bucket]}</span>
                    <span className="font-mono text-sm text-[var(--text-muted)]">
                      {row ? `${row.count} · ${money(row.value)}` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
