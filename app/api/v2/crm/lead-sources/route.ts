import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { CRM_LEAD_CHANNELS } from "@/lib/crm/sources";
import { requireCrmManager } from "../_helpers";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  channel: z.enum(CRM_LEAD_CHANNELS as [string, ...string[]]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const sources = await prisma.crmLeadSource.findMany({
      where: { companyId: session.user.companyId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    return successResponse({ data: sources });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/lead-sources error:", error);
    return errorResponse("Failed to fetch lead sources");
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    if (!requireCrmManager(session)) return errorResponse("Manager access required", 403);

    const data = createSchema.parse(await request.json());
    const source = await prisma.crmLeadSource.create({
      data: {
        companyId: session.user.companyId,
        name: data.name,
        channel: (data.channel ?? "OTHER") as never,
      },
    });
    return successResponse(source, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return errorResponse("A lead source with this name already exists", 409);
    }
    console.error("[API] POST /api/v2/crm/lead-sources error:", error);
    return errorResponse("Failed to create lead source");
  }
}
