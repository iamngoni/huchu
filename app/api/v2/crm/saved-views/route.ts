import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { leadSortSchema, leadViewFiltersSchema } from "@/lib/crm/views";

const createViewSchema = z.object({
  name: z.string().trim().min(1).max(80),
  viewType: z.enum(["TABLE", "BOARD"]).optional(),
  filters: leadViewFiltersSchema,
  sort: leadSortSchema.nullable().optional(),
  isShared: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const views = await prisma.crmSavedView.findMany({
      where: {
        companyId: session.user.companyId,
        entity: "LEAD",
        // A view is visible when shared with the company or owned by the caller.
        OR: [{ isShared: true }, { createdById: session.user.id }],
      },
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: [{ isShared: "desc" }, { name: "asc" }],
    });

    return successResponse({ data: views });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/saved-views error:", error);
    return errorResponse("Failed to fetch saved views");
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const data = createViewSchema.parse(await request.json());

    const view = await prisma.crmSavedView.create({
      data: {
        companyId: session.user.companyId,
        entity: "LEAD",
        name: data.name,
        viewType: data.viewType ?? "TABLE",
        filters: data.filters,
        sort: data.sort ?? undefined,
        isShared: data.isShared ?? false,
        createdById: session.user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    return successResponse(view, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] POST /api/v2/crm/saved-views error:", error);
    return errorResponse("Failed to create saved view");
  }
}
