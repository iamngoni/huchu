import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { canEditAssignedRecord } from "@/lib/crm/scope";

const updateSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
  estimatedValue: z.number().finite().nonnegative().nullable().optional(),
  currency: z.string().trim().max(10).optional(),
  services: z.array(z.string().trim().max(80)).max(40).optional(),
  source: z.string().trim().max(120).nullable().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const { id } = await params;

    const lead = await prisma.crmLead.findFirst({
      where: { id, companyId: session.user.companyId },
      include: {
        client: true,
        assignedTo: { select: { id: true, name: true } },
        documents: {
          orderBy: { createdAt: "desc" },
          include: { approval: { select: { token: true, status: true, respondedAt: true } } },
        },
        activities: { orderBy: { occurredAt: "desc" }, take: 100 },
        followUps: { orderBy: { dueAt: "asc" } },
        appointments: { orderBy: { scheduledStart: "desc" } },
      },
    });
    if (!lead) return errorResponse("Lead not found", 404);
    return successResponse(lead);
  } catch (error) {
    console.error("[API] GET /api/v2/crm/leads/[id] error:", error);
    return errorResponse("Failed to fetch lead");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const { id } = await params;

    const existing = await prisma.crmLead.findFirst({
      where: { id, companyId: session.user.companyId },
      select: { id: true, assignedToId: true },
    });
    if (!existing) return errorResponse("Lead not found", 404);
    if (!canEditAssignedRecord(session, existing.assignedToId)) {
      return errorResponse("You can only edit leads assigned to you", 403);
    }

    const data = updateSchema.parse(await request.json());
    if (data.clientId) {
      const client = await prisma.crmClient.findFirst({
        where: { id: data.clientId, companyId: session.user.companyId },
        select: { id: true },
      });
      if (!client) return errorResponse("Invalid client", 400);
    }

    const updated = await prisma.crmLead.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        clientId: data.clientId ?? undefined,
        probability: data.probability ?? undefined,
        estimatedValue: data.estimatedValue ?? undefined,
        currency: data.currency ?? undefined,
        services: data.services ?? undefined,
        source: data.source ?? undefined,
        assignedToId: data.assignedToId ?? undefined,
      },
    });
    return successResponse(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] PATCH /api/v2/crm/leads/[id] error:", error);
    return errorResponse("Failed to update lead");
  }
}
