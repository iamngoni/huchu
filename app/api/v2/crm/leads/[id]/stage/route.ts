import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { canEditAssignedRecord } from "@/lib/crm/scope";
import { defaultProbabilityForStage } from "@/lib/crm/pipeline";
import { crmLeadStageSchema } from "../../../_helpers";

const bodySchema = z.object({
  stage: crmLeadStageSchema,
  lostReason: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const { id } = await params;

    const existing = await prisma.crmLead.findFirst({
      where: { id, companyId: session.user.companyId },
      select: { id: true, stage: true, assignedToId: true, clientId: true },
    });
    if (!existing) return errorResponse("Lead not found", 404);
    if (!canEditAssignedRecord(session, existing.assignedToId)) {
      return errorResponse("You can only change stage on leads assigned to you", 403);
    }

    const { stage, lostReason } = bodySchema.parse(await request.json());
    if (stage === existing.stage) return successResponse({ id, stage });

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.crmLead.update({
        where: { id },
        data: {
          stage,
          probability: defaultProbabilityForStage(stage),
          ...(stage === "WON" ? { wonAt: now } : {}),
          ...(stage === "LOST" ? { lostAt: now, lostReason: lostReason ?? undefined } : {}),
        },
      });
      await tx.crmActivity.create({
        data: {
          companyId: session.user.companyId,
          type: "STAGE_CHANGE",
          leadId: id,
          clientId: existing.clientId ?? undefined,
          subject: `Stage changed ${existing.stage} → ${stage}`,
          metadata: { fromStage: existing.stage, toStage: stage, lostReason },
          createdById: session.user.id,
        },
      });
      return lead;
    });

    return successResponse(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] POST /api/v2/crm/leads/[id]/stage error:", error);
    return errorResponse("Failed to change stage");
  }
}
