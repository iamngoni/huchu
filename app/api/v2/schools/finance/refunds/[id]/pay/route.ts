import { NextRequest, NextResponse } from "next/server";
import { errorResponse, validateSession } from "@/lib/api-utils";
import { schoolPermissionDenial } from "@/lib/schools/permissions";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const denied = schoolPermissionDenial(session, "schools.fees", "refund");
    if (denied) return errorResponse(denied, 403);
    const { id } = await params;
    return errorResponse(
      `Refund settlement is not enabled yet for request ${id}.`,
      501,
    );
  } catch (error) {
    console.error("[API] POST /api/v2/schools/finance/refunds/[id]/pay error:", error);
    return errorResponse("Failed to settle refund request");
  }
}

