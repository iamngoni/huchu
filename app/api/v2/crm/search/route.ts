import { NextRequest, NextResponse } from "next/server";

import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { groupSearchResults, searchCrm } from "@/lib/crm/search";

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();
    if (query.length < 2) return successResponse({ query, groups: [], total: 0 });

    const limitPerType = Number(searchParams.get("limit") ?? 5);
    const results = await searchCrm(prisma, {
      companyId: session.user.companyId,
      query,
      limitPerType: Number.isFinite(limitPerType) ? Math.min(Math.max(limitPerType, 1), 20) : 5,
    });

    return successResponse({
      query,
      groups: groupSearchResults(results),
      total: results.length,
    });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/search error:", error);
    return errorResponse("Search failed");
  }
}
