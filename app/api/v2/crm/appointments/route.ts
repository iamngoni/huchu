import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { errorResponse, successResponse, validateSession } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { reserveIdentifier } from "@/lib/id-generator";
import { isCompanyUser } from "../_helpers";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  leadId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  assignedToId: z.string().uuid().optional(),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime().nullable().optional(),
  location: z.string().trim().max(300).nullable().optional(),
  // Carries the briefing written when the visit is booked; the report sheet
  // later replaces it with what actually happened.
  outcomeNotes: z.string().trim().max(2000).nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const assignedToId = searchParams.get("assignedToId");
    const status = searchParams.get("status");

    const where: Prisma.CrmAppointmentWhereInput = {
      companyId: session.user.companyId,
      ...(assignedToId ? { assignedToId } : {}),
      ...(status ? { status: status as Prisma.CrmAppointmentWhereInput["status"] } : {}),
      ...(from || to
        ? {
            scheduledStart: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const appointments = await prisma.crmAppointment.findMany({
      where,
      include: {
        lead: { select: { id: true, leadNo: true, title: true } },
        client: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { scheduledStart: "asc" },
      take: 500,
    });
    return successResponse({ data: appointments });
  } catch (error) {
    console.error("[API] GET /api/v2/crm/appointments error:", error);
    return errorResponse("Failed to fetch appointments");
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await validateSession(request);
    if (sessionResult instanceof NextResponse) return sessionResult;
    const { session } = sessionResult;

    const data = createSchema.parse(await request.json());
    if (!(await isCompanyUser(session.user.companyId, data.assignedToId))) {
      return errorResponse("Invalid assignee", 400);
    }
    const appointmentNo = await reserveIdentifier(prisma, {
      companyId: session.user.companyId,
      entity: "CRM_APPOINTMENT",
    });

    const appointment = await prisma.crmAppointment.create({
      data: {
        companyId: session.user.companyId,
        appointmentNo,
        title: data.title ?? "Site visit",
        leadId: data.leadId ?? undefined,
        clientId: data.clientId ?? undefined,
        assignedToId: data.assignedToId ?? session.user.id,
        scheduledStart: new Date(data.scheduledStart),
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : undefined,
        location: data.location ?? undefined,
        outcomeNotes: data.outcomeNotes ?? undefined,
        createdById: session.user.id,
      },
    });
    return successResponse(appointment, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return errorResponse("Validation failed", 400, error.issues);
    console.error("[API] POST /api/v2/crm/appointments error:", error);
    return errorResponse("Failed to create appointment");
  }
}
