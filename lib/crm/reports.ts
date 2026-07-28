/**
 * Sales reporting.
 *
 * Everything here is pure arithmetic over rows the caller has already fetched.
 * The reason to keep it that way is that funnel and conversion maths is the
 * part people argue about, and an argument you can settle with a unit test is
 * cheaper than one you settle by staring at SQL.
 */
export type FunnelStageInput = {
  key: string;
  label: string;
  /** Records that have ever reached this stage. */
  reached: number;
  value: number;
};

export type FunnelStage = FunnelStageInput & {
  /** Share of everything that entered the funnel. */
  shareOfTotal: number;
  /** Share of what reached the previous stage — where the leak is. */
  conversionFromPrevious: number;
  droppedFromPrevious: number;
};

/**
 * Turn stage counts into a funnel.
 *
 * Conversion is measured against the previous stage, not against the top,
 * because "we lose two thirds of everything between quote and order" is
 * actionable and "8% of leads become orders" is not.
 */
export function buildFunnel(stages: FunnelStageInput[]): FunnelStage[] {
  const total = stages[0]?.reached ?? 0;

  return stages.map((stage, index) => {
    const previous = index === 0 ? stage.reached : stages[index - 1].reached;
    return {
      ...stage,
      shareOfTotal: total > 0 ? stage.reached / total : 0,
      conversionFromPrevious: previous > 0 ? stage.reached / previous : 0,
      droppedFromPrevious: index === 0 ? 0 : Math.max(0, previous - stage.reached),
    };
  });
}

/**
 * The stage that loses the most, which is where attention belongs.
 *
 * Ties break toward the later stage: losing fifty deals after quoting them
 * costs the work of fifty quotes, while losing fifty at the top costs an hour
 * of somebody's morning.
 */
export function biggestLeak(funnel: FunnelStage[]): FunnelStage | null {
  const candidates = funnel.slice(1);
  if (candidates.length === 0) return null;
  return candidates.reduce((worst, stage) =>
    stage.droppedFromPrevious >= worst.droppedFromPrevious ? stage : worst,
  );
}

export type OutcomeCounts = { won: number; lost: number; open: number };

/**
 * Win rate over decided business only. Counting open deals as losses makes a
 * healthy pipeline look like a failing one every time it grows.
 */
export function winRate(counts: OutcomeCounts): number {
  const decided = counts.won + counts.lost;
  return decided > 0 ? counts.won / decided : 0;
}

export type CycleInput = { openedAt: Date | string; closedAt: Date | string | null };

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/**
 * Median days from opening to closing, over closed business only.
 *
 * The median rather than the mean: one deal that took two years drags an
 * average into uselessness, and the question being asked is "how long does
 * this normally take".
 */
export function medianCycleDays(records: CycleInput[]): number | null {
  const durations = records
    .filter((record) => record.closedAt)
    .map((record) => {
      const opened = toDate(record.openedAt).getTime();
      const closed = toDate(record.closedAt!).getTime();
      return (closed - opened) / 86_400_000;
    })
    .filter((days) => Number.isFinite(days) && days >= 0)
    .sort((a, b) => a - b);

  if (durations.length === 0) return null;
  const middle = Math.floor(durations.length / 2);
  const median =
    durations.length % 2 === 0
      ? (durations[middle - 1] + durations[middle]) / 2
      : durations[middle];
  return Math.round(median * 10) / 10;
}

export type GroupedOutcome = {
  key: string;
  label: string;
  won: number;
  lost: number;
  open: number;
  wonValue: number;
  openValue: number;
};

export type GroupedPerformance = GroupedOutcome & {
  total: number;
  winRate: number;
  /** Average value of the deals actually won. */
  averageWonValue: number;
};

export function summarizeGroups(groups: GroupedOutcome[]): GroupedPerformance[] {
  return groups
    .map((group) => ({
      ...group,
      total: group.won + group.lost + group.open,
      winRate: winRate(group),
      averageWonValue: group.won > 0 ? group.wonValue / group.won : 0,
    }))
    .sort((a, b) => b.wonValue - a.wonValue);
}

/**
 * Weighted forecast: each open deal counted at its own probability.
 *
 * Deliberately reported alongside the unweighted total rather than instead of
 * it — one number is a commitment and the other is a ceiling, and hiding
 * either causes a different argument.
 */
export function forecast(
  open: { value: number | null; probability: number | null }[],
  defaultProbability = 50,
): { weighted: number; unweighted: number; count: number; estimated: number } {
  let weighted = 0;
  let unweighted = 0;
  let estimated = 0;

  for (const deal of open) {
    const value = deal.value ?? 0;
    const probability = deal.probability ?? defaultProbability;
    if (deal.probability === null) estimated += 1;
    unweighted += value;
    weighted += (value * Math.min(100, Math.max(0, probability))) / 100;
  }

  return {
    weighted: Math.round(weighted * 100) / 100,
    unweighted: Math.round(unweighted * 100) / 100,
    count: open.length,
    // How many of those probabilities nobody actually set. A weighted figure
    // where this equals `count` is the default probability wearing a suit, and
    // the reader deserves to know that before betting on it.
    estimated,
  };
}

export type ActivityBucket = { period: string; count: number };

/**
 * Roll timestamps into day or week buckets, filling the gaps.
 *
 * Empty periods are emitted as zero rather than skipped: a chart that omits a
 * quiet week draws a straight line through it and hides exactly the thing
 * somebody opened the chart to see.
 */
export function bucketByPeriod(
  timestamps: (Date | string)[],
  range: { from: Date; to: Date },
  granularity: "day" | "week" = "day",
): ActivityBucket[] {
  const step = granularity === "week" ? 7 : 1;
  const buckets = new Map<string, number>();

  const cursor = new Date(range.from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(range.to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    buckets.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + step);
  }

  const keys = Array.from(buckets.keys());
  for (const stamp of timestamps) {
    const date = toDate(stamp);
    if (Number.isNaN(date.getTime())) continue;
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const iso = day.toISOString().slice(0, 10);

    // Find the bucket this falls in — for weeks, the latest start on or
    // before it.
    let bucketKey: string | undefined;
    for (const key of keys) {
      if (key <= iso) bucketKey = key;
      else break;
    }
    if (bucketKey) buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([period, count]) => ({ period, count }));
}

/** Percent for display, without pretending to precision the data lacks. */
export function formatRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export const REPORT_RANGES = ["7d", "30d", "90d", "12m"] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export const REPORT_RANGE_LABELS: Record<ReportRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};

export function rangeToDates(range: ReportRange, now: Date = new Date()): { from: Date; to: Date } {
  const to = new Date(now);
  const from = new Date(now);
  if (range === "7d") from.setDate(from.getDate() - 7);
  else if (range === "30d") from.setDate(from.getDate() - 30);
  else if (range === "90d") from.setDate(from.getDate() - 90);
  else from.setMonth(from.getMonth() - 12);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}
