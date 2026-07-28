import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { scoreLead } from "@/lib/crm/lead-scoring";
import { prisma } from "@/lib/prisma";
import { canEditRecord } from "@/lib/crm/permissions";
import { crmLeadChannelSchema } from "@/lib/crm/views";
import { isCompanyUser } from "../../_helpers";

const updateSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  contactName: z.string().trim().max(200).nullable().optional(),
  contactEmail: z.string().trim().email().max(200).nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
  estimatedValue: z.number().finite().nonnegative().nullable().optional(),
  currency: z.string().trim().max(10).optional(),
  services: z.array(z.string().trim().max(80)).max(40).optional(),
  source: z.string().trim().max(120).nullable().optional(),
  sourceChannel: crmLeadChannelSchema.nullable().optional(),
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
          include: {
            approval: { select: { token: true, status: true, respondedAt: true } },
            // The document list needs the underlying record's own status and
            // balance — a CrmLeadDocument only knows the amount it was cut for,
            // not what has since been paid against it.
            quotation: {
              select: { id: true, quotationNumber: true, status: true, validUntil: true, total: true },
            },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                dueDate: true,
                total: true,
                amountPaid: true,
                creditTotal: true,
                writeOffTotal: true,
              },
            },
            receipt: {
              select: { id: true, receiptNumber: true, receivedAt: true, amount: true, method: true },
            },
          },
        },
        activities: {
          orderBy: { occurredAt: "desc" },
          take: 100,
          // The history feed names who did it; without this every
          // entry reads as though it happened by itself.
          include: { createdBy: { select: { id: true, name: true } } },
        },
        followUps: { orderBy: { dueAt: "asc" } },
        appointments: { orderBy: { scheduledStart: "desc" } },
        intakeSubmissions: {
          select: { id: true, photoUrls: true, message: true, selectedServices: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
    if (!lead) return errorResponse("Lead not found", 404);

    // Scored on read from what is actually on the record, so the number can
    // never drift from the reasons shown next to it.
    const scoreBreakdown = scoreLead({
      estimatedValue: lead.estimatedValue,
      contactEmail: lead.contactEmail,
      contactPhone: lead.contactPhone,
      clientId: lead.clientId,
      services: lead.services,
      sourceChannel: lead.sourceChannel,
      createdAt: lead.createdAt,
      firstContactAt: lead.firstContactAt,
      activityCount: lead.activities.filter((activity) => activity.type !== "SYSTEM").length,
      appointmentCount: lead.appointments.length,
      documentCount: lead.documents.length,
    });

    return successResponse({ ...lead, scoreBreakdown });
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
    if (!await canEditRecord(session, existing.assignedToId)) {
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
    if (!(await isCompanyUser(session.user.companyId, data.assignedToId))) {
      return errorResponse("Invalid assignee", 400);
    }

    // Throughout: `undefined` leaves a field alone, an explicit `null` clears
    // it. Inline editing on the record page depends on being able to empty a
    // field, not just overwrite it.
    const updated = await prisma.crmLead.update({
      where: { id },
      data: {
        title: data.title,
        clientId: data.clientId,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        probability: data.probability,
        estimatedValue: data.estimatedValue,
        currency: data.currency ?? undefined,
        services: data.services ?? undefined,
        source: data.source,
        sourceChannel: data.sourceChannel ?? undefined,
        assignedToId: data.assignedToId,
      },
    });
    return successResponse(updated);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] PATCH /api/v2/crm/leads/[id] error:", error);
    return errorResponse("Failed to update lead");
  }
}
