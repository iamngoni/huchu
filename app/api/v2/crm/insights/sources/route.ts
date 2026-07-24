import { NextRequest, NextResponse } from "next/server";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { getSourceAttribution } from "@/lib/crm/insights";

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const rows = await getSourceAttribution(session.user.companyId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return successResponse({ data: rows });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/insights/sources error:", error);
    return errorResponse("Failed to fetch source attribution");
  }
}
