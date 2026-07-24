import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { insightsRepFilter } from "@/lib/crm/scope";
import { getRepPerformance } from "@/lib/crm/insights";

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const repId = insightsRepFilter(session);

    const rows = await getRepPerformance(session.user.companyId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      repId,
    });
    return successResponse({ data: rows });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/insights/reps error:", error);
    return errorResponse("Failed to fetch rep performance");
  }
}
