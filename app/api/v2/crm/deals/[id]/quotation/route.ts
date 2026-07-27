import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { canEditAssignedRecord } from "@/lib/crm/scope";
import { createQuotationForLead } from "@/lib/crm/accounting-bridge";
import { createOrRotateApproval } from "@/lib/crm/approvals";
import { crmDocumentLineSchema } from "../../../_helpers";

const bodySchema = z.object({
  lines: z.array(crmDocumentLineSchema).min(1),
  currency: z.string().trim().max(10).optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).optional(),
  sendApproval: z.boolean().optional(),
  approvalExpiresInDays: z.number().int().min(1).max(90).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;
    const { id } = await params;

    const deal = await prisma.crmDeal.findFirst({
      where: { id, companyId: session.user.companyId },
      select: { id: true, assignedToId: true },
    });
    if (!deal) return errorResponse("Deal not found", 404);
    if (!canEditAssignedRecord(session, deal.assignedToId)) {
      return errorResponse("You can only quote on deals assigned to you", 403);
    }

    const data = bodySchema.parse(await request.json());
    const result = await createQuotationForLead({
      companyId: session.user.companyId,
      userId: session.user.id,
      dealId: id,
      lines: data.lines,
      currency: data.currency,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes ?? null,
    });

    let approvalToken: string | undefined;
    if (data.sendApproval) {
      approvalToken = await prisma.$transaction((tx) =>
        createOrRotateApproval(tx, {
          companyId: session.user.companyId,
          leadDocumentId: result.leadDocumentId,
          expiresInDays: data.approvalExpiresInDays,
        }),
      );
    }

    return successResponse({ ...result, approvalToken }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] POST /api/v2/crm/deals/[id]/quotation error:", error);
    return errorResponse(error instanceof Error ? error.message : "Failed to create quotation", 400);
  }
}
