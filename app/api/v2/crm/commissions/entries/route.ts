import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { insightsRepFilter } from "@/lib/crm/scope";

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const { searchParams } = new URL(request.url);
    const periodKey = searchParams.get("periodKey");
    const status = searchParams.get("status");
    const requestedRep = searchParams.get("repId");

    // Reps only ever see their own entries regardless of the query param.
    const repScope = insightsRepFilter(session);
    const repId = repScope ?? requestedRep ?? undefined;

    const where: Prisma.CrmCommissionEntryWhereInput = {
      companyId: session.user.companyId,
      ...(periodKey ? { periodKey } : {}),
      ...(status ? { status: status as Prisma.CrmCommissionEntryWhereInput["status"] } : {}),
      ...(repId ? { repId } : {}),
    };

    const entries = await prisma.crmCommissionEntry.findMany({
      where,
      include: {
        rep: { select: { id: true, name: true } },
        lead: { select: { id: true, leadNo: true } },
      },
      orderBy: [{ periodKey: "desc" }, { calculatedAt: "desc" }],
      take: 1000,
    });

    const totals = entries.reduce(
      (acc, e) => {
        acc.amount += e.amount;
        return acc;
      },
      { amount: 0 },
    );

    return successResponse({ data: entries, totalAmount: Math.round(totals.amount * 100) / 100 });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/commissions/entries error:", error);
    return errorResponse("Failed to fetch commission entries");
  }
}
