"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { GradePicker } from "@/components/schools/common/grade-picker";
import { fetchJson } from "@/lib/api-client";
import { formatSchoolMoney } from "@/lib/schools/format";

/**
 * Fees, starting from "which year group?".
 *
 * S-4.6. The same picker students, attendance and results use, with the one
 * difference that matters here: the line under a year group is not a headcount.
 * A bursar knows how many are in Form 2; what decides which form they open is
 * what it owes and how much of that is late.
 *
 * The whole-school ledger is still one click away, because a bursar's other
 * question — "show me every receipt this week" — is not about a year group at all
 * and forcing it through one would be worse than the list it replaced.
 */

type ClassFees = {
  id: string;
  outstanding: number;
  overdue: number;
  owing: number;
  invoices: number;
};

export function FeesGradePicker() {
  const feesQuery = useQuery({
    queryKey: ["schools", "fees", "by-class"],
    queryFn: () =>
      fetchJson<{ currency: string; data: ClassFees[] }>("/api/v2/schools/fees/by-class"),
  });

  const byId = useMemo(() => {
    const map = new Map<string, ClassFees>();
    for (const row of feesQuery.data?.data ?? []) map.set(row.id, row);
    return map;
  }, [feesQuery.data]);

  const currency = feesQuery.data?.currency ?? "USD";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-muted)]">
          Fees are worked a year group at a time. Open one to see who owes what.
        </p>
        <Link
          href="/schools/finance/ledger"
          className="text-sm font-medium text-primary hover:underline"
        >
          Whole-school ledger
        </Link>
      </div>

      <GradePicker
        basePath="/schools/finance"
        emptyHint="Fees are billed against a class. Set the class ladder up under Academics first."
        summarise={(schoolClass) => {
          const fees = byId.get(schoolClass.id);
          // While the figures are loading, say nothing about money rather than
          // saying zero: a bursar reading "owes 0" and acting on it is the
          // failure mode of an optimistic placeholder.
          if (!fees) return feesQuery.isPending ? "Counting what is owed…" : "Nothing billed yet";
          if (fees.invoices === 0) return "Nothing billed yet";
          if (fees.outstanding === 0) return `All ${fees.invoices} settled`;

          const owed = `${formatSchoolMoney(fees.outstanding, currency)} owed`;
          const families = `${fees.owing} ${fees.owing === 1 ? "family" : "families"}`;
          // Late money leads when there is any: it is the difference between a
          // bill that has been sent and one somebody has to chase.
          const late =
            fees.overdue > 0 ? `${formatSchoolMoney(fees.overdue, currency)} late` : null;
          return [owed, families, late].filter(Boolean).join(" · ");
        }}
      />
    </div>
  );
}
