import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { canEditAssignedRecord } from "@/lib/crm/scope";
import { changeLeadStage, crmLeadStageSchema } from "@/lib/crm/pipeline";
import { isCompanyUser } from "../../_helpers";

const MAX_BULK_IDS = 100;

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("assign"),
    ids: z.array(z.string().uuid()).min(1).max(MAX_BULK_IDS),
    assignedToId: z.string().uuid().nullable(),
  }),
  z.object({
    action: z.literal("stage"),
    ids: z.array(z.string().uuid()).min(1).max(MAX_BULK_IDS),
    stage: crmLeadStageSchema,
    lostReason: z.string().trim().max(500).optional(),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const body = bulkSchema.parse(await request.json());

    const leads = await prisma.crmLead.findMany({
      where: { id: { in: body.ids }, companyId: session.user.companyId },
      select: { id: true, stage: true, assignedToId: true, clientId: true },
    });

    // A rep may only act on their own (or unclaimed) leads. Rather than failing
    // the whole batch, act on what they may touch and report the rest back.
    const editable = leads.filter((lead) => canEditAssignedRecord(session, lead.assignedToId));
    const skipped = leads.length - editable.length;
    const notFound = body.ids.length - leads.length;

    if (editable.length === 0) {
      return errorResponse("None of the selected leads can be edited by you", 403);
    }

    if (body.action === "assign") {
      if (!(await isCompanyUser(session.user.companyId, body.assignedToId))) {
        return errorResponse("Invalid assignee", 400);
      }

      const assignee = body.assignedToId
        ? await prisma.user.findFirst({
            where: { id: body.assignedToId, companyId: session.user.companyId },
            select: { name: true },
          })
        : null;

      await prisma.$transaction(async (tx) => {
        await tx.crmLead.updateMany({
          where: { id: { in: editable.map((lead) => lead.id) }, companyId: session.user.companyId },
          data: { assignedToId: body.assignedToId },
        });
        await tx.crmActivity.createMany({
          data: editable.map((lead) => ({
            companyId: session.user.companyId,
            type: "SYSTEM" as const,
            leadId: lead.id,
            clientId: lead.clientId ?? undefined,
            subject: body.assignedToId
              ? `Lead assigned to ${assignee?.name ?? "a teammate"}`
              : "Lead unassigned",
            metadata: { assignedToId: body.assignedToId },
            createdById: session.user.id,
          })),
        });
      });

      return successResponse({ updated: editable.length, skipped, notFound });
    }

    // Stage moves run through the shared service so bulk history matches what
    // a single drag on the board produces.
    const moved = editable.filter((lead) => lead.stage !== body.stage);
    if (moved.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const lead of moved) {
          await changeLeadStage(tx, {
            companyId: session.user.companyId,
            userId: session.user.id,
            lead,
            stage: body.stage,
            lostReason: body.lostReason,
          });
        }
      });
    }

    return successResponse({
      updated: moved.length,
      unchanged: editable.length - moved.length,
      skipped,
      notFound,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] POST /api/v2/crm/leads/bulk error:", error);
    return errorResponse("Failed to update leads");
  }
}
