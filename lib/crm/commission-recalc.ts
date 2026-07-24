/**
 * Materialize CRM commission entries for a period.
 *
 * Only PENDING entries are rewritten; APPROVED/PAID entries are frozen so a
 * later document can't silently change an already-settled commission. The
 * attributed amount per document is taxed through the rep's tiered rule over
 * their cumulative period revenue.
 *
 * Basis:
 *  - INVOICED: sum of CrmLeadDocument(type INVOICE) whose invoice was issued
 *    in the period.
 *  - PAID: sum of CrmLeadDocument(type RECEIPT) in the period.
 */
import { prisma } from "@/lib/prisma";
import {
  computeTieredCommission,
  resolveRuleForRep,
  type CommissionRule,
} from "@/lib/crm/commissions";

type Basis = "INVOICED" | "PAID";

function periodBounds(periodKey: string): { from: Date; to: Date } {
  const [yearStr, monthStr] = periodKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  return { from, to };
}

async function loadRules(companyId: string): Promise<CommissionRule[]> {
  const rules = await prisma.crmCommissionRule.findMany({
    where: { companyId },
    include: { tiers: true },
  });
  return rules.map((r) => ({
    id: r.id,
    appliesToUserId: r.appliesToUserId,
    isActive: r.isActive,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    basis: r.basis,
    tiers: r.tiers.map((t) => ({
      thresholdFrom: t.thresholdFrom,
      ratePercent: t.ratePercent,
      sortOrder: t.sortOrder,
    })),
  })) as (CommissionRule & { basis: Basis })[];
}

type DocRow = {
  leadDocumentId: string;
  leadId: string | null;
  repId: string;
  amount: number;
  currency: string;
  at: Date;
};

/**
 * Rebuild PENDING commission entries for a company + period (optionally a
 * single rep). Returns the number of entries written.
 */
export async function recalculatePeriod(params: {
  companyId: string;
  periodKey: string;
  repId?: string | null;
}): Promise<{ written: number }> {
  const { from, to } = periodBounds(params.periodKey);
  const rules = (await loadRules(params.companyId)) as (CommissionRule & { basis: Basis })[];

  // Determine which basis is in effect. If a company mixes bases across rules,
  // each rep's own rule basis governs their entries.
  const documents = await prisma.crmLeadDocument.findMany({
    where: {
      companyId: params.companyId,
      type: { in: ["INVOICE", "RECEIPT"] },
      createdAt: { gte: from, lt: to },
      lead: params.repId ? { assignedToId: params.repId } : { assignedToId: { not: null } },
    },
    select: {
      id: true,
      type: true,
      amount: true,
      currency: true,
      createdAt: true,
      lead: { select: { id: true, assignedToId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group documents by rep, keeping the rep's rule basis to pick INVOICE vs
  // RECEIPT rows.
  const byRep = new Map<string, { rule: (CommissionRule & { basis: Basis }) | null; docs: DocRow[] }>();
  for (const doc of documents) {
    const repId = doc.lead?.assignedToId;
    if (!repId) continue;
    const rule = resolveRuleForRep(rules, repId, doc.createdAt) as (CommissionRule & { basis: Basis }) | null;
    const basis: Basis = rule?.basis ?? "INVOICED";
    const wantType = basis === "PAID" ? "RECEIPT" : "INVOICE";
    if (doc.type !== wantType) continue;
    const bucket = byRep.get(repId) ?? { rule, docs: [] };
    bucket.rule = rule;
    bucket.docs.push({
      leadDocumentId: doc.id,
      leadId: doc.lead?.id ?? null,
      repId,
      amount: doc.amount,
      currency: doc.currency,
      at: doc.createdAt,
    });
    byRep.set(repId, bucket);
  }

  let written = 0;

  await prisma.$transaction(async (tx) => {
    // Clear existing PENDING entries in scope (frozen entries survive).
    await tx.crmCommissionEntry.deleteMany({
      where: {
        companyId: params.companyId,
        periodKey: params.periodKey,
        status: "PENDING",
        ...(params.repId ? { repId: params.repId } : {}),
      },
    });

    for (const [repId, bucket] of byRep) {
      if (!bucket.rule || bucket.rule.tiers.length === 0) continue;

      // Frozen entries already consumed part of the period revenue; count them
      // toward the cumulative base so PENDING tiers continue from the right point.
      const frozen = await tx.crmCommissionEntry.findMany({
        where: {
          companyId: params.companyId,
          periodKey: params.periodKey,
          repId,
          status: { in: ["APPROVED", "PAID"] },
        },
        select: { baseAmount: true, leadDocumentId: true },
      });
      const frozenDocIds = new Set(frozen.map((f) => f.leadDocumentId));
      let cumulative = frozen.reduce((s, f) => s + f.baseAmount, 0);

      for (const doc of bucket.docs) {
        if (frozenDocIds.has(doc.leadDocumentId)) continue;
        const { commission, effectiveRatePercent } = computeTieredCommission(
          bucket.rule.tiers,
          cumulative,
          doc.amount,
        );
        cumulative += doc.amount;
        if (commission <= 0) continue;

        await tx.crmCommissionEntry.create({
          data: {
            companyId: params.companyId,
            repId,
            leadId: doc.leadId ?? undefined,
            leadDocumentId: doc.leadDocumentId,
            ruleId: bucket.rule.id,
            basis: bucket.rule.basis,
            periodKey: params.periodKey,
            baseAmount: doc.amount,
            ratePercent: effectiveRatePercent,
            amount: commission,
            currency: doc.currency,
            status: "PENDING",
          },
        });
        written += 1;
      }
    }
  });

  return { written };
}
