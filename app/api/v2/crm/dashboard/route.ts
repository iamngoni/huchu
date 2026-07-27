import { NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { hasCrmFullAccess } from "@/lib/crm/scope";
import { ageingBucket } from "@/lib/crm/collections";
import { ensureDefaultPipeline } from "@/lib/crm/pipelines";

/**
 * Everything the CRM home needs, in one round trip.
 *
 * The old summary answered three questions — open leads, weighted pipeline,
 * overdue follow-ups — and ignored deals, quotes, invoices, work orders and
 * site visits entirely. Someone opening the module could not tell whether
 * anything needed them today. This answers the whole lifecycle: what is in
 * flight, what is owed to a customer, what is owed to us, and what is booked.
 *
 * Deltas are computed against a single "previous period" boundary here rather
 * than in each caller, so the dashboard and the report cannot disagree.
 */

/** A rep sees their own numbers; a manager sees the team's. */
function ownerScope(userId: string, isManager: boolean) {
  return isManager ? {} : { assignedToId: userId };
}

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const companyId = session.user.companyId;
    const isManager = hasCrmFullAccess(session.user.role);
    const scope = ownerScope(session.user.id, isManager);

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const periodDays = 30;
    const periodStart = new Date(now.getTime() - periodDays * 24 * 3600 * 1000);
    const previousStart = new Date(now.getTime() - 2 * periodDays * 24 * 3600 * 1000);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    // A company always has at least the default pipeline; the board, the deal
    // form and this dashboard all assume one exists.
    await prisma.$transaction((tx) => ensureDefaultPipeline(tx, companyId));

    const [
      openDeals,
      wonThisPeriod,
      wonPreviousPeriod,
      lostThisPeriod,
      stages,
      taskCounts,
      legacyOverdue,
      quotations,
      openInvoices,
      workOrders,
      upcomingVisits,
      pendingApprovals,
    ] = await Promise.all([
      prisma.crmDeal.findMany({
        where: { companyId, status: "OPEN", archivedAt: null, ...scope },
        select: {
          id: true,
          value: true,
          probability: true,
          stageId: true,
          stageEnteredAt: true,
          expectedCloseDate: true,
          stage: { select: { id: true, name: true, position: true, inactivityDays: true } },
        },
      }),

      prisma.crmDeal.aggregate({
        where: { companyId, wonAt: { gte: periodStart }, ...scope },
        _count: { _all: true },
        _sum: { value: true },
      }),
      prisma.crmDeal.aggregate({
        where: { companyId, wonAt: { gte: previousStart, lt: periodStart }, ...scope },
        _count: { _all: true },
        _sum: { value: true },
      }),
      prisma.crmDeal.count({
        where: { companyId, lostAt: { gte: periodStart }, ...scope },
      }),

      prisma.crmPipelineStage.findMany({
        where: { pipeline: { companyId, isDefault: true }, archivedAt: null },
        select: { id: true, name: true, position: true, status: true },
        orderBy: { position: "asc" },
      }),

      prisma.crmTask.groupBy({
        by: ["status"],
        where: { companyId, ...(isManager ? {} : { assignedToId: session.user.id }) },
        _count: { _all: true },
      }),

      prisma.crmFollowUp.count({
        where: {
          companyId,
          status: "PENDING",
          dueAt: { lt: now },
          ...(isManager ? {} : { assignedToId: session.user.id }),
        },
      }),

      prisma.crmLeadDocument.findMany({
        where: { companyId, type: "QUOTATION", createdAt: { gte: periodStart } },
        select: {
          id: true,
          amount: true,
          currency: true,
          // A quotation's state lives on its approval record, not the document.
          approval: { select: { status: true } },
        },
      }),

      prisma.salesInvoice.findMany({
        where: {
          companyId,
          status: { notIn: ["PAID", "VOIDED"] },
          // Only invoices that came out of the CRM belong on the CRM's home.
          quotationId: { not: null },
        },
        select: { id: true, total: true, amountPaid: true, dueDate: true, currency: true },
      }),

      prisma.crmWorkOrder.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { _all: true },
      }),

      prisma.crmAppointment.count({
        where: {
          companyId,
          status: "SCHEDULED",
          scheduledStart: { gte: now, lte: weekAhead },
          ...(isManager ? {} : { assignedToId: session.user.id }),
        },
      }),

      prisma.crmDiscountApproval.count({
        where: { companyId, status: "PENDING" },
      }),
    ]);

    const grossValue = openDeals.reduce((sum, deal) => sum + (deal.value ?? 0), 0);
    const weightedValue = openDeals.reduce(
      (sum, deal) => sum + ((deal.value ?? 0) * (deal.probability ?? 0)) / 100,
      0,
    );

    // "Stale" is the stage's own inactivity budget, not a global number — a
    // deal can sit in Quoted for a fortnight and be fine, but three days in New
    // is not.
    const stale = openDeals.filter((deal) => {
      const days = deal.stage.inactivityDays;
      if (!days) return false;
      return now.getTime() - deal.stageEnteredAt.getTime() > days * 24 * 3600 * 1000;
    });

    const closingThisWeek = openDeals.filter(
      (deal) => deal.expectedCloseDate && deal.expectedCloseDate <= weekAhead,
    );

    const byStage = stages.map((stage) => {
      const deals = openDeals.filter((deal) => deal.stageId === stage.id);
      return {
        id: stage.id,
        name: stage.name,
        status: stage.status,
        count: deals.length,
        value: deals.reduce((sum, deal) => sum + (deal.value ?? 0), 0),
      };
    });

    const taskByStatus = Object.fromEntries(
      taskCounts.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;

    const [tasksOverdue, tasksToday] = await Promise.all([
      prisma.crmTask.count({
        where: {
          companyId,
          status: "OPEN",
          dueAt: { lt: startOfToday },
          ...(isManager ? {} : { assignedToId: session.user.id }),
        },
      }),
      prisma.crmTask.count({
        where: {
          companyId,
          status: "OPEN",
          dueAt: { gte: startOfToday, lt: endOfToday },
          ...(isManager ? {} : { assignedToId: session.user.id }),
        },
      }),
    ]);

    const balanceOf = (invoice: { total: number; amountPaid: number }) =>
      Math.max(0, invoice.total - invoice.amountPaid);

    const receivable = openInvoices.reduce((sum, invoice) => sum + balanceOf(invoice), 0);
    const overdueReceivable = openInvoices
      .filter((invoice) => invoice.dueDate && invoice.dueDate < now)
      .reduce((sum, invoice) => sum + balanceOf(invoice), 0);

    const ageing = openInvoices.reduce<Record<string, { count: number; value: number }>>(
      (buckets, invoice) => {
        const bucket = ageingBucket(invoice.dueDate ?? now, now);
        const row = buckets[bucket] ?? { count: 0, value: 0 };
        row.count += 1;
        row.value += balanceOf(invoice);
        buckets[bucket] = row;
        return buckets;
      },
      {},
    );

    const workOrderByStatus = Object.fromEntries(
      workOrders.map((row) => [row.status, row._count._all]),
    ) as Record<string, number>;

    const wonValue = wonThisPeriod._sum.value ?? 0;
    const previousWonValue = wonPreviousPeriod._sum.value ?? 0;

    return successResponse({
      scope: isManager ? "TEAM" : "MINE",
      periodDays,
      pipeline: {
        openDeals: openDeals.length,
        grossValue,
        weightedValue,
        byStage,
        stale: stale.length,
        closingThisWeek: closingThisWeek.length,
      },
      won: {
        count: wonThisPeriod._count._all,
        value: wonValue,
        lost: lostThisPeriod,
        // Null rather than 0% when there is no baseline — a fabricated
        // "+100%" against nothing is worse than saying nothing.
        valueDeltaPercent:
          previousWonValue > 0
            ? Math.round(((wonValue - previousWonValue) / previousWonValue) * 100)
            : null,
        previousValue: previousWonValue,
      },
      tasks: {
        overdue: tasksOverdue,
        today: tasksToday,
        open: taskByStatus.OPEN ?? 0,
        legacyOverdue,
      },
      documents: {
        quotationsRaised: quotations.length,
        quotedValue: quotations.reduce((sum, doc) => sum + doc.amount, 0),
        awaitingApproval: quotations.filter((doc) => doc.approval?.status === "PENDING").length,
        pendingDiscountApprovals: pendingApprovals,
      },
      collections: {
        outstanding: receivable,
        overdue: overdueReceivable,
        invoiceCount: openInvoices.length,
        ageing,
      },
      delivery: {
        workOrders: workOrderByStatus,
        upcomingVisits,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/dashboard error:", error);
    return errorResponse("Failed to build the dashboard");
  }
}
